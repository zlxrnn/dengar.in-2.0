import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  runCarePassportPipeline,
  needsSoftClarification,
  isUnexplainedComplaint,
  isUrgentHelpRequest,
  DEFAULT_CLARIFICATION_QUESTION,
} from '../../services/orchestrator/src/carePassportPipeline.ts';
import { CARE_PASSPORT_INPUT_OPEN } from '../../packages/prompts/src/carePassport.ts';
import { GOLDEN_CASES } from './fixtures.mjs';

const STUDENT_STRESS =
  'Aku kewalahan dengan tugas kuliah. Kalau deadline berdekatan, aku sulit fokus. Aku belum tahu gimana menjelaskan ini saat minta bantuan.';

const GROUNDED_DRAFT = {
  version: 1,
  concerns: [{ value: 'Kewalahan dengan tugas kuliah', source: 'user_input', sourceQuote: 'kewalahan dengan tugas kuliah' }],
  dailyImpact: [{ value: 'Sulit fokus saat deadline berdekatan', source: 'user_input', sourceQuote: 'Kalau deadline berdekatan, aku sulit fokus' }],
  duration: { value: null, source: 'unknown' },
  relevantContext: [],
  questionsForProfessional: ['Bagaimana cara mengatur tugas saat deadline menumpuk?'],
  unknowns: [],
};

function mockProvider(id, generate, extra = {}) {
  const provider = {
    id,
    calls: [],
    isConfigured: () => true,
    async generate(request) {
      provider.calls.push(request);
      return generate(request);
    },
    ...extra,
  };
  return provider;
}

const returns = (draft) => async () => ({ rawText: typeof draft === 'string' ? draft : JSON.stringify(draft) });

describe('Care Passport pipeline: safety precedence', () => {
  it('routes deterministic crisis input to IMMEDIATE_HELP_SCREEN without calling any provider', async () => {
    const provider = mockProvider('amd:test', returns(GROUNDED_DRAFT), { isAmd: true });
    const text = 'Aku capek, rasanya pengen mati aja.';
    const result = await runCarePassportPipeline(
      { rawText: text, sanitizedText: text, aiConsent: true },
      { providers: [provider] }
    );
    assert.equal(result.state, 'IMMEDIATE_HELP_SCREEN');
    assert.equal(provider.calls.length, 0);
    assert.ok(result.emergencyContacts.length > 0);
    assert.equal(result.passport, undefined);
    assert.equal(result.provenance.isFallback, true);
  });

  it('honours an explicit request for urgent help without any model call', async () => {
    const provider = mockProvider('amd:test', returns(GROUNDED_DRAFT), { isAmd: true });
    const text = 'Tolong, aku butuh bantuan darurat sekarang.';
    const result = await runCarePassportPipeline(
      { rawText: text, sanitizedText: text, aiConsent: true },
      { providers: [provider] }
    );
    assert.equal(result.state, 'IMMEDIATE_HELP_SCREEN');
    assert.equal(provider.calls.length, 0);
  });

  it('never calls a provider when AI consent is declined', async () => {
    const provider = mockProvider('amd:test', returns(GROUNDED_DRAFT), { isAmd: true });
    const result = await runCarePassportPipeline(
      { rawText: STUDENT_STRESS, sanitizedText: STUDENT_STRESS, aiConsent: false },
      { providers: [provider] }
    );
    assert.equal(result.state, 'PROVIDER_UNAVAILABLE');
    assert.equal(provider.calls.length, 0);
    assert.ok(result.warnings.includes('ai_consent_declined'));
    assert.equal(result.passport, undefined);
  });

  it('still runs the crisis gate before the consent check', async () => {
    const text = 'Aku ingin bunuh diri.';
    const result = await runCarePassportPipeline({ rawText: text, sanitizedText: text, aiConsent: false });
    assert.equal(result.state, 'IMMEDIATE_HELP_SCREEN');
  });
});

