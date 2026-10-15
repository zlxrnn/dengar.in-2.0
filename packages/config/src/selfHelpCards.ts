import cardsJson from './selfHelpCards.v1.json' with { type: 'json' };

/**
 * Self-help knowledge base (SCRUM-46 cards, used at runtime since SCRUM-45).
 *
 * `selfHelpCards.v1.json` is the reviewed source of truth (content, sources,
 * licences); `npm run dataset:build` packs it into
 * `tests/carebridge/dataset/self_help_cards.v1.pb.zst` and the card test
 * validates it. This module only exposes typed, read-only accessors.
 *
 * Safety contract (docs/CAREBRIDGE_SAFETY_POLICY.md §4.3):
 * - the model may only PICK a card id from `selfHelpCatalogForPrompt()`; step
 *   text always comes from this file, never from model output;
 * - `safety_plan` cards are never selectable by the model; they are rendered
 *   statically on the urgent-help screen only (`SAFETY_PLAN_CARD_IDS`);
 * - WHO material is CC BY-NC-SA 3.0 IGO: the UI and the export must carry the
 *   attribution plus the "adapted, WHO not responsible" disclaimer
 *   (`selfHelpAttribution(card).adapted`).
 */

export const SELF_HELP_TOPICS = [
  'stress',
  'sleep',
  'worry',
  'low_mood',
  'overload_study',
  'overload_work',
  'money',
  'loneliness',
  'grief',
  'relationship_conflict',
  'family_conflict',
  'grounding',
  'health_worry',
  'self_criticism',
  'burnout',
  'safety_plan',
] as const;

export type SelfHelpTopic = (typeof SELF_HELP_TOPICS)[number];
export type SelfHelpLang = 'id' | 'en';

export interface SelfHelpLocalized {
  id: string;
  en: string;
}

export interface SelfHelpSource {
  title: string;
  publisher: string;
  url: string;
  license: string;
  /** YYYY-MM-DD the source was checked. */
  retrieved: string;
}

export interface SelfHelpCard {
  id: string;
  topics: SelfHelpTopic[];
  title: SelfHelpLocalized;
  summary: SelfHelpLocalized;
  steps: { id: string[]; en: string[] };
  why: SelfHelpLocalized;
  seekHelpWhen: SelfHelpLocalized;
  cautions?: SelfHelpLocalized;
  source: SelfHelpSource;
  evidenceNote: string;
}

/** All cards, in file order. Read-only. */
export const SELF_HELP_CARDS: ReadonlyArray<SelfHelpCard> = cardsJson as SelfHelpCard[];

const BY_ID: ReadonlyMap<string, SelfHelpCard> = new Map(SELF_HELP_CARDS.map((card) => [card.id, card]));

export function isSafetyPlanCard(card: Pick<SelfHelpCard, 'topics'>): boolean {
  return card.topics.includes('safety_plan');
}

/** Every card id, including the safety-plan cards. */
export const SELF_HELP_CARD_IDS: ReadonlyArray<string> = SELF_HELP_CARDS.map((card) => card.id);

/** Ids the model is allowed to pick for "Langkah yang bisa dicoba" (never `safety_plan`). */
export const SELF_HELP_SELECTABLE_CARD_IDS: ReadonlyArray<string> = SELF_HELP_CARDS.filter((card) => !isSafetyPlanCard(card)).map(
  (card) => card.id
);

/** The static safety-plan cards shown on the urgent-help screen (no AI involved). */
export const SAFETY_PLAN_CARD_IDS: ReadonlyArray<string> = SELF_HELP_CARDS.filter(isSafetyPlanCard).map((card) => card.id);

export function getSelfHelpCard(id: string): SelfHelpCard | undefined {
  return BY_ID.get(id);
}

/** True only for a known card that the model may select (exists and is not `safety_plan`). */
export function isSelectableSelfHelpCardId(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  const card = BY_ID.get(id);
  return card !== undefined && !isSafetyPlanCard(card);
}

/** Maximum number of cards a passport may carry (prompt and validator agree on this). */
export const SELF_HELP_MAX_CARDS = 3;

/**
 * Compact catalog for the system prompt: one line per selectable card,
 * `id: title — topic, topic`. Titles only (no steps, no summaries) to keep
 * prefill short; the model never needs the step text because it never
 * writes it.
 */
export function selfHelpCatalogForPrompt(lang: SelfHelpLang = 'id'): string {
  return SELF_HELP_CARDS.filter((card) => !isSafetyPlanCard(card))
    .map((card) => `${card.id}: ${card.title[lang]} — ${card.topics.join(', ')}`)
    .join('\n');
}

export interface SelfHelpAttribution {
  publisher: string;
  title: string;
  license: string;
  url: string;
  /**
   * True for CC BY-NC-SA material (WHO): the display must add the adaptation
   * disclaimer required by the licence (adapted by Dengar.in; the licensor is
   * not responsible for the adaptation).
   */
  adapted: boolean;
}

export function selfHelpAttribution(card: Pick<SelfHelpCard, 'source'>): SelfHelpAttribution {
  const { publisher, title, license, url } = card.source;
  return { publisher, title, license, url, adapted: /CC BY-NC-SA/i.test(license) };
}

/**
 * Short licence label for a source line. Long legal notes (Kemenkes public
 * information, the Stanley & Brown structure-only note) are shortened to a
 * fixed phrase; the full text stays in the JSON for reviewers.
 */
export function selfHelpLicenseLabel(card: Pick<SelfHelpCard, 'source'>, lang: SelfHelpLang = 'id'): string {
  const license = card.source.license;
  if (/CC BY-NC-SA 3\.0 IGO/i.test(license)) return 'CC BY-NC-SA 3.0 IGO';
  if (/public domain/i.test(license)) return lang === 'id' ? 'domain publik, atribusi ke CDC' : 'public domain, attributed to CDC';
  if (/UU 28\/2014/i.test(license)) return lang === 'id' ? 'informasi publik pemerintah RI, diparafrasekan' : 'Indonesian government public information, paraphrased';
  if (/Stanley/i.test(license)) return lang === 'id' ? 'hanya struktur yang dideskripsikan; formulir asli berhak cipta Stanley & Brown' : 'structure described only; the original form is copyrighted by Stanley & Brown';
  return license;
}
