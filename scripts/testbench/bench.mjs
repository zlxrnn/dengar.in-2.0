// Local LLM test bench (docs/TESTBENCH.md).
//
// Runs the REAL orchestrator and Care Passport pipelines against every model
// in the matrix, one model per run, so their outputs cross the same validator
// and guardrails as production. Optionally smoke-tests a running web container.
//
//   node --experimental-strip-types scripts/testbench/bench.mjs [chat|passport|web|all]
//
// Keys come from the environment only and are never printed.
import { mkdir, writeFile } from 'node:fs/promises';
import { runOrchestrator, runCarePassportPipeline } from '../../services/orchestrator/src/orchestrator.ts';
import { createDeepseekProvider } from '../../services/orchestrator/src/providers/deepseekProvider.ts';
import { createAmdProvider } from '../../services/orchestrator/src/providers/amdProvider.ts';
import { GOLDEN_CASES } from '../../tests/carebridge/fixtures.mjs';

const env = process.env;

// provider -> OpenAI-compatible /v1 root + key
const GATEWAYS = {
  deepseek: { baseUrl: env.DEEPSEEK_BASE_ROOT || 'https://api.deepseek.com/v1', apiKey: env.DEEPSEEK_API_KEY },
  opencode: { baseUrl: env.OPENCODE_BASE_URL || 'https://opencode.ai/zen/v1', apiKey: env.OPENCODE_API_KEY },
  tokenfactory: { baseUrl: env.TOKENFACTORY_BASE_URL, apiKey: env.TOKENFACTORY_API_KEY },
};

// "gateway:model,gateway:model"
const DEFAULT_MATRIX = [
  `deepseek:${env.DEEPSEEK_MODEL || 'deepseek-flash'}`,
  `opencode:${env.OPENCODE_NEMOTRON_MODEL || 'nemotron-3.5-lightning-free'}`,
  `opencode:${env.OPENCODE_GLM_MODEL || 'glm-5.3-flash'}`,
  `tokenfactory:${env.TOKENFACTORY_MODEL || 'Gemma-4-31B-IT'}`,
].join(',');

function parseMatrix(raw) {
  return raw.split(',').map((s) => s.trim()).filter(Boolean).map((entry) => {
    const i = entry.indexOf(':');
    return { gateway: entry.slice(0, i), model: entry.slice(i + 1) };
  });
}

function skipReason({ gateway, model }) {
  const gw = GATEWAYS[gateway];
  if (!gw) return `gateway tidak dikenal: ${gateway}`;
  if (!gw.apiKey) return 'API key kosong';
  if (!gw.baseUrl) return 'base URL kosong';
  if (!model) return 'model kosong';
  return null;
}

function chatProvider({ gateway, model }) {
  const gw = GATEWAYS[gateway];
  const base = gw.baseUrl.replace(/\/+$/, '');
  return { ...createDeepseekProvider(gw.apiKey, model, `${base}/chat/completions`), id: `${gateway}:${model}` };
}

function passportProvider({ gateway, model }) {
  const gw = GATEWAYS[gateway];
  const jsonMode = env.BENCH_PASSPORT_JSON_MODE === 'true';
  return { ...createAmdProvider({ baseUrl: gw.baseUrl, apiKey: gw.apiKey, model, jsonMode }), id: `${gateway}:${model}` };
}

const CHAT_SCENARIOS = [
  { id: 'id-kampus', lang: 'id', domain: 'campus', message: 'Aku kewalahan sama tugas kuliah, tiap malam susah tidur mikirin deadline.' },
  { id: 'id-kerja', lang: 'id', domain: 'workplace', message: 'Atasan sering marah di depan tim, aku jadi takut berangkat kerja.' },
  { id: 'id-keluarga', lang: 'id', domain: 'general', message: 'Orang tuaku sering bertengkar dan aku capek dengar mereka.' },
  { id: 'en-lonely', lang: 'en', domain: 'general', message: "I moved to a new city and I feel lonely, I don't know how to make friends." },
  { id: 'en-exam', lang: 'en', domain: 'campus', message: 'My exams are next week and I keep procrastinating, then I feel guilty.' },
];

