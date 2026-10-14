// Guards the synthetic evaluation dataset (SCRUM-43): schema, distribution,
// topic vocabulary, PII hygiene, and, most importantly, that every label agrees
// with the REAL deterministic gate (crisis engine + urgent-request regex), so a
// mislabelled case cannot silently redefine what "false escalation" means.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateCrisisInput } from '../../services/crisis-engine/src/crisisDetector.ts';
import { isUnexplainedComplaint, isUrgentHelpRequest } from '../../services/orchestrator/src/carePassportPipeline.ts';
import {
  BANDS,
  ESCALATIONS,
  STATES,
  TOPIC_VOCABULARY,
  aggregate,
  buildSample,
  compareEscalation,
  escalationOf,
  parseJsonl,
} from '../../scripts/testbench/datasetLib.mjs';

const FILE = new URL('./dataset/cases.v1.jsonl', import.meta.url);
const cases = parseJsonl(readFileSync(FILE, 'utf8'));

const ALLOWED_KEYS = new Set(['id', 'lang', 'band', 'topics', 'input', 'expected', 'notes', 'reviewFlag']);
const ALLOWED_EXPECTED_KEYS = new Set(['state', 'escalation', 'concernThemes', 'selfHelpTopics', 'mustNotContain']);
const STATE_TO_ESCALATION = {
  READY_FOR_USER_REVIEW: 'none',
  NEEDS_CLARIFICATION: 'none',
  HUMAN_SUPPORT_RECOMMENDED: 'human_support',
  IMMEDIATE_HELP_SCREEN: 'immediate_help',
};

const byBand = (band) => cases.filter((c) => c.band === band);
const share = (list) => list.length / cases.length;
const gate = (c) => evaluateCrisisInput(c.input, '18-29');
const isStringArray = (v) => Array.isArray(v) && v.every((x) => typeof x === 'string' && x.trim() !== '');

describe('dataset v1: schema', () => {
  it('has at least 60 cases', () => {
    assert.ok(cases.length >= 60, `hanya ${cases.length} kasus`);
  });

  it('every line has exactly the documented keys and types', () => {
    for (const c of cases) {
      for (const key of Object.keys(c)) assert.ok(ALLOWED_KEYS.has(key), `${c.id}: key tidak dikenal "${key}"`);
      assert.match(c.id, /^v1-[a-z]+-\d{2}$/, `${c.id}: format id`);
      assert.ok(['id', 'en'].includes(c.lang), `${c.id}: lang`);
      assert.ok(BANDS.includes(c.band), `${c.id}: band "${c.band}"`);
      assert.ok(isStringArray(c.topics) && c.topics.length > 0, `${c.id}: topics`);
      assert.equal(typeof c.input, 'string');
      assert.ok(c.input.trim().length >= 20, `${c.id}: input terlalu pendek`);
      assert.ok(c.input.length <= 600, `${c.id}: input terlalu panjang`);
      assert.equal(typeof c.notes, 'string');
      assert.ok(c.notes.trim().length >= 30, `${c.id}: notes harus menjelaskan label`);
      if ('reviewFlag' in c) assert.equal(c.reviewFlag, true, `${c.id}: reviewFlag hanya boleh true atau tidak ada`);

      const e = c.expected;
      assert.equal(typeof e, 'object');
      for (const key of Object.keys(e)) assert.ok(ALLOWED_EXPECTED_KEYS.has(key), `${c.id}: expected.${key} tidak dikenal`);
      assert.ok(STATES.includes(e.state) && e.state !== 'PROVIDER_UNAVAILABLE', `${c.id}: expected.state`);
      assert.ok(ESCALATIONS.includes(e.escalation), `${c.id}: expected.escalation`);
      assert.equal(e.escalation, STATE_TO_ESCALATION[e.state], `${c.id}: state dan escalation tidak konsisten`);
      assert.ok(isStringArray(e.concernThemes) && e.concernThemes.length > 0, `${c.id}: concernThemes`);
      assert.ok(isStringArray(e.selfHelpTopics) && e.selfHelpTopics.length > 0, `${c.id}: selfHelpTopics`);
      assert.ok(Array.isArray(e.mustNotContain) && e.mustNotContain.every((x) => typeof x === 'string'), `${c.id}: mustNotContain`);
    }
  });

  it('ids are unique and inputs are unique', () => {
    assert.equal(new Set(cases.map((c) => c.id)).size, cases.length);
    assert.equal(new Set(cases.map((c) => c.input.toLowerCase())).size, cases.length);
  });

  it('does not reuse the golden fixture inputs verbatim', async () => {
    const { GOLDEN_CASES, ATTRIBUTION_SCENARIOS } = await import('./fixtures.mjs');
    const existing = new Set([...GOLDEN_CASES, ...ATTRIBUTION_SCENARIOS].map((f) => f.input.toLowerCase()));
    for (const c of cases) assert.ok(!existing.has(c.input.toLowerCase()), `${c.id}: menyalin fixture lama`);
  });

  it('contains no synthetic PII patterns (phone, email, URL, handle, NIK)', () => {
    const pii = [
      /\b(?:\+62|62|0)8\d{2}[-\s.]?\d{3,4}[-\s.]?\d{3,4}\b/, // Indonesian mobile
      /[\w.+-]+@[\w-]+\.[\w.]+/, // email
      /https?:\/\//i,
      /(?:^|\s)@[a-z0-9_]{3,}/i, // handle
      /\b\d{16}\b/, // NIK / card
    ];
    for (const c of cases) for (const re of pii) assert.ok(!re.test(c.input), `${c.id}: cocok pola PII ${re}`);
  });
});

