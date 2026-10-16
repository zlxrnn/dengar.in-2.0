// Builds compact Protobuf + zstd artifacts from the reviewed CareBridge dataset JSON.
//
//   npm run dataset:build
//
// Sources (reviewed JSON/JSONL) live where they are consumed: the self-help
// cards in packages/config/src (runtime knowledge base since SCRUM-45), the
// evaluation cases in tests/carebridge/dataset. Artifacts and the manifest
// (sizes + SHA-256) are written to tests/carebridge/dataset/.
// tests/carebridge/datasetArtifacts.test.mjs fails if an artifact is stale.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { EvalCaseSet, SelfHelpCardSet, casesToMessage, cardsToMessage, encode } from './datasetCodec.mjs';

/** Repository root (all paths below are relative to it). */
export const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const ARTIFACT_DIR = 'tests/carebridge/dataset/';

export const ARTIFACTS = [
  {
    source: 'packages/config/src/selfHelpCards.v1.json',
    artifact: `${ARTIFACT_DIR}self_help_cards.v1.pb.zst`,
    type: SelfHelpCardSet,
    read: (text) => cardsToMessage('v1', JSON.parse(text)),
  },
  {
    source: `${ARTIFACT_DIR}cases.v1.jsonl`,
    artifact: `${ARTIFACT_DIR}cases.v1.pb.zst`,
    type: EvalCaseSet,
    read: (text) => casesToMessage('v1', text.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l))),
  },
];

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/**
 * Canonical bytes for reviewed text sources. Git stores these files with LF,
 * but Windows checkouts may materialize CRLF. Normalize line endings before
 * hashing/encoding so manifest hashes describe the committed source bytes on
 * every platform; no content, whitespace, or dataset records are otherwise
 * changed.
 */
export function canonicalizeTextSource(raw) {
  return Buffer.from(raw.toString('utf8').replace(/\r\n?/g, '\n'), 'utf8');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const manifest = { schema: 'proto/carebridge/dataset.proto', artifacts: [] };
  for (const a of ARTIFACTS) {
    const sourcePath = `${REPO_ROOT}${a.source}`;
    if (!existsSync(sourcePath)) {
      console.log(`lewati ${a.source} (belum ada)`);
      continue;
    }
    const raw = canonicalizeTextSource(readFileSync(sourcePath));
    const packed = encode(a.type, a.read(raw.toString('utf8')));
    writeFileSync(`${REPO_ROOT}${a.artifact}`, packed);
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
  writeFileSync(`${REPO_ROOT}${ARTIFACT_DIR}manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
}