describe('Care Passport pipeline: inference and grounding', () => {
  it('returns READY_FOR_USER_REVIEW with AMD provenance for a grounded draft', async () => {
    let tick = 1000;
    const provider = mockProvider('amd:test-model', returns(GROUNDED_DRAFT), { isAmd: true });
    const result = await runCarePassportPipeline(
      { rawText: STUDENT_STRESS, sanitizedText: STUDENT_STRESS, aiConsent: true },
      { providers: [provider], now: () => (tick += 250) }
    );
    assert.equal(result.state, 'READY_FOR_USER_REVIEW');
    assert.equal(result.provenance.providerId, 'amd:test-model');
    assert.equal(result.provenance.isAmd, true);
    assert.equal(result.provenance.isFallback, false);
    assert.equal(result.provenance.latencyMs, 250);
    assert.equal(result.passport.reviewStatus, 'user_pending');
    assert.equal(result.passport.duration.source, 'unknown');
  });

  it('marks a non-AMD provider honestly in provenance', async () => {
    const provider = mockProvider('deepseek:test', returns(GROUNDED_DRAFT));
    const result = await runCarePassportPipeline(
      { rawText: STUDENT_STRESS, sanitizedText: STUDENT_STRESS, aiConsent: true },
      { providers: [provider] }
    );
    assert.equal(result.provenance.isAmd, false);
  });

  it('falls through to the next provider when the first returns malformed output', async () => {
    const broken = mockProvider('amd:broken', returns('maaf, saya tidak bisa'), { isAmd: true });
    const backup = mockProvider('amd:backup', returns(GROUNDED_DRAFT), { isAmd: true });
    const result = await runCarePassportPipeline(
      { rawText: STUDENT_STRESS, sanitizedText: STUDENT_STRESS, aiConsent: true },
      { providers: [broken, backup] }
    );
    assert.equal(broken.calls.length, 1);
    assert.equal(backup.calls.length, 1);
    assert.equal(result.state, 'READY_FOR_USER_REVIEW');
    assert.equal(result.provenance.providerId, 'amd:backup');
    assert.ok(result.warnings.some((w) => w.startsWith('amd:broken')));
  });

  it('returns PROVIDER_UNAVAILABLE without a passport when every provider fails', async () => {
    const timeout = mockProvider('amd:down', async () => {
      throw new Error('timeout');
    }, { isAmd: true });
    const invalid = mockProvider('deepseek:invalid', returns({ foo: 'bar' }));
    const result = await runCarePassportPipeline(
      { rawText: STUDENT_STRESS, sanitizedText: STUDENT_STRESS, aiConsent: true },
      { providers: [timeout, invalid] }
    );
    assert.equal(result.state, 'PROVIDER_UNAVAILABLE');
    assert.equal(result.passport, undefined);
    assert.equal(result.provenance.providerId, 'none');
    assert.equal(result.provenance.isFallback, true);
  });

  it('returns PROVIDER_UNAVAILABLE when no provider is configured', async () => {
    const result = await runCarePassportPipeline({ rawText: STUDENT_STRESS, sanitizedText: STUDENT_STRESS, aiConsent: true });
    assert.equal(result.state, 'PROVIDER_UNAVAILABLE');
    assert.ok(result.warnings.includes('no_provider_configured'));
  });

  it('asks for clarification when nothing in the draft is grounded', async () => {
    const vague = 'Aku sering ngerasa nggak baik, entah kenapa.';
    const provider = mockProvider('amd:test', returns({
      concerns: [{ value: 'Gangguan tidur', source: 'user_input', sourceQuote: 'susah tidur tiap malam' }],
      duration: { value: '6 bulan', source: 'user_input', sourceQuote: 'enam bulan' },
      clarificationQuestion: 'Perasaan tidak baik itu paling sering muncul kapan?',
    }), { isAmd: true });
    const result = await runCarePassportPipeline(
      { rawText: vague, sanitizedText: vague, aiConsent: true },
      { providers: [provider] }
    );
    assert.equal(result.state, 'NEEDS_CLARIFICATION');
    assert.equal(result.passport.concerns.length, 0);
    assert.equal(result.passport.duration.source, 'unknown');
    assert.equal(result.clarificationQuestion, 'Perasaan tidak baik itu paling sering muncul kapan?');
    assert.equal(result.droppedClaims, 2);
  });

  it('uses a safe default clarification question when the model gives none', async () => {
    const vague = 'Aku sering ngerasa nggak baik, entah kenapa.';
    const provider = mockProvider('amd:test', returns({ concerns: [] }), { isAmd: true });
    const result = await runCarePassportPipeline(
      { rawText: vague, sanitizedText: vague, aiConsent: true },
      { providers: [provider] }
    );
    assert.equal(result.state, 'NEEDS_CLARIFICATION');
    assert.equal(result.clarificationQuestion, DEFAULT_CLARIFICATION_QUESTION);
  });
});