const pct = (n, d) => (d === 0 ? '-' : `${Math.round((n / d) * 100)}%`);
const median = (xs) => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

// Production limits (15 s per provider, 18 s per turn) unless BENCH_CHAT_TIMEOUT_MS
// raises both, to measure how slow a model really is.
function chatBudget() {
  const ms = Number(env.BENCH_CHAT_TIMEOUT_MS);
  return Number.isFinite(ms) && ms > 0 ? { timeoutMs: ms, turnBudgetMs: ms } : {};
}

async function benchChat(matrix) {
  const rows = [];
  const details = [];
  for (const entry of matrix) {
    const id = `${entry.gateway}:${entry.model}`;
    const reason = skipReason(entry);
    if (reason) { rows.push({ model: id, status: `SKIP (${reason})` }); continue; }
    const provider = chatProvider(entry);
    const latencies = [];
    let ok = 0;
    for (const sc of CHAT_SCENARIOS) {
      const started = Date.now();
      const result = await runOrchestrator(
        { message: sc.message, domain: sc.domain, lang: sc.lang },
        { providers: [provider], enableDebiaser: false, ...chatBudget() }
      );
      const ms = Date.now() - started;
      const passed = result.tier !== 'fallback';
      if (passed) { ok += 1; latencies.push(ms); }
      details.push({ model: id, scenario: sc.id, ms, tier: result.tier, action: result.action.action, message: result.action.message, warnings: result.warnings });
      process.stdout.write(passed ? '.' : 'x');
    }
    rows.push({ model: id, status: 'RUN', valid: `${ok}/${CHAT_SCENARIOS.length}`, rate: pct(ok, CHAT_SCENARIOS.length), p50_ms: median(latencies) });
  }
  process.stdout.write('\n');
  return { rows, details };
}

async function benchPassport(matrix) {
  const cases = GOLDEN_CASES.filter((c) => !c.providerFailure);
  const rows = [];
  const details = [];
  for (const entry of matrix) {
    const id = `${entry.gateway}:${entry.model}`;
    const reason = skipReason(entry);
    if (reason) { rows.push({ model: id, status: `SKIP (${reason})` }); continue; }
    const provider = passportProvider(entry);
    let stateMatch = 0;
    let dropped = 0;
    const latencies = [];
    for (const c of cases) {
      const result = await runCarePassportPipeline(
        { rawText: c.input, sanitizedText: c.input, aiConsent: true },
        { providers: [provider], timeoutMs: Number(env.BENCH_PASSPORT_TIMEOUT_MS) || 30000 }
      );
      const match = result.state === c.expected.state;
      if (match) stateMatch += 1;
      dropped += result.droppedClaims ?? 0;
      if (result.provenance?.latencyMs) latencies.push(result.provenance.latencyMs);
      details.push({ model: id, case: c.id, expected: c.expected.state, got: result.state, droppedClaims: result.droppedClaims, warnings: result.warnings });
      process.stdout.write(match ? '.' : 'x');
    }
    rows.push({ model: id, status: 'RUN', state_match: `${stateMatch}/${cases.length}`, dropped_claims: dropped, p50_ms: median(latencies) });
  }
  process.stdout.write('\n');
  return { rows, details };
}

