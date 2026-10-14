// Protobuf + zstd dataset artifacts (proto/carebridge/dataset.proto) must round-trip
// to exactly the reviewed JSON sources and must not be stale.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { ARTIFACTS, ARTIFACT_DIR, REPO_ROOT } from '../../scripts/carebridge/build-dataset.mjs';
import { SelfHelpCardSet, casesToMessage, cardsToMessage, decode, encode, messageToCases, messageToCards } from '../../scripts/carebridge/datasetCodec.mjs';

const manifest = JSON.parse(readFileSync(`${REPO_ROOT}${ARTIFACT_DIR}manifest.json`, 'utf8'));
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const toPlain = (artifact) => (artifact.endsWith('self_help_cards.v1.pb.zst') ? messageToCards : messageToCases);
const readSource = (source, text) => (source.endsWith('.jsonl') ? text.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l)) : JSON.parse(text));

describe('CareBridge dataset artifacts (Protobuf + zstd)', () => {
  it('has an artifact for every existing source', () => {
    for (const a of ARTIFACTS) {
      if (!existsSync(`${REPO_ROOT}${a.source}`)) continue;
      assert.ok(existsSync(`${REPO_ROOT}${a.artifact}`), `${a.artifact} belum dibuat: jalankan npm run dataset:build`);
    }
  });

  it('the self-help cards source is the runtime knowledge base in packages/config (SCRUM-45)', () => {
    const cards = ARTIFACTS.find((a) => a.artifact.endsWith('self_help_cards.v1.pb.zst'));
    assert.equal(cards.source, 'packages/config/src/selfHelpCards.v1.json');
    assert.ok(manifest.artifacts.some((e) => e.source === cards.source), 'manifest harus menunjuk sumber yang sama');
  });

  for (const entry of manifest.artifacts) {
    it(`${entry.artifact} is fresh and round-trips to ${entry.source}`, () => {
      const raw = readFileSync(`${REPO_ROOT}${entry.source}`);
      const packed = readFileSync(`${REPO_ROOT}${entry.artifact}`);
      assert.equal(sha256(raw), entry.sourceSha256, `${entry.source} berubah: jalankan npm run dataset:build`);
      assert.equal(sha256(packed), entry.artifactSha256);
      assert.equal(packed.subarray(0, 4).toString('hex'), '28b52ffd', 'bukan frame zstd');
      assert.ok(packed.length < raw.length, 'artefak harus lebih kecil dari sumber');

      const type = ARTIFACTS.find((a) => a.artifact === entry.artifact).type;
      const decoded = toPlain(entry.artifact)(decode(type, packed));
      assert.deepEqual(decoded, readSource(entry.source, raw.toString('utf8')));
    });
  }

  it('rejects values outside the schema vocabulary', () => {
    assert.throws(() => cardsToMessage('v1', [{ id: 'x', topics: ['bukan_topik'] }]), /tidak dikenal/);
    assert.throws(() => casesToMessage('v1', [{ id: 'x', lang: 'id', band: 'parah', topics: [], input: '', expected: { escalation: 'none' } }]), /tidak dikenal/);
  });

  it('encodes and decodes a minimal card set', () => {
    const card = {
      id: 'contoh', topics: ['sleep'], title: { id: 'a', en: 'a' }, summary: { id: 'b', en: 'b' },
      steps: { id: ['c'], en: ['c'] }, why: { id: 'd', en: 'd' }, seekHelpWhen: { id: 'e', en: 'e' },
      source: { title: 't', publisher: 'p', url: 'https://example.org', license: 'CC0', retrieved: '2026-10-15' }, evidenceNote: 'n',
    };
    assert.deepEqual(messageToCards(decode(SelfHelpCardSet, encode(SelfHelpCardSet, cardsToMessage('v1', [card])))), [card]);
  });
});