describe('dataset v1: distribution', () => {
  it('matches the band targets within tolerance', () => {
    const within = (band, lo, hi) => {
      const s = share(byBand(band));
      assert.ok(s >= lo && s <= hi, `${band}: ${Math.round(s * 100)}% di luar ${lo * 100}-${hi * 100}%`);
    };
    within('mild', 0.2, 0.3);
    within('moderate', 0.3, 0.4);
    within('high_distress_no_crisis', 0.1, 0.2);
    within('crisis', 0.07, 0.15);
    within('urgent_request', 0.03, 0.08);
    within('vague', 0.07, 0.15);
  });

  it('has roughly 30% English cases, present in every non-trivial band', () => {
    const en = cases.filter((c) => c.lang === 'en');
    const s = share(en);
    assert.ok(s >= 0.25 && s <= 0.35, `en ${Math.round(s * 100)}%`);
    for (const band of BANDS) assert.ok(byBand(band).some((c) => c.lang === 'en'), `${band}: tidak ada kasus en`);
  });

  it('moderate band includes tricky strong-word cases that are not crisis', () => {
    const tricky = byBand('moderate').filter((c) => /TRICKY/.test(c.notes));
    assert.ok(tricky.length >= 4, `hanya ${tricky.length} kasus TRICKY`);
  });
});

describe('dataset v1: topic vocabulary', () => {
  it('uses only the fixed topic ids in topics and selfHelpTopics', () => {
    for (const c of cases) {
      for (const t of c.topics) assert.ok(TOPIC_VOCABULARY.includes(t), `${c.id}: topic "${t}" di luar kosakata`);
      for (const t of c.expected.selfHelpTopics) assert.ok(TOPIC_VOCABULARY.includes(t), `${c.id}: selfHelpTopic "${t}" di luar kosakata`);
    }
  });

  it('covers every topic id at least once', () => {
    const used = new Set(cases.flatMap((c) => [...c.topics, ...c.expected.selfHelpTopics]));
    for (const t of TOPIC_VOCABULARY) assert.ok(used.has(t), `topik "${t}" tidak dipakai`);
  });

  it('points crisis, urgent and high-distress cases at the safety plan', () => {
    for (const c of cases.filter((x) => ['crisis', 'urgent_request', 'high_distress_no_crisis'].includes(x.band))) {
      assert.ok(c.expected.selfHelpTopics.includes('safety_plan'), `${c.id}: safety_plan hilang`);
    }
  });
});

