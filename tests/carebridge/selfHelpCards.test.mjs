import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * SCRUM-46: curated self-help knowledge base (strategy cards).
 * Validates tests/carebridge/dataset/self_help_cards.v1.json: schema, topic
 * coverage, bilingual text, source + licence, and forbidden terms. The cards
 * are content, not code; see docs/CAREBRIDGE_KNOWLEDGE_BASE.md for the source
 * table and review status. Not used by the pipeline yet (SCRUM-45).
 */

const here = dirname(fileURLToPath(import.meta.url));
const DATASET_PATH = join(here, 'dataset', 'self_help_cards.v1.json');
const cards = JSON.parse(readFileSync(DATASET_PATH, 'utf8'));

/** Fixed topic vocabulary shared with the SCRUM-46 dataset builder. */
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
];

/** Forbidden in user-facing text (title, summary, steps, why, seekHelpWhen, cautions). */
export const FORBIDDEN_TERMS = [
  'diagnos',
  'depresi berat',
  'gangguan',
  'obat',
  'mg',
  'dosis',
  'antidepresan',
  'terapi kami',
  'sembuh total',
  'prescription',
  'medication',
  'dose',
  'cure',
];

const MIN_CARDS = 25;
const LANGS = ['id', 'en'];
const REQUIRED_KEYS = ['id', 'topics', 'title', 'summary', 'steps', 'why', 'seekHelpWhen', 'source', 'evidenceNote'];
const OPTIONAL_KEYS = ['cautions'];
const ALLOWED_KEYS = new Set([...REQUIRED_KEYS, ...OPTIONAL_KEYS]);
const SOURCE_KEYS = ['title', 'publisher', 'url', 'license', 'retrieved'];
const USER_FACING_FIELDS = ['title', 'summary', 'steps', 'why', 'seekHelpWhen', 'cautions'];

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

function assertBilingualSentence(value, label) {
  assert.ok(value && typeof value === 'object', `${label} must be an object with id and en`);
  for (const lang of LANGS) {
    assert.ok(isNonEmptyString(value[lang]), `${label}.${lang} must be a non-empty string`);
  }
}