describe('Care Passport pipeline: escalation only', () => {
  it('escalates to HUMAN_SUPPORT_RECOMMENDED when the model suggests human support with a grounded quote', async () => {
    const provider = mockProvider('amd:test', returns({
      ...GROUNDED_DRAFT,
      humanSupportSuggested: true,
      humanSupportQuote: 'Aku kewalahan dengan tugas kuliah',
    }), { isAmd: true });
    const result = await runCarePassportPipeline(
      { rawText: STUDENT_STRESS, sanitizedText: STUDENT_STRESS, aiConsent: true },
      { providers: [provider] }
    );
    assert.equal(result.state, 'HUMAN_SUPPORT_RECOMMENDED');
    assert.ok(result.warnings.includes('model_escalation'));
    assert.ok(!result.warnings.includes('ungrounded_escalation_dropped'));
  });

  it('SCRUM-44: a model escalation without a grounded quote is dropped, the passport is still returned', async () => {
    const provider = mockProvider('amd:test', returns({ ...GROUNDED_DRAFT, humanSupportSuggested: true }), { isAmd: true });
    const result = await runCarePassportPipeline(
      { rawText: STUDENT_STRESS, sanitizedText: STUDENT_STRESS, aiConsent: true },
      { providers: [provider] }
    );
    assert.equal(result.state, 'READY_FOR_USER_REVIEW');
    assert.ok(result.warnings.includes('ungrounded_escalation_dropped'));
    assert.ok(!result.warnings.includes('model_escalation'));
    assert.equal(result.passport.concerns.length, 1);
  });

  it('SCRUM-44: a paraphrased escalation quote is dropped like any other ungrounded claim', async () => {
    const provider = mockProvider('amd:test', returns({
      ...GROUNDED_DRAFT,
      humanSupportSuggested: true,
      humanSupportQuote: 'aku sangat kewalahan dan tidak sanggup lagi',
    }), { isAmd: true });
    const result = await runCarePassportPipeline(
      { rawText: STUDENT_STRESS, sanitizedText: STUDENT_STRESS, aiConsent: true },
      { providers: [provider] }
    );
    assert.equal(result.state, 'READY_FOR_USER_REVIEW');
    assert.ok(result.warnings.includes('ungrounded_escalation_dropped'));
  });

  it('SCRUM-44 safety net: an ungrounded model escalation changes nothing when the engine already flagged high distress', async () => {
    const text = 'Aku udah nggak kuat lagi. Tiap hari nangis, nggak bisa kerja.';
    const provider = mockProvider('amd:test', returns({
      concerns: [{ value: 'Menangis setiap hari', source: 'user_input', sourceQuote: 'Tiap hari nangis' }],
      humanSupportSuggested: true,
    }), { isAmd: true });
    const result = await runCarePassportPipeline(
      { rawText: text, sanitizedText: text, aiConsent: true },
      { providers: [provider] }
    );
    assert.equal(result.state, 'HUMAN_SUPPORT_RECOMMENDED');
    assert.ok(result.warnings.includes('deterministic_high_distress'));
    assert.ok(result.warnings.includes('ungrounded_escalation_dropped'), 'the drop is still recorded for audit');
  });

  it('SCRUM-44: passive ideation (ID) is deterministic high, so HUMAN_SUPPORT is locked even if the model says false', async () => {
    const text = 'Akhir-akhir ini aku ngerasa nggak berguna dan kepikiran semua orang lebih baik tanpa aku. Aku nggak punya rencana apa-apa.';
    const provider = mockProvider('amd:test', returns({
      concerns: [{ value: 'Merasa tidak berguna', source: 'user_input', sourceQuote: 'ngerasa nggak berguna' }],
      humanSupportSuggested: false,
    }), { isAmd: true });
    const result = await runCarePassportPipeline(
      { rawText: text, sanitizedText: text, aiConsent: true },
      { providers: [provider] }
    );
    assert.equal(result.state, 'HUMAN_SUPPORT_RECOMMENDED', 'passive ideation never reaches the review screen unflagged');
    assert.ok(result.warnings.includes('deterministic_high_distress'));
    assert.equal(provider.calls.length, 1, 'high (not crisis) still produces a draft');
  });

  it('SCRUM-44: passive ideation (EN) is deterministic high as well', async () => {
    const text = 'I keep thinking I wish I could disappear forever. I have no plan, I am just tired of everything.';
    const provider = mockProvider('amd:test', returns({
      concerns: [{ value: 'Tired of everything', source: 'user_input', sourceQuote: 'tired of everything' }],
      humanSupportSuggested: false,
    }), { isAmd: true });
    const result = await runCarePassportPipeline(
      { rawText: text, sanitizedText: text, aiConsent: true },
      { providers: [provider] }
    );
    assert.equal(result.state, 'HUMAN_SUPPORT_RECOMMENDED');
    assert.ok(result.warnings.includes('deterministic_high_distress'));
  });

  it('SCRUM-44: an explicit English request for emergency help opens IMMEDIATE_HELP_SCREEN without a model call', async () => {
    for (const text of [
      'I need emergency help right now. I am in danger at home and I cannot stay here tonight.',
      "I'm not safe here, my partner is threatening me.",
      'Please connect me to emergency services.',
    ]) {
      const provider = mockProvider('amd:test', returns(GROUNDED_DRAFT), { isAmd: true });
      const result = await runCarePassportPipeline(
        { rawText: text, sanitizedText: text, aiConsent: true },
        { providers: [provider] }
      );
      assert.equal(result.state, 'IMMEDIATE_HELP_SCREEN', text);
      assert.equal(provider.calls.length, 0, text);
      assert.ok(result.warnings.includes('urgent_help_requested'), text);
    }
  });

  it('isUrgentHelpRequest: English explicit requests match, everyday "help" and idioms do not', () => {
    for (const text of [
      'I need emergency help right now.',
      'I need urgent help, I am in danger.',
      'i am in danger',
      "I'm not safe at home",
      'I’m not safe tonight', // curly apostrophe
      'Connect me to crisis support please',
    ]) assert.equal(isUrgentHelpRequest(text), true, text);
    for (const text of [
      'I need help now with my thesis, the deadline is tomorrow.',
      'I would rather die than present at the all-hands tomorrow.',
      'This thesis is killing me.',
      'My safety net is my savings, I am not in debt yet.',
      'It is not safe to assume the client will pay on time.',
      'Can you help me prepare questions for my first consultation?',
    ]) assert.equal(isUrgentHelpRequest(text), false, text);
  });

  it('a model claiming no risk cannot downgrade a deterministic high-distress flag', async () => {
    const text = 'Aku udah hancur lebur karena tugas kuliah, kewalahan banget.';
    const provider = mockProvider('amd:test', returns({
      concerns: [{ value: 'Kewalahan karena tugas kuliah', source: 'user_input', sourceQuote: 'kewalahan banget' }],
      humanSupportSuggested: false,
      riskLevel: 'none',
    }), { isAmd: true });
    const result = await runCarePassportPipeline(
      { rawText: text, sanitizedText: text, aiConsent: true },
      { providers: [provider] }
    );
    assert.equal(result.state, 'HUMAN_SUPPORT_RECOMMENDED');
    assert.ok(result.warnings.includes('deterministic_high_distress'));
  });
});