async function benchWeb() {
  const base = (env.BENCH_WEB_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const checks = [];
  const timed = async (name, fn) => {
    const started = Date.now();
    try { checks.push({ check: name, ...(await fn()), ms: Date.now() - started }); }
    catch (error) { checks.push({ check: name, ok: false, note: error.message, ms: Date.now() - started }); }
  };
  await timed('GET /api/health', async () => {
    const res = await fetch(`${base}/api/health`);
    const body = await res.json();
    return { ok: res.ok && body.ok === true, note: `redis=${body.redis}` };
  });
  for (const sc of CHAT_SCENARIOS.slice(0, 2)) {
    await timed(`POST /api/chat (${sc.id})`, async () => {
      const res = await fetch(`${base}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: sc.message, lang: sc.lang, domain: sc.domain }),
      });
      const body = await res.json().catch(() => ({}));
      const data = body.data ?? body;
      return { ok: res.ok, note: `status=${res.status} tier=${data.tier ?? '?'} provider=${data.providerId ?? '?'}` };
    });
  }
  return { rows: checks, details: [] };
}

const mode = process.argv[2] || 'all';
const matrix = parseMatrix(env.BENCH_MODELS || DEFAULT_MATRIX);
const passportMatrix = parseMatrix(env.BENCH_PASSPORT_MODELS || env.BENCH_MODELS || DEFAULT_MATRIX);
const report = { startedAt: new Date().toISOString(), mode };

if (mode === 'chat' || mode === 'all') {
  const budget = chatBudget().timeoutMs ? `batas ${chatBudget().timeoutMs} ms` : 'batas produksi';
  console.log(`\n== Chat orchestrator (${CHAT_SCENARIOS.length} skenario, debiaser off, ${budget})`);
  report.chat = await benchChat(matrix);
  console.table(report.chat.rows);
}
if (mode === 'passport' || mode === 'all') {
  console.log('\n== Care Passport (golden cases)');
  report.passport = await benchPassport(passportMatrix);
  console.table(report.passport.rows);
}
if (mode === 'web' || mode === 'all') {
  console.log('\n== Web smoke');
  report.web = await benchWeb();
  console.table(report.web.rows);
}

// Metadata-only summary, safe to paste into Jira: no prompts, user text or model output.
function warningCode(warnings = []) {
  const w = warnings[0] ?? '';
  const status = w.match(/status (\d{3})/);
  if (status) return `http_${status[1]}`;
  if (/tidak merespons|aborted/i.test(w)) return 'timeout';
  if (/tidak mengembalikan konten/i.test(w)) return 'empty_content';
  if (/JSON tidak valid|tidak valid/i.test(w)) return 'invalid_output';
  return w ? w.replace(/[^a-z_]/gi, '').slice(0, 24) || 'other' : '';
}

function mdTable(rows) {
  if (!rows?.length) return '';
  const cols = Object.keys(Object.assign({}, ...rows));
  return [`| ${cols.join(' | ')} |`, `|${cols.map(() => '---').join('|')}|`,
    ...rows.map((r) => `| ${cols.map((c) => r[c] ?? '').join(' | ')} |`)].join('\n');
}

function summaryMarkdown() {
  const lines = [`# Test bench ${report.startedAt} (mode ${mode})`, ''];
  if (report.chat) {
    lines.push('## Chat', mdTable(report.chat.rows), '');
    const fails = report.chat.details.filter((d) => d.tier === 'fallback')
      .map((d) => ({ model: d.model, scenario: d.scenario, ms: d.ms, code: warningCode(d.warnings) }));
    if (fails.length) lines.push('Gagal (kode):', mdTable(fails), '');
  }
  if (report.passport) {
    lines.push('## Care Passport', mdTable(report.passport.rows), '',
      mdTable(report.passport.details.map((d) => ({ model: d.model, case: d.case, expected: d.expected, got: d.got, droppedClaims: d.droppedClaims, code: warningCode(d.warnings) }))), '');
  }
  if (report.web) lines.push('## Web smoke', mdTable(report.web.rows), '');
  return lines.join('\n');
}

const outDir = new URL('./reports/', import.meta.url);
await mkdir(outDir, { recursive: true });
const stamp = report.startedAt.replace(/[:.]/g, '-');
const file = new URL(`bench-${stamp}.json`, outDir);
await writeFile(file, JSON.stringify(report, null, 2));
const summary = new URL(`bench-${stamp}.summary.md`, outDir);
await writeFile(summary, summaryMarkdown());
console.log(`\nLaporan: ${file.pathname}\nRingkasan (metadata saja, aman untuk Jira): ${summary.pathname}`);