describe('dataset v1: labels agree with the real deterministic gate', () => {
  it('crisis band: every case trips isCrisis and expects IMMEDIATE_HELP_SCREEN', () => {
    for (const c of byBand('crisis')) {
      assert.equal(gate(c).isCrisis, true, `${c.id}: crisis engine tidak menandai`);
      assert.equal(c.expected.state, 'IMMEDIATE_HELP_SCREEN', c.id);
      assert.ok(!c.reviewFlag, `${c.id}: kasus krisis tidak boleh reviewFlag (harus pasti)`);
    }
  });

  it('urgent_request band: ID cases trip isUrgentHelpRequest without isCrisis; EN gap is flagged', () => {
    for (const c of byBand('urgent_request')) {
      assert.equal(gate(c).isCrisis, false, `${c.id}: harus menguji jalur urgent, bukan crisis`);
      if (c.reviewFlag) {
        assert.equal(isUrgentHelpRequest(c.input), false, `${c.id}: reviewFlag hanya untuk celah gate`);
        assert.notEqual(c.expected.escalation, 'none', `${c.id}: permintaan darurat minimal human_support`);
        assert.match(c.notes, /GAP|celah/i);
      } else {
        assert.equal(isUrgentHelpRequest(c.input), true, `${c.id}: regex urgent tidak cocok`);
        assert.equal(c.expected.state, 'IMMEDIATE_HELP_SCREEN', c.id);
      }
    }
  });

  it('mild, moderate and vague bands: not caught by the gate and expect no escalation (except reviewFlag)', () => {
    for (const c of [...byBand('mild'), ...byBand('moderate'), ...byBand('vague')]) {
      const g = gate(c);
      assert.equal(isUrgentHelpRequest(c.input), false, `${c.id}: regex urgent cocok`);
      if (c.reviewFlag) {
        // Label must follow current deterministic behaviour and say so.
        assert.equal(c.expected.state, g.isCrisis ? 'IMMEDIATE_HELP_SCREEN' : c.expected.state, c.id);
        if (g.isCrisis) assert.equal(c.expected.escalation, 'immediate_help', `${c.id}: idiom yang ditandai engine harus expected immediate_help`);
        assert.match(c.notes, /IDIOM|REVIEW/i, `${c.id}: notes harus menjelaskan alasan review`);
        continue;
      }
      assert.equal(g.isCrisis, false, `${c.id}: crisis engine menandai (${g.triggeredPatterns.join(',')}); beri reviewFlag atau ubah teks`);
      assert.notEqual(g.severity, 'high', `${c.id}: severity high akan mengunci HUMAN_SUPPORT`);
      assert.equal(c.expected.escalation, 'none', c.id);
    }
  });

  it('vague band: expected state follows the soft clarification phrase list', () => {
    for (const c of byBand('vague')) {
      const expected = isUnexplainedComplaint(c.input) ? 'NEEDS_CLARIFICATION' : 'READY_FOR_USER_REVIEW';
      assert.equal(c.expected.state, expected, `${c.id}: isUnexplainedComplaint=${!expected.startsWith('READY')}`);
    }
  });

  it('high_distress_no_crisis band: never isCrisis, expects human_support, deterministic ones say so', () => {
    const band = byBand('high_distress_no_crisis');
    const deterministic = band.filter((c) => gate(c).severity === 'high');
    for (const c of band) {
      const g = gate(c);
      assert.equal(g.isCrisis, false, `${c.id}: ini krisis, bukan high distress`);
      assert.equal(isUrgentHelpRequest(c.input), false, c.id);
      assert.equal(c.expected.state, 'HUMAN_SUPPORT_RECOMMENDED', c.id);
      if (g.severity === 'high') assert.match(c.notes, /DETERMINISTI[KC]/, `${c.id}: notes harus menyebut pemicu deterministik`);
      else assert.match(c.notes, /MODEL-DEPENDENT|REVIEW/, `${c.id}: notes harus menyebut ketergantungan pada model`);
    }
    // Both paths of HUMAN_SUPPORT_RECOMMENDED must be represented.
    assert.ok(deterministic.length >= 3, 'butuh >= 3 kasus severity high deterministik');
    assert.ok(band.length - deterministic.length >= 3, 'butuh >= 3 kasus yang bergantung pada model');
  });

  it('every reviewFlag case explains itself', () => {
    const flagged = cases.filter((c) => c.reviewFlag);
    assert.ok(flagged.length >= 2 && flagged.length <= 8, `${flagged.length} kasus reviewFlag`);
    for (const c of flagged) assert.ok(c.notes.length >= 80, `${c.id}: notes reviewFlag terlalu singkat`);
  });
});

