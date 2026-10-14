import type { CarePassport, CarePassportCompleteness, CarePassportResult, CarePassportSegment } from '@dengarin/types';
import { evaluateCrisisInput } from '@dengarin/crisis-engine';
import { buildCarePassportSystemPrompt, buildCarePassportUserPrompt } from '@dengarin/prompts';
import { attributeEvidence, computeCompleteness, joinSegments, validateCarePassportDraft } from '@dengarin/validator';
import type { LLMProvider } from './providers/types.ts';
import { createAmdProvider } from './providers/amdProvider.ts';

/**
 * CARE PASSPORT PIPELINE (AMD Track 2)
 *
 * Mandatory order (docs/CAREBRIDGE_SAFETY_POLICY.md):
 *   1. Deterministic crisis gate on the RAW text. Crisis -> no AI at all.
 *   2. AI-processing consent. Declined -> no AI at all.
 *   3. Inference on the SANITIZED text only, provider by provider.
 *   4. Grounding validation, then attribution of every quote to the single
 *      segment that contains it (F-A "Bukti Bertanggal").
 *   5. State selection where AI may only escalate.
 *
 * Server-agnostic and stateless: nothing here caches or logs user text.
 */

export interface CarePassportPipelineInput {
  /** Text exactly as the user wrote it; only the crisis gate reads it. */
  rawText: string;
  /** PII-redacted text; the only text a provider ever sees. */
  sanitizedText: string;
  /** Separate opt-in for AI processing (not the same as sharing/export consent). */
  aiConsent: boolean;
  /**
   * F-A "Bukti Bertanggal": SANITIZED segments (story, selected journal /
   * check-in entries, clarification answers). When present they take
   * precedence: the grounding text becomes `joinSegments(segments)` (joined
   * with the non-whitespace `¶` separator) and every accepted fact is linked
   * to the single segment that contains its quote. Without segments the
   * whole `sanitizedText` is treated as one `intake` segment.
   */
  segments?: ReadonlyArray<CarePassportSegment>;
}

export interface CarePassportPipelineOptions {
  providers?: LLMProvider[];
  timeoutMs?: number;
  now?: () => number;
}

const DEFAULT_TIMEOUT_MS = 25000;

/**
 * Sensitive intake only goes to the team's AMD endpoint by default. Third-party
 * providers are not added implicitly; a caller must pass them explicitly, and
 * their drafts are reported with isAmd: false.
 */
function defaultProviders(): LLMProvider[] {
  const amd = createAmdProvider();
  return amd.isConfigured() ? [amd] : [];
}

