// Synthetic dataset runner for the Care Passport pipeline (SCRUM-43 dataset,
// SCRUM-44 escalation baseline). Companion to bench.mjs: same gateways, same
// provider wiring, same report folder.
//
//   BENCH_PASSPORT_MODELS=tokenfactory:Gemma-4-31B-IT,deepseek:deepseek-flash \
//   BENCH_PASSPORT_JSON_MODE=true \
//   node --experimental-strip-types scripts/testbench/dataset.mjs
//
// Env (all optional):
//   BENCH_PASSPORT_MODELS      "gateway:model,..." (default: tokenfactory Gemma + deepseek)
//   BENCH_PASSPORT_JSON_MODE   "true" -> response_format json_object
//   BENCH_PASSPORT_TIMEOUT_MS  per provider call (default 30000)
//   BENCH_DATASET_FILE         JSONL path (default tests/carebridge/dataset/cases.v1.jsonl)
//   BENCH_DATASET_BANDS        comma list of bands to run (default all)
//   BENCH_DATASET_LIMIT        run only the first N cases (smoke test)
//   BENCH_DATASET_DELAY_MS     pause between provider calls (default 750; 0 for mock)
//   BENCH_DATASET_RETRY_THRESHOLD  retry failed cases once when infra failure rate > this (default 0.3)
//
// Output: scripts/testbench/reports/dataset-<ts>.json (full, gitignored) and
// dataset-<ts>.summary.md (metadata only). Nothing from inputs or model output
// is ever written to stdout; keys come from the environment and are never printed.
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { runCarePassportPipeline } from '../../services/orchestrator/src/carePassportPipeline.ts';
import { createAmdProvider } from '../../services/orchestrator/src/providers/amdProvider.ts';
import { BANDS, DATASET_FILE, aggregate, buildSample, loadDataset, renderSummary } from './datasetLib.mjs';

const env = process.env;

// provider -> OpenAI-compatible /v1 root + key (same table as bench.mjs)
const GATEWAYS = {
  deepseek: { baseUrl: env.DEEPSEEK_BASE_ROOT || 'https://api.deepseek.com/v1', apiKey: env.DEEPSEEK_API_KEY },
  opencode: { baseUrl: env.OPENCODE_BASE_URL || 'https://opencode.ai/zen/v1', apiKey: env.OPENCODE_API_KEY },
  tokenfactory: { baseUrl: env.TOKENFACTORY_BASE_URL, apiKey: env.TOKENFACTORY_API_KEY },
};
const SECRETS = Object.values(GATEWAYS).map((g) => g.apiKey).filter(Boolean);

const DEFAULT_MATRIX = [`tokenfactory:${env.TOKENFACTORY_MODEL || 'Gemma-4-31B-IT'}`, `deepseek:${env.DEEPSEEK_MODEL || 'deepseek-flash'}`].join(',');

function parseMatrix(raw) {
  return raw.split(',').map((s) => s.trim()).filter(Boolean).map((entry) => {
    const i = entry.indexOf(':');
    return { gateway: entry.slice(0, i), model: entry.slice(i + 1) };
  });
}

function skipReason({ gateway, model }) {
  if (gateway === 'mock') return null;
  const gw = GATEWAYS[gateway];
  if (!gw) return `gateway tidak dikenal: ${gateway}`;
  if (!gw.apiKey) return 'API key kosong';
  if (!gw.baseUrl) return 'base URL kosong';
  if (!model) return 'model kosong';
  return null;
}

/**
 * Offline stand-in ("mock:echo") for smoke-testing the runner without keys. It
 * quotes the first clause of the story as a concern, escalates on a tiny word
 * list and asks a question for very short stories. It says nothing about
 * model quality and is never used for the baseline.
 */
