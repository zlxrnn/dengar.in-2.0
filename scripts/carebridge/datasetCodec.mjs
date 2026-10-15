// Protobuf + zstd codec for the CareBridge dataset (proto/carebridge/dataset.proto).
// JSON/JSONL stays the reviewed source; this module turns it into compact
// `*.pb.zst` artifacts and back. Pure functions, no I/O besides loading the schema.
import { fileURLToPath } from 'node:url';
import { zstdCompressSync, zstdDecompressSync, constants as zlib } from 'node:zlib';
import protobuf from 'protobufjs';

const PROTO_PATH = fileURLToPath(new URL('../../proto/carebridge/dataset.proto', import.meta.url));
const root = protobuf.loadSync(PROTO_PATH);

export const SelfHelpCardSet = root.lookupType('dengarin.carebridge.v1.SelfHelpCardSet');
export const EvalCaseSet = root.lookupType('dengarin.carebridge.v1.EvalCaseSet');

// "low_mood" <-> "TOPIC_LOW_MOOD", "human_support" <-> "ESCALATION_HUMAN_SUPPORT".
const toEnum = (prefix, value) => `${prefix}_${String(value).toUpperCase()}`;
const fromEnum = (prefix, value) => String(value).slice(prefix.length + 1).toLowerCase();

function enumValue(type, prefix, value) {
  const name = toEnum(prefix, value);
  const id = root.lookupEnum(type).values[name];
  if (id === undefined || id === 0) throw new Error(`Nilai ${type} tidak dikenal: ${value}`);
  return name;
}
const topic = (t) => enumValue('dengarin.carebridge.v1.Topic', 'TOPIC', t);

export function cardsToMessage(version, cards) {
  return {
    version,
    cards: cards.map((c) => ({
      id: c.id,
      topics: c.topics.map(topic),
      title: c.title,
      summary: c.summary,
      steps: c.steps,
      why: c.why,
      seekHelpWhen: c.seekHelpWhen,
      ...(c.cautions ? { cautions: c.cautions } : {}),
      source: c.source,
      evidenceNote: c.evidenceNote ?? '',
    })),
  };
}

export function messageToCards(message) {
  return message.cards.map((c) => ({
    id: c.id,
    topics: c.topics.map((t) => fromEnum('TOPIC', t)),
    title: c.title,
    summary: c.summary,
    steps: c.steps,
    why: c.why,
    seekHelpWhen: c.seekHelpWhen,
    ...(c.cautions ? { cautions: c.cautions } : {}),
    source: c.source,
    evidenceNote: c.evidenceNote,
  }));
}

export function casesToMessage(version, cases) {
  return {
    version,
    cases: cases.map((c) => ({
      id: c.id,
      lang: c.lang,
      band: enumValue('dengarin.carebridge.v1.Band', 'BAND', c.band),
      topics: c.topics.map(topic),
      input: c.input,
      expected: {
        state: c.expected.state,
        escalation: enumValue('dengarin.carebridge.v1.Escalation', 'ESCALATION', c.expected.escalation),
        concernThemes: c.expected.concernThemes ?? [],
        selfHelpTopics: (c.expected.selfHelpTopics ?? []).map(topic),
        mustNotContain: c.expected.mustNotContain ?? [],
      },
      notes: c.notes ?? '',
      reviewFlag: c.reviewFlag === true,
    })),
  };
}

export function messageToCases(message) {
  return message.cases.map((c) => ({
    id: c.id,
    lang: c.lang,
    band: fromEnum('BAND', c.band),
    topics: c.topics.map((t) => fromEnum('TOPIC', t)),
    input: c.input,
    expected: {
      state: c.expected.state,
      escalation: fromEnum('ESCALATION', c.expected.escalation),
      concernThemes: c.expected.concernThemes,
      selfHelpTopics: c.expected.selfHelpTopics.map((t) => fromEnum('TOPIC', t)),
      mustNotContain: c.expected.mustNotContain,
    },
    notes: c.notes,
    ...(c.reviewFlag ? { reviewFlag: true } : {}),
  }));
}

const TO_OBJECT = { enums: String, defaults: true, arrays: true };

/** Validates against the schema, encodes to Protobuf and compresses with zstd (level 19). */
export function encode(type, plain) {
  const problem = type.verify(type.fromObject(plain));
  if (problem) throw new Error(`Skema ${type.name} tidak valid: ${problem}`);
  const bytes = type.encode(type.fromObject(plain)).finish();
  return zstdCompressSync(bytes, { params: { [zlib.ZSTD_c_compressionLevel]: 19 } });
}

export function decode(type, compressed) {
  return type.toObject(type.decode(zstdDecompressSync(compressed)), TO_OBJECT);
}
