// SCRUM-47: compare metadata from two live dataset runs, paired by case id.
// Usage: node --experimental-strip-types scripts/testbench/compareCompleteness.mjs before.json after.json
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { percentile } from './datasetLib.mjs';

function indexSamples(model) {
  const rows = new Map();
  for (const sample of model.samples) {
    if (rows.has(sample.id)) throw new Error(`Duplicate case: ${sample.id}`);
    rows.set(sample.id, sample);
  }
  return rows;
}
const hasPassport = (s) => s && s.state !== 'PROVIDER_UNAVAILABLE'
  && Number.isInteger(s.completenessKnown) && s.completenessKnown >= 0 && s.completenessKnown <= 3;

export function compareCompleteness(before, after) {
  if (before.dataset.sha256 !== after.dataset.sha256 || before.dataset.count !== after.dataset.count) {
    throw new Error('Dataset hashes and counts must match');
  }
  for (const key of ['maxTokens', 'timeoutMs', 'jsonMode', 'delayMs']) {
    if (before.config[key] !== after.config[key]) throw new Error(`Config differs: ${key}`);
  }
  const models = [];
  const oldModels = new Map(before.models.map((m) => [m.model, m]));
  if (oldModels.size !== before.models.length || new Set(after.models.map((m) => m.model)).size !== after.models.length) {
    throw new Error('Duplicate model');
  }
  if (before.models.length !== after.models.length) throw new Error('Model sets must match');
  for (const next of after.models) {
    const previous = oldModels.get(next.model);
    if (!previous || next.skipped || previous.skipped) throw new Error('Both runs must contain the same live models');
    if (next.model.startsWith('mock:')) throw new Error('Mock runs cannot establish model quality');
    const a = indexSamples(previous), b = indexSamples(next);
    if (a.size !== before.dataset.count || b.size !== after.dataset.count
      || [...a.keys()].some((id) => !b.has(id))) throw new Error('Case sets must match the complete selected dataset');
    const pairs = [...a].map(([id, left]) => ({ id, before: left, after: b.get(id) }));
    for (const p of pairs) {
      if (p.before.band !== p.after.band || p.before.lang !== p.after.lang) throw new Error('Case labels differ');
    }
    const eligible = pairs.filter((p) => hasPassport(p.before) && hasPassport(p.after));
    const summarize = (rows) => {
      const knownBefore = rows.reduce((sum, p) => sum + p.before.completenessKnown, 0);
      const knownAfter = rows.reduce((sum, p) => sum + p.after.completenessKnown, 0);
      const droppedBefore = rows.reduce((sum, p) => sum + p.before.droppedClaims, 0);
      const droppedAfter = rows.reduce((sum, p) => sum + p.after.droppedClaims, 0);
      const latencyPairs = rows.filter((p) => p.before.providerCalls > 0 && p.after.providerCalls > 0
        && Number.isFinite(p.before.latencyMs) && Number.isFinite(p.after.latencyMs));
      const p50Before = percentile(latencyPairs.map((p) => p.before.latencyMs), 50);
      const p50After = percentile(latencyPairs.map((p) => p.after.latencyMs), 50);
      return { pairedCases: rows.length, knownBefore, knownAfter,
        meanKnownBefore: rows.length ? knownBefore / rows.length : null,
        meanKnownAfter: rows.length ? knownAfter / rows.length : null,
        improved: rows.filter((p) => p.after.completenessKnown > p.before.completenessKnown).length,
        regressed: rows.filter((p) => p.after.completenessKnown < p.before.completenessKnown).length,
        unchanged: rows.filter((p) => p.after.completenessKnown === p.before.completenessKnown).length,
        droppedBefore, droppedAfter, latencyPairs: latencyPairs.length, p50Before, p50After,
        latencyChangePct: p50Before > 0 ? (p50After / p50Before - 1) * 100 : null,
        targets: { completenessImproved: rows.length ? knownAfter > knownBefore : null,
          droppedClaimsNotIncreased: rows.length ? droppedAfter <= droppedBefore : null,
          latencyWithinTenPercent: p50Before > 0 ? p50After <= p50Before * 1.1 : null } };
    };
    const unavailable = (m) => m.samples.filter((s) => s.state === 'PROVIDER_UNAVAILABLE').length;
    models.push({ model: next.model, cases: pairs.length,
      unavailableBefore: unavailable(previous), unavailableAfter: unavailable(next),
      excludedCases: pairs.filter((p) => !hasPassport(p.before) || !hasPassport(p.after)).map((p) => p.id),
      all: summarize(eligible),
      bands: Object.fromEntries([...new Set(eligible.map((p) => p.before.band))].map((band) => [band, summarize(eligible.filter((p) => p.before.band === band))])),
      languages: Object.fromEntries([...new Set(eligible.map((p) => p.before.lang))].map((lang) => [lang, summarize(eligible.filter((p) => p.before.lang === lang))])) });
  }
  return { dataset: before.dataset, beforeStartedAt: before.startedAt, afterStartedAt: after.startedAt,
    beforePromptSha256: before.config.systemPromptSha256 ?? null,
    afterPromptSha256: after.config.systemPromptSha256 ?? null, models };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [beforeFile, afterFile] = process.argv.slice(2);
  if (!beforeFile || !afterFile) throw new Error('Supply before.json and after.json');
  const reports = await Promise.all([beforeFile, afterFile].map(async (f) => JSON.parse(await readFile(f, 'utf8'))));
  console.log(JSON.stringify(compareCompleteness(...reports), null, 2));
}