describe('dataset runner metrics (scripts/testbench/datasetLib.mjs)', () => {
  it('maps states to escalation labels', () => {
    assert.equal(escalationOf('READY_FOR_USER_REVIEW'), 'none');
    assert.equal(escalationOf('NEEDS_CLARIFICATION'), 'none');
    assert.equal(escalationOf('HUMAN_SUPPORT_RECOMMENDED'), 'human_support');
    assert.equal(escalationOf('IMMEDIATE_HELP_SCREEN'), 'immediate_help');
    assert.equal(escalationOf('PROVIDER_UNAVAILABLE'), null);
  });

  it('classifies false, missed, under and over escalation', () => {
    assert.equal(compareEscalation('none', 'human_support'), 'false_escalation');
    assert.equal(compareEscalation('none', 'immediate_help'), 'false_escalation');
    assert.equal(compareEscalation('human_support', 'none'), 'missed_escalation');
    assert.equal(compareEscalation('immediate_help', 'none'), 'missed_escalation');
    assert.equal(compareEscalation('immediate_help', 'human_support'), 'under_escalation');
    assert.equal(compareEscalation('human_support', 'immediate_help'), 'over_escalation');
    assert.equal(compareEscalation('none', 'none'), 'match');
    assert.equal(compareEscalation('none', null), 'no_result');
  });

  it('separates provider failures from semantic results and keeps the safety invariant', () => {
    const mild = cases.find((c) => c.band === 'mild');
    const crisis = cases.find((c) => c.band === 'crisis');
    const failed = buildSample(mild, { state: 'PROVIDER_UNAVAILABLE', warnings: ['x: AMD endpoint tidak merespons dalam 30000 ms'] }, { calls: 1, errors: ['AMD endpoint tidak merespons dalam 30000 ms'] });
    assert.equal(failed.outcome, 'no_result');
    assert.equal(failed.failure, 'provider_error:timeout');
    assert.equal(failed.infraFailure, true);
    const rejected = buildSample(mild, { state: 'PROVIDER_UNAVAILABLE', warnings: ['x: JSON tidak valid'] }, { calls: 1, errors: [] });
    assert.equal(rejected.failure, 'invalid_output');
    assert.equal(rejected.infraFailure, false);
    const escalated = buildSample(mild, { state: 'HUMAN_SUPPORT_RECOMMENDED', warnings: ['model_escalation'], provenance: { latencyMs: 1200 } }, { calls: 1, errors: [] });
    assert.equal(escalated.outcome, 'false_escalation');
    assert.equal(escalated.trigger, 'model_escalation');
    const gated = buildSample(crisis, { state: 'IMMEDIATE_HELP_SCREEN', warnings: ['crisis_gate'] }, { calls: 0, errors: [] });
    assert.equal(gated.providerNeverCalled, true);
    assert.equal(gated.outcome, 'match');

    const rows = aggregate([failed, rejected, escalated, gated]);
    assert.equal(rows.all.providerFailures, 1);
    assert.equal(rows.all.invalidOutput, 1);
    assert.equal(rows.all.semantic, 2);
    assert.equal(rows.mild.falseEscalation, 1);
    assert.equal(rows.mild.falseEscalationOf, 1);
    assert.deepEqual(rows.all.falseEscalationIds, [mild.id]);
    assert.equal(rows.all.safety.providerNeverCalled, true);
    assert.equal(rows.all.p50Ms, 1200);
  });

  it('never stores input text or secrets in a sample', () => {
    const c = cases[0];
    const sample = buildSample(c, { state: 'READY_FOR_USER_REVIEW', warnings: ['provider: status 429 from https://example.invalid/v1 Bearer abc.def'], provenance: { latencyMs: 10 } }, { calls: 1, errors: [] }, { secrets: ['abc.def'] });
    const json = JSON.stringify(sample);
    assert.ok(!json.includes(c.input));
    assert.ok(!json.includes('example.invalid') && !json.includes('abc.def'));
  });
});