function envTimeoutMs(): number | undefined {
  const parsed = Number(process.env.AMD_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
// Adults only for this module; picks the adult emergency contacts.
const ADULT_AGE_BRACKET = '18-29';

export const DEFAULT_CLARIFICATION_QUESTION =
  'Boleh ceritakan sedikit lebih jelas, hal apa yang paling ingin kamu bicarakan saat konsultasi nanti?';

/** An explicit ask for urgent human help is honoured without any model judgement. */
const URGENT_HELP_REQUEST =
  /\b(?:butuh|perlu|minta|tolong(?:in)?)\s+(?:bantuan\s+)?(?:darurat|segera|sekarang\s+juga)\b|\b(?:aku|saya|gue|gw)\s+(?:sedang\s+|lagi\s+)?(?:dalam\s+)?bahaya\b|\bhubungkan\s+(?:aku|saya)\s+(?:ke|dengan)\s+(?:bantuan|layanan)\s+darurat\b/iu;

export function isUrgentHelpRequest(text: string): boolean {
  return URGENT_HELP_REQUEST.test(text.normalize('NFKC'));
}

/**
 * The user says in their own words that they cannot name why they feel this
 * way ("entah kenapa", "nggak tahu kenapa", "tanpa sebab yang jelas", ...).
 * This is the operational sign of a vague complaint (rubric case B): a
 * complaint with a named cause ("stres karena target penjualan") is specific
 * even when nothing else is known yet. Indonesian phrase list, deterministic,
 * run on the sanitized grounding text only; misses are a documented
 * limitation and simply fall back to the review screen.
 */
const UNKNOWN_CAUSE =
  /\b(?:entah|bingung|nggak|ngga|gak|ga|tak|tidak|kurang|belum)\s+(?:(?:tahu|tau|jelas|ngerti|paham)\s+)?(?:kenapa|mengapa|sebabnya|alasannya|penyebabnya|apa\s+sebabnya|apa\s+penyebabnya|apa\s+yang\s+salah)\b|\btanpa\s+(?:sebab|alasan|penyebab)(?:\s+(?:yang\s+)?(?:jelas|pasti))?\b|\bentah\s+(?:apa|dari\s+mana)\b/iu;

export function isUnexplainedComplaint(text: string): boolean {
  return UNKNOWN_CAUSE.test(text.normalize('NFKC'));
}

/**
 * Soft clarification (SCRUM-32). Real models quote even a vague sentence
 * ("sering ngerasa nggak baik") as a grounded concern, so the hard rule
 * ("concerns empty") never fires for vague stories. This path asks instead
 * when ALL of the following hold:
 *   1. the concern is the ONLY known core fact: no daily impact and no
 *      duration (`completeness.known <= 1`; core facts are concerns,
 *      dailyImpact, duration);
 *   2. the user themselves say they cannot name the cause
 *      (`isUnexplainedComplaint`). Without this, specific stories such as
 *      case D ("stres karena target penjualan") would be asked too, because
 *      models tend to ask a question whenever two core facts are missing;
 *   3. the model asked a question that passed the validator (no diagnosis,
 *      no medical advice, no percentage). Nothing is invented: no default
 *      question on this path;
 *   4. no clarification has been answered yet, so this path asks at most
 *      once. The UI caps rounds at 3 regardless.
 * Never a safety downgrade: evaluated only after the escalation checks.
 */
export function needsSoftClarification(
  completeness: CarePassportCompleteness,
  clarificationQuestion: string | undefined,
  segments: ReadonlyArray<Pick<CarePassportSegment, 'kind'>>,
  sanitizedText: string
): boolean {
  if (!clarificationQuestion) return false;
  if (completeness.known > 1) return false;
  if (!isUnexplainedComplaint(sanitizedText)) return false;
  return !segments.some((segment) => segment.kind === 'clarification');
}

function isAmdProvider(provider: LLMProvider): boolean {
  return (provider as LLMProvider & { isAmd?: unknown }).isAmd === true;
}

export async function runCarePassportPipeline(
  input: CarePassportPipelineInput,
  options: CarePassportPipelineOptions = {}
): Promise<CarePassportResult> {
  const providers = options.providers ?? defaultProviders();
  const timeoutMs = options.timeoutMs ?? envTimeoutMs() ?? DEFAULT_TIMEOUT_MS;
  const now = options.now ?? Date.now;
  const warnings: string[] = [];

  // 1. Safety precedence: deterministic, on raw text, before anything else.
  const crisis = evaluateCrisisInput(input.rawText, ADULT_AGE_BRACKET);
  if (crisis.isCrisis || isUrgentHelpRequest(input.rawText)) {
    return {
      state: 'IMMEDIATE_HELP_SCREEN',
      emergencyContacts: crisis.emergencyContacts,
      provenance: { providerId: 'none', isAmd: false, isFallback: true },
      droppedClaims: 0,
      warnings: crisis.isCrisis ? ['crisis_gate'] : ['urgent_help_requested'],
    };
  }
  const deterministicHigh = crisis.severity === 'high';

  // 2. No consent -> no AI. The UI offers manual note-writing instead.
  if (!input.aiConsent) {
    return {
      state: 'PROVIDER_UNAVAILABLE',
      provenance: { providerId: 'none', isAmd: false, isFallback: true },
      droppedClaims: 0,
      warnings: ['ai_consent_declined', ...(deterministicHigh ? ['deterministic_high_distress'] : [])],
    };
  }

  // 3. Inference on sanitized text only. With segments, the grounding text is
  //    the `¶`-joined sanitized segments so no quote can straddle two of them.
  const segments = input.segments && input.segments.length > 0 ? input.segments : undefined;
  const sanitizedText = segments ? joinSegments(segments) : input.sanitizedText;
  const attributable = segments ?? [{ id: 'intake', kind: 'intake' as const, text: sanitizedText }];
  const systemPrompt = buildCarePassportSystemPrompt();
  const userPrompt = buildCarePassportUserPrompt(sanitizedText, segments);

  for (const provider of providers) {
    if (!provider.isConfigured()) continue;
    const startedAt = now();
    let rawText: string;
    try {
      ({ rawText } = await provider.generate({ systemPrompt, userPrompt, timeoutMs }));
    } catch (error) {
      warnings.push(`${provider.id}: ${(error as Error).message}`);
      continue;
    }
    const latencyMs = now() - startedAt;

    const validation = validateCarePassportDraft(rawText, sanitizedText);
    if (!validation.ok) {
      warnings.push(`${provider.id}: ${validation.errors.join('; ')}`);
      continue;
    }

    // 4. Attribution: each grounded quote is linked to the one segment holding it.
    const attribution = attributeEvidence(validation.passport, attributable);
    const passport: CarePassport = attribution.passport;
    if (attribution.unattributed > 0) warnings.push('unattributed_quote');

    // 5. State selection. AI can raise toward human support, never lower a rule-based flag.
    const provenance = { providerId: provider.id, isAmd: isAmdProvider(provider), isFallback: false, latencyMs };
    const base = {
      passport,
      provenance,
      droppedClaims: validation.droppedClaims,
      warnings: [...warnings, ...validation.warnings],
      completeness: computeCompleteness(passport),
    };

    if (deterministicHigh || validation.humanSupportSuggested) {
      return {
        ...base,
        state: 'HUMAN_SUPPORT_RECOMMENDED',
        warnings: [...base.warnings, deterministicHigh ? 'deterministic_high_distress' : 'model_escalation'],
      };
    }
    //    Clarification is never a safety downgrade: it is only reached once the
    //    escalation checks above have passed, and the passport is still shown.
    if (passport.concerns.length === 0) {
      return {
        ...base,
        state: 'NEEDS_CLARIFICATION',
        clarificationQuestion: validation.clarificationQuestion ?? DEFAULT_CLARIFICATION_QUESTION,
      };
    }
    if (needsSoftClarification(base.completeness, validation.clarificationQuestion, attributable, sanitizedText)) {
      return {
        ...base,
        state: 'NEEDS_CLARIFICATION',
        clarificationQuestion: validation.clarificationQuestion!,
        warnings: [...base.warnings, 'low_completeness_clarification'],
      };
    }
    return { ...base, state: 'READY_FOR_USER_REVIEW' };
  }

  // Every provider failed or none configured: never fabricate a passport.
  return {
    state: 'PROVIDER_UNAVAILABLE',
    provenance: { providerId: 'none', isAmd: false, isFallback: true },
    droppedClaims: 0,
    warnings: [
      ...(providers.length === 0 ? ['no_provider_configured'] : warnings),
      ...(deterministicHigh ? ['deterministic_high_distress'] : []),
    ],
  };
}