describe('Care Passport pipeline: soft clarification when only the concern is known (SCRUM-32)', () => {
  const golden = (id) => GOLDEN_CASES.find((c) => c.id === id);
  const run = (text, draft, extra = {}) =>
    runCarePassportPipeline(
      { rawText: text, sanitizedText: text, aiConsent: true, ...extra },
      { providers: [mockProvider('amd:test', returns(draft), { isAmd: true })] }
    );

  it('golden case B: a grounded but vague concern plus a model question asks for clarification', async () => {
    const caseB = golden('B');
    const result = await run(caseB.input, caseB.mockModelOutput);
    assert.equal(result.state, 'NEEDS_CLARIFICATION');
    assert.equal(result.passport.concerns.length, 1, 'the grounded concern is kept, not dropped');
    assert.equal(result.completeness.known, 1);
    assert.equal(result.clarificationQuestion, caseB.mockModelOutput.clarificationQuestion);
    assert.ok(result.warnings.includes('low_completeness_clarification'));
    assert.ok(result.droppedClaims >= caseB.expected.minDropped);
  });

  it('golden case A stays READY_FOR_USER_REVIEW (two core facts known)', async () => {
    const caseA = golden('A');
    const result = await run(caseA.input, caseA.mockModelOutput);
    assert.equal(result.state, 'READY_FOR_USER_REVIEW');
    assert.equal(result.completeness.known, 2);
  });

  it('golden case D stays READY_FOR_USER_REVIEW: only the concern is known but the model asked nothing', async () => {
    const caseD = golden('D');
    const sanitized = caseD.piiSpans.reduce((text, span) => text.replace(span, '[disamarkan]'), caseD.input);
    const result = await runCarePassportPipeline(
      { rawText: caseD.input, sanitizedText: sanitized, aiConsent: true },
      { providers: [mockProvider('amd:test', returns(caseD.mockModelOutput), { isAmd: true })] }
    );
    assert.equal(result.state, 'READY_FOR_USER_REVIEW');
    assert.equal(result.completeness.known, 1);
    assert.equal(result.clarificationQuestion, undefined);
  });

  it('golden case D stays READY_FOR_USER_REVIEW even when the model asks anyway (observed with deepseek-flash, 3/3)', async () => {
    // A named cause ("karena target penjualan") makes the story specific; the
    // user-text gate keeps the soft path closed no matter what the model asks.
    const caseD = golden('D');
    const sanitized = caseD.piiSpans.reduce((text, span) => text.replace(span, '[disamarkan]'), caseD.input);
    const result = await runCarePassportPipeline(
      { rawText: caseD.input, sanitizedText: sanitized, aiConsent: true },
      {
        providers: [mockProvider('amd:test', returns({
          ...caseD.mockModelOutput,
          clarificationQuestion: 'Sejak kapan kamu merasa stres karena target penjualan ini?',
        }), { isAmd: true })],
      }
    );
    assert.equal(result.state, 'READY_FOR_USER_REVIEW');
    assert.equal(result.completeness.known, 1);
    assert.equal(result.clarificationQuestion, undefined);
    assert.ok(!result.warnings.includes('low_completeness_clarification'));
  });

  it('a vague complaint with two core facts known is READY_FOR_USER_REVIEW', async () => {
    const text = 'Aku sering ngerasa nggak baik, entah kenapa. Jadi susah fokus kerja.';
    const result = await run(text, {
      concerns: [{ value: 'Sering merasa tidak baik', source: 'user_input', sourceQuote: 'sering ngerasa nggak baik' }],
      dailyImpact: [{ value: 'Susah fokus kerja', source: 'user_input', sourceQuote: 'susah fokus kerja' }],
      clarificationQuestion: 'Perasaan tidak baik itu paling sering muncul kapan?',
    });
    assert.equal(result.state, 'READY_FOR_USER_REVIEW');
    assert.equal(result.completeness.known, 2);
  });

  it('isUnexplainedComplaint recognises Indonesian "cannot name the cause" phrasings only', () => {
    for (const text of [
      'Aku sering ngerasa nggak baik, entah kenapa.',
      'Rasanya berat terus, nggak tahu kenapa.',
      'Gue sering sedih, gak tau sebabnya.',
      'Aku bingung kenapa aku jadi kayak gini.',
      'Beberapa hari ini murung tanpa sebab yang jelas.',
      'Capek banget tanpa alasan.',
      'Sering nangis, tidak tahu penyebabnya.',
    ]) assert.equal(isUnexplainedComplaint(text), true, text);
    for (const text of [
      'Aku stres karena target penjualan bulan ini.',
      'Aku kewalahan dengan tugas kuliah. Kalau deadline berdekatan, aku sulit fokus.',
      'Orang tuaku sering bertengkar dan aku capek dengar mereka.',
      'Aku tahu kenapa aku sedih: pacarku pergi.',
    ]) assert.equal(isUnexplainedComplaint(text), false, text);
  });

  it('never invents a question: a lone concern without a model question is READY_FOR_USER_REVIEW', async () => {
    const text = 'Aku sering ngerasa nggak baik, entah kenapa.';
    const result = await run(text, {
      concerns: [{ value: 'Sering merasa tidak baik', source: 'user_input', sourceQuote: 'sering ngerasa nggak baik' }],
    });
    assert.equal(result.state, 'READY_FOR_USER_REVIEW');
    assert.equal(result.completeness.known, 1);
    assert.ok(!result.warnings.includes('low_completeness_clarification'));
  });

  it('a question the validator rejects (diagnostic label) cannot trigger the soft path', async () => {
    const text = 'Aku sering ngerasa nggak baik, entah kenapa.';
    const result = await run(text, {
      concerns: [{ value: 'Sering merasa tidak baik', source: 'user_input', sourceQuote: 'sering ngerasa nggak baik' }],
      clarificationQuestion: 'Apakah kamu merasa ini gejala depresi?',
    });
    assert.equal(result.state, 'READY_FOR_USER_REVIEW');
    assert.equal(result.clarificationQuestion, undefined);
  });

  it('asks at most once: after a clarification answer a grounded concern goes to review', async () => {
    const segments = [
      { id: 'intake', kind: 'intake', text: 'Aku sering ngerasa nggak baik, entah kenapa.' },
      { id: 'clarification:1', kind: 'clarification', text: 'Nggak tahu juga, pokoknya nggak enak.' },
    ];
    const result = await run('ignored', {
      concerns: [{ value: 'Sering merasa tidak baik', source: 'user_input', sourceQuote: 'sering ngerasa nggak baik' }],
      clarificationQuestion: 'Perasaan tidak baik itu paling sering muncul kapan?',
    }, { segments });
    assert.equal(result.state, 'READY_FOR_USER_REVIEW');
    assert.equal(result.completeness.known, 1);
    assert.equal(result.clarificationQuestion, undefined);
  });

  it('the hard rule (no grounded concern) still asks again after a clarification answer, with the default question', async () => {
    const segments = [
      { id: 'intake', kind: 'intake', text: 'Aku sering ngerasa nggak baik, entah kenapa.' },
      { id: 'clarification:1', kind: 'clarification', text: 'Nggak tahu juga, pokoknya nggak enak.' },
    ];
    const result = await run('ignored', { concerns: [] }, { segments });
    assert.equal(result.state, 'NEEDS_CLARIFICATION');
    assert.equal(result.clarificationQuestion, DEFAULT_CLARIFICATION_QUESTION);
  });

  it('model escalation outranks the soft path', async () => {
    const text = 'Aku sering ngerasa nggak baik, entah kenapa.';
    const result = await run(text, {
      concerns: [{ value: 'Sering merasa tidak baik', source: 'user_input', sourceQuote: 'sering ngerasa nggak baik' }],
      clarificationQuestion: 'Perasaan tidak baik itu paling sering muncul kapan?',
      humanSupportSuggested: true,
      humanSupportQuote: 'sering ngerasa nggak baik',
    });
    assert.equal(result.state, 'HUMAN_SUPPORT_RECOMMENDED');
    assert.equal(result.clarificationQuestion, undefined);
  });

  it('a deterministic high-distress flag outranks the soft path', async () => {
    const text = 'Aku udah hancur lebur, nggak tahu kenapa.';
    const result = await run(text, {
      concerns: [{ value: 'Merasa hancur', source: 'user_input', sourceQuote: 'hancur lebur' }],
      clarificationQuestion: 'Perasaan itu paling sering muncul kapan?',
      humanSupportSuggested: false,
    });
    assert.equal(result.state, 'HUMAN_SUPPORT_RECOMMENDED');
    assert.ok(result.warnings.includes('deterministic_high_distress'));
  });

  it('needsSoftClarification is a pure rule: low completeness AND unexplained cause AND model question AND first round', () => {
    const q = 'Perasaan itu paling sering muncul kapan?';
    const intakeOnly = [{ kind: 'intake' }];
    const vague = 'Aku sering ngerasa nggak baik, entah kenapa.';
    const specific = 'Aku stres karena target penjualan bulan ini.';
    const low = { known: 1, total: 3, unknownLabels: [] };
    assert.equal(needsSoftClarification(low, q, intakeOnly, vague), true);
    assert.equal(needsSoftClarification({ known: 2, total: 3, unknownLabels: [] }, q, intakeOnly, vague), false);
    assert.equal(needsSoftClarification(low, q, intakeOnly, specific), false);
    assert.equal(needsSoftClarification(low, undefined, intakeOnly, vague), false);
    assert.equal(needsSoftClarification(low, q, [...intakeOnly, { kind: 'clarification' }], vague), false);
  });
});

