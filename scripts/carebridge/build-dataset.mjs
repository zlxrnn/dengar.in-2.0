// Builds compact Protobuf + zstd artifacts from the reviewed CareBridge dataset JSON.
//
//   npm run dataset:build
//
// Writes tests/carebridge/dataset/*.pb.zst and a manifest with sizes and SHA-256.
// tests/carebridge/datasetArtifacts.test.mjs fails if an artifact is stale.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { EvalCaseSet, SelfHelpCardSet, casesToMessage, cardsToMessage, encode } from './datasetCodec.mjs';

const dir = fileURLToPath(new URL('../../tests/carebridge/dataset/', import.meta.url));

export const ARTIFACTS = [
  {
    source: 'self_help_cards.v1.json',
    artifact: 'self_help_cards.v1.pb.zst',
    type: SelfHelpCardSet,
    read: (text) => cardsToMessage('v1', JSON.parse(text)),
  },
  {
    source: 'cases.v1.jsonl',
    artifact: 'cases.v1.pb.zst',
    type: EvalCaseSet,
    read: (text) => casesToMessage('v1', text.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l))),
  },
];

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

if (import.meta.url === `file://${process.argv[1]}`) {
  const manifest = { schema: 'proto/carebridge/dataset.proto', artifacts: [] };
  for (const a of ARTIFACTS) {
    const sourcePath = `${dir}${a.source}`;
    if (!existsSync(sourcePath)) {
      console.log(`lewati ${a.source} (belum ada)`);
      continue;
    }
    const raw = readFileSync(sourcePath);
    const packed = encode(a.type, a.read(raw.toString('utf8')));
    writeFileSync(`${dir}${a.artifact}`, packed);
    manifest.artifacts.push({
      source: a.source,
      artifact: a.artifact,
      sourceBytes: raw.length,
      artifactBytes: packed.length,
      sourceSha256: sha256(raw),
      artifactSha256: sha256(packed),
    });
    console.log(`${a.source} ${raw.length} B -> ${a.artifact} ${packed.length} B (${Math.round((packed.length / raw.length) * 100)}%)`);
  }
  writeFileSync(`${dir}manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
}