function mockProvider() {
  return {
    id: 'mock:echo',
    isConfigured: () => true,
    async generate({ userPrompt }) {
      const story = userPrompt.split('<<<CERITA_PENGGUNA>>>')[1]?.split('<<<AKHIR_CERITA_PENGGUNA>>>')[0]?.trim() ?? '';
      const quote = story.split(/(?<=[.!?])\s+/)[0]?.slice(0, 120) ?? story;
      const draft = {
        version: 1,
        concerns: quote ? [{ value: 'Hal yang diceritakan', source: 'user_input', sourceQuote: quote }] : [],
        dailyImpact: [],
        duration: { value: null, source: 'unknown' },
        relevantContext: [],
        questionsForProfessional: ['Apa langkah pertama yang bisa saya coba?'],
        unknowns: ['Sejak kapan hal ini dirasakan', 'Dampak pada aktivitas harian'],
        clarificationQuestion: story.length < 80 ? 'Boleh ceritakan hal apa yang paling terasa berat belakangan ini?' : undefined,
        humanSupportSuggested: /panik|hopeless|beban|nggak keluar kamar|cannot eat|tidak makan/i.test(story),
      };
      return { rawText: JSON.stringify(draft) };
    },
  };
}

function passportProvider(entry) {
  if (entry.gateway === 'mock') return mockProvider();
  const gw = GATEWAYS[entry.gateway];
  const jsonMode = env.BENCH_PASSPORT_JSON_MODE === 'true';
  return { ...createAmdProvider({ baseUrl: gw.baseUrl, apiKey: gw.apiKey, model: entry.model, jsonMode }), id: `${entry.gateway}:${entry.model}` };
}

/** Counts calls and keeps error messages in memory only (never the prompt). */
function recordProvider(inner) {
  const record = { calls: 0, errors: [] };
  const provider = {
    id: inner.id,
    isAmd: inner.isAmd === true,
    isConfigured: () => inner.isConfigured(),
    async generate(request) {
      record.calls += 1;
      try {
        return await inner.generate(request);
      } catch (error) {
        record.errors.push(error.message);
        throw error;
      }
    },
  };
  return { provider, record };
}

async function runCase(def, inner, timeoutMs, attempt) {
  const { provider, record } = recordProvider(inner);
  const result = await runCarePassportPipeline(
    { rawText: def.input, sanitizedText: def.input, aiConsent: true },
    { providers: [provider], timeoutMs }
  );
  const sample = buildSample(def, result, record, { secrets: SECRETS, attempt });
  // Full report only (gitignored): the accepted draft, for manual audit of synthetic cases.
  if (result.passport) sample.passport = result.passport;
  if (result.clarificationQuestion) sample.clarificationQuestion = result.clarificationQuestion;
  return sample;
}

const progressMark = (s) => {
  if (s.outcome === 'no_result') return '!';
  if (s.deterministic) return 'd';
  return s.outcome === 'match' ? '.' : 'x';
};

async function runModel(entry, cases, config) {
  const id = `${entry.gateway}:${entry.model}`;
  const reason = skipReason(entry);
  if (reason) return { model: id, skipped: reason };
  const inner = passportProvider(entry);
  const delayMs = entry.gateway === 'mock' ? 0 : config.delayMs;
  const samples = [];
  process.stdout.write(`\n== ${id} (${cases.length} kasus)\n`);
  for (const def of cases) {
    const sample = await runCase(def, inner, config.timeoutMs, 1);
    samples.push(sample);
    process.stdout.write(progressMark(sample));
    if (sample.providerCalls > 0 && delayMs > 0) await sleep(delayMs);
  }
  // Token Factory is flaky (429/503/timeouts): when infra failures exceed the
  // threshold, retry exactly once and keep the first failure code on the row.
  const called = samples.filter((s) => s.providerCalls > 0);
  const infra = samples.filter((s) => s.infraFailure);
  let retried = 0;
  if (called.length > 0 && infra.length / called.length > config.retryThreshold) {
    process.stdout.write(`\n   infra failures ${infra.length}/${called.length} > ${config.retryThreshold}: mengulang sekali\n`);
    for (const failed of infra) {
      const def = cases.find((c) => c.id === failed.id);
      await sleep(Math.max(delayMs, 2000));
      const again = await runCase(def, inner, config.timeoutMs, 2);
      again.firstAttemptFailure = failed.failure;
      samples[samples.indexOf(failed)] = again;
      retried += 1;
      process.stdout.write(progressMark(again));
    }
  }
  process.stdout.write('\n');
  return { model: id, samples, retried, summary: aggregate(samples) };
}