describe('Care Passport pipeline: data minimisation', () => {
  it('sends only the sanitized text to the provider', async () => {
    const raw = 'Aku kewalahan dengan tugas kuliah. Hubungi aku di 0812-3456-7890 ya.';
    const sanitized = 'Aku kewalahan dengan tugas kuliah. Hubungi aku di [NOMOR_TELEPON] ya.';
    const provider = mockProvider('amd:test', returns(GROUNDED_DRAFT), { isAmd: true });
    await runCarePassportPipeline({ rawText: raw, sanitizedText: sanitized, aiConsent: true }, { providers: [provider] });

    assert.equal(provider.calls.length, 1);
    const sent = JSON.stringify(provider.calls[0]);
    assert.ok(!sent.includes('0812-3456-7890'));
    assert.ok(provider.calls[0].userPrompt.includes('[NOMOR_TELEPON]'));
    assert.ok(provider.calls[0].userPrompt.includes(CARE_PASSPORT_INPUT_OPEN));
  });

  it('validates grounding against sanitized text, so redacted identifiers cannot be quoted back', async () => {
    const raw = 'Aku kewalahan dengan tugas kuliah. Hubungi aku di 0812-3456-7890 ya.';
    const sanitized = 'Aku kewalahan dengan tugas kuliah. Hubungi aku di [NOMOR_TELEPON] ya.';
    const provider = mockProvider('amd:test', returns({
      ...GROUNDED_DRAFT,
      dailyImpact: [],
      relevantContext: [{ value: 'Nomor 0812-3456-7890', source: 'user_input', sourceQuote: '0812-3456-7890' }],
    }), { isAmd: true });
    const result = await runCarePassportPipeline({ rawText: raw, sanitizedText: sanitized, aiConsent: true }, { providers: [provider] });
    assert.equal(result.passport.relevantContext.length, 0);
    assert.ok(!JSON.stringify(result.passport).includes('0812'));
  });
});