/** Every user-facing string of a card, flattened, with a path label for messages. */
function userFacingStrings(card) {
  const out = [];
  for (const field of USER_FACING_FIELDS) {
    const value = card[field];
    if (value === undefined) continue;
    for (const lang of LANGS) {
      const text = value[lang];
      if (Array.isArray(text)) text.forEach((s, i) => out.push([`${field}.${lang}[${i}]`, s]));
      else if (typeof text === 'string') out.push([`${field}.${lang}`, text]);
    }
  }
  return out;
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Prefix word boundary: "obat" matches "obat-obatan" and "obat." but not "pengobatan";
// "cure" does not match "secure"; "mg" matches "5 mg" but not "umg…" inside a word.
const FORBIDDEN_PATTERNS = FORBIDDEN_TERMS.map((term) => [term, new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}`, 'i')]);

export function findForbiddenTerms(text) {
  return FORBIDDEN_PATTERNS.filter(([, re]) => re.test(text)).map(([term]) => term);
}

describe('Self-help cards dataset: shape', () => {
  it(`is a non-empty array with at least ${MIN_CARDS} cards`, () => {
    assert.ok(Array.isArray(cards), 'dataset must be an array');
    assert.ok(cards.length >= MIN_CARDS, `expected >= ${MIN_CARDS} cards, got ${cards.length}`);
  });

  it('every card has exactly the allowed keys and all required keys', () => {
    for (const card of cards) {
      for (const key of REQUIRED_KEYS) assert.ok(key in card, `${card.id ?? '?'}: missing "${key}"`);
      for (const key of Object.keys(card)) assert.ok(ALLOWED_KEYS.has(key), `${card.id}: unexpected key "${key}"`);
    }
  });

  it('ids are kebab-case and unique', () => {
    const seen = new Set();
    for (const card of cards) {
      assert.ok(isNonEmptyString(card.id), 'card id must be a string');
      assert.match(card.id, KEBAB_CASE, `id "${card.id}" is not kebab-case`);
      assert.ok(!seen.has(card.id), `duplicate id "${card.id}"`);
      seen.add(card.id);
    }
  });

  it('title, summary, why and seekHelpWhen are present in id and en (cautions optional)', () => {
    for (const card of cards) {
      assertBilingualSentence(card.title, `${card.id}.title`);
      assertBilingualSentence(card.summary, `${card.id}.summary`);
      assertBilingualSentence(card.why, `${card.id}.why`);
      assertBilingualSentence(card.seekHelpWhen, `${card.id}.seekHelpWhen`);
      if (card.cautions !== undefined) assertBilingualSentence(card.cautions, `${card.id}.cautions`);
    }
  });

  it('steps are 2-5 short imperative strings per language', () => {
    for (const card of cards) {
      assert.ok(card.steps && typeof card.steps === 'object', `${card.id}: steps must be an object`);
      for (const lang of LANGS) {
        const steps = card.steps[lang];
        assert.ok(Array.isArray(steps), `${card.id}.steps.${lang} must be an array`);
        assert.ok(steps.length >= 2 && steps.length <= 5, `${card.id}.steps.${lang} must have 2-5 steps, got ${steps.length}`);
        for (const step of steps) assert.ok(isNonEmptyString(step), `${card.id}.steps.${lang} has an empty step`);
      }
      assert.equal(card.steps.id.length, card.steps.en.length, `${card.id}: id and en step counts differ`);
    }
  });

  it('evidenceNote is a non-empty string', () => {
    for (const card of cards) assert.ok(isNonEmptyString(card.evidenceNote), `${card.id}: evidenceNote missing`);
  });
});

describe('Self-help cards dataset: topics', () => {
  it('every card lists at least one topic from the fixed vocabulary, without duplicates', () => {
    const allowed = new Set(SELF_HELP_TOPICS);
    for (const card of cards) {
      assert.ok(Array.isArray(card.topics) && card.topics.length > 0, `${card.id}: topics must be a non-empty array`);
      assert.equal(new Set(card.topics).size, card.topics.length, `${card.id}: duplicate topics`);
      for (const topic of card.topics) assert.ok(allowed.has(topic), `${card.id}: unknown topic "${topic}"`);
    }
  });

  it('covers every topic at least once', () => {
    const covered = new Set(cards.flatMap((card) => card.topics));
    const missing = SELF_HELP_TOPICS.filter((topic) => !covered.has(topic));
    assert.deepEqual(missing, [], `topics without a card: ${missing.join(', ')}`);
  });

  it('safety_plan has 1-2 cards that point to urgent help (119 ext 8) and are not mixed with other topics', () => {
    const safety = cards.filter((card) => card.topics.includes('safety_plan'));
    assert.ok(safety.length >= 1 && safety.length <= 2, `expected 1-2 safety_plan cards, got ${safety.length}`);
    for (const card of safety) {
      assert.deepEqual(card.topics, ['safety_plan'], `${card.id}: safety_plan cards must not carry other topics`);
      assert.ok(card.seekHelpWhen.id.includes('119 ext 8'), `${card.id}: seekHelpWhen.id must mention 119 ext 8`);
      assert.ok(card.seekHelpWhen.en.includes('119 ext 8'), `${card.id}: seekHelpWhen.en must mention 119 ext 8`);
      assert.ok(card.cautions, `${card.id}: safety_plan cards must carry cautions`);
    }
  });
});

describe('Self-help cards dataset: sources and licences', () => {
  it('every card has a source with title, publisher, https url, licence and retrieved date 2026-10-15', () => {
    for (const card of cards) {
      const { source } = card;
      assert.ok(source && typeof source === 'object', `${card.id}: source missing`);
      for (const key of SOURCE_KEYS) assert.ok(isNonEmptyString(source[key]), `${card.id}: source.${key} missing`);
      assert.deepEqual(Object.keys(source).sort(), [...SOURCE_KEYS].sort(), `${card.id}: unexpected source keys`);
      assert.match(source.url, /^https:\/\/\S+$/, `${card.id}: source.url must be an https URL`);
      assert.match(source.retrieved, ISO_DATE, `${card.id}: source.retrieved must be YYYY-MM-DD`);
      assert.equal(source.retrieved, '2026-10-15', `${card.id}: retrieved date must match the research date`);
    }
  });

  it('only sources from the approved publisher list are used (see docs/CAREBRIDGE_KNOWLEDGE_BASE.md)', () => {
    const approvedHosts = new Set(['www.who.int', 'iris.who.int', 'www.cdc.gov', 'ayosehat.kemkes.go.id', 'keslan.kemkes.go.id', 'doi.org']);
    for (const card of cards) {
      const host = new URL(card.source.url).host;
      assert.ok(approvedHosts.has(host), `${card.id}: source host "${host}" is not in the approved list`);
    }
  });

  it('background-only sources (mhGAP, PFA 2011, NHS Every Mind Matters) are never the primary source of a card', () => {
    for (const card of cards) {
      const haystack = `${card.source.title} ${card.source.url}`.toLowerCase();
      assert.ok(!haystack.includes('mhgap'), `${card.id}: mhGAP is background only`);
      assert.ok(!haystack.includes('psychological first aid'), `${card.id}: PFA 2011 is background only`);
      assert.ok(!haystack.includes('nhs.uk'), `${card.id}: NHS Every Mind Matters is background only`);
    }
  });

  it('safety_plan cards cite the Stanley & Brown paper and state that the form is not reproduced', () => {
    for (const card of cards.filter((c) => c.topics.includes('safety_plan'))) {
      assert.ok(card.source.title.includes('Stanley'), `${card.id}: must cite Stanley & Brown`);
      assert.ok(card.source.url.startsWith('https://doi.org/10.1016/j.cbpra.2011.01.001'), `${card.id}: must cite the paper DOI`);
      assert.ok(/tidak ada .*formulir.* direproduksi|formulir/i.test(card.source.license), `${card.id}: licence note must address the form`);
    }
  });
});

describe('Self-help cards dataset: safety language', () => {
  it('contains none of the forbidden terms in user-facing text', () => {
    const hits = [];
    for (const card of cards) {
      for (const [path, text] of userFacingStrings(card)) {
        for (const term of findForbiddenTerms(text)) hits.push(`${card.id}.${path}: "${term}"`);
      }
    }
    assert.deepEqual(hits, [], `forbidden terms found:\n${hits.join('\n')}`);
  });

  it('forbidden-term matcher behaves as documented', () => {
    assert.deepEqual(findForbiddenTerms('Minum obat 5 mg sesuai dosis'), ['obat', 'mg', 'dosis']);
    assert.deepEqual(findForbiddenTerms('Pengobatan dan secure'), []);
    assert.deepEqual(findForbiddenTerms('This is a cure. Prescription medication, dose.'), ['prescription', 'medication', 'dose', 'cure']);
    assert.deepEqual(findForbiddenTerms('Ini bukan diagnosis'), ['diagnos']);
  });

  it('never promises outcomes or labels a condition', () => {
    const banned = [/pasti sembuh/i, /dijamin/i, /\bguarantee/i, /you have (depression|anxiety)/i, /kamu (mengalami|menderita) (depresi|kecemasan)/i];
    for (const card of cards) {
      for (const [path, text] of userFacingStrings(card)) {
        for (const re of banned) assert.ok(!re.test(text), `${card.id}.${path} matches ${re}`);
      }
    }
  });

  it('every card tells the reader when to seek professional or emergency help', () => {
    const cue = /(profesional|psikolog|dokter|tenaga kesehatan|fasilitas kesehatan|konselor|Puskesmas|119 ext 8|gawat darurat|IGD)/i;
    const cueEn = /(professional|psychologist|doctor|health worker|health facility|counsellor|Puskesmas|119 ext 8|emergency)/i;
    for (const card of cards) {
      assert.match(card.seekHelpWhen.id, cue, `${card.id}: seekHelpWhen.id lacks a help route`);
      assert.match(card.seekHelpWhen.en, cueEn, `${card.id}: seekHelpWhen.en lacks a help route`);
    }
  });

  it('uses the warm second person "kamu" register, never formal "Anda"', () => {
    for (const card of cards) {
      for (const [path, text] of userFacingStrings(card)) {
        if (!path.endsWith('.id') && !path.includes('.id[')) continue;
        assert.ok(!/\bAnda\b/.test(text), `${card.id}.${path} uses "Anda"`);
      }
    }
  });
});