// ---------------------------------------------------------------------------

const config = {
  timeoutMs: Number(env.BENCH_PASSPORT_TIMEOUT_MS) || 30000,
  jsonMode: env.BENCH_PASSPORT_JSON_MODE === 'true',
  // createAmdProvider reads AMD_MAX_TOKENS (default 1024); recorded so runs are comparable.
  maxTokens: Number(env.AMD_MAX_TOKENS) || 1024,
  delayMs: env.BENCH_DATASET_DELAY_MS === undefined ? 750 : Number(env.BENCH_DATASET_DELAY_MS) || 0,
  retryThreshold: Number(env.BENCH_DATASET_RETRY_THRESHOLD) || 0.3,
};
const datasetFile = env.BENCH_DATASET_FILE ? new URL(env.BENCH_DATASET_FILE, `file://${process.cwd()}/`) : DATASET_FILE;
const loaded = await loadDataset(datasetFile);
let cases = loaded.cases;
if (env.BENCH_DATASET_BANDS) {
  const wanted = env.BENCH_DATASET_BANDS.split(',').map((s) => s.trim()).filter((b) => BANDS.includes(b));
  cases = cases.filter((c) => wanted.includes(c.band));
}
if (env.BENCH_DATASET_LIMIT) cases = cases.slice(0, Number(env.BENCH_DATASET_LIMIT));

const matrix = parseMatrix(env.BENCH_PASSPORT_MODELS || DEFAULT_MATRIX);
const report = {
  startedAt: new Date().toISOString(),
  dataset: { file: datasetFile.pathname.replace(/^.*\/(tests\/.*)$/, '$1'), count: cases.length, sha256: loaded.sha256 },
  config,
  models: [],
};
console.log(`Dataset: ${report.dataset.count} kasus, model: ${matrix.map((m) => `${m.gateway}:${m.model}`).join(', ')}, timeout ${config.timeoutMs} ms`);

for (const entry of matrix) report.models.push(await runModel(entry, cases, config));
report.finishedAt = new Date().toISOString();

// Metadata-only console table (ids and counts, never text).
for (const m of report.models) {
  if (m.skipped) { console.log(`${m.model}: SKIP (${m.skipped})`); continue; }
  console.log(`\n${m.model}`);
  console.table(
    Object.entries(m.summary).map(([band, r]) => ({
      band, n: r.n, calls: r.modelCalls, fail: r.providerFailures, invalid: r.invalidOutput,
      esc_rate: r.escalationRatePct === null ? '-' : `${r.escalationRatePct}%`,
      false_esc: `${r.falseEscalation}/${r.falseEscalationOf}`, missed_esc: `${r.missedEscalation}/${r.missedEscalationOf}`,
      state_match: `${r.stateMatch}/${r.semantic}`, p50_ms: r.p50Ms,
    }))
  );
}

const outDir = new URL('./reports/', import.meta.url);
await mkdir(outDir, { recursive: true });
const stamp = report.startedAt.replace(/[:.]/g, '-');
const file = new URL(`dataset-${stamp}.json`, outDir);
await writeFile(file, JSON.stringify(report, null, 2));
const summary = new URL(`dataset-${stamp}.summary.md`, outDir);
await writeFile(summary, renderSummary(report));
console.log(`\nLaporan: ${file.pathname}\nRingkasan (metadata saja, aman untuk Jira): ${summary.pathname}`);
