// Care Passport fault injection against running web containers (docs/TESTBENCH.md, SCRUM-33).
//
// Each scenario targets its own web container (started by scripts/testbench/faults.sh with a
// different AMD_* config) and records metadata only: HTTP status, state, providerId, isAmd,
// isFallback, public warnings, latency. Never prints the synthetic input or model output.
//
//   node --experimental-strip-types scripts/testbench/faults.mjs
//
// Also exports the mock server used for 429 / 503 / hang: `node faults.mjs mock`.
import { createServer } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import { GOLDEN_CASES } from '../../tests/carebridge/fixtures.mjs';

if (process.argv[2] === 'mock') {
  // /s429/v1/... -> 429, /s503/v1/... -> 503, /hang/v1/... -> never answers.
  createServer((req, res) => {
    console.log(`mock-request ${req.method} ${req.url.split('/')[1]}`);
    if (req.url.startsWith('/hang/')) return;
    const status = req.url.startsWith('/s429/') ? 429 : 503;
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: status === 429 ? 'rate limit (mock)' : 'no_available_workers (mock)' } }));
  }).listen(8080, () => console.log('mock listening on :8080'));
} else {
  const caseA = GOLDEN_CASES.find((c) => c.id === 'A').input;
  const caseC = GOLDEN_CASES.find((c) => c.id === 'C').input;

  const SCENARIOS = [
    { id: 'baseline-gemma', host: 'tf-ok', text: caseA, aiConsent: true, expect: 'READY_FOR_USER_REVIEW' },
    { id: 'key-salah-401', host: 'tf-badkey', text: caseA, aiConsent: true, expect: 'PROVIDER_UNAVAILABLE' },
    { id: 'model-salah-404', host: 'tf-badmodel', text: caseA, aiConsent: true, expect: 'PROVIDER_UNAVAILABLE' },
    { id: 'mock-429', host: 'tf-429', text: caseA, aiConsent: true, expect: 'PROVIDER_UNAVAILABLE' },
    { id: 'mock-503', host: 'tf-503', text: caseA, aiConsent: true, expect: 'PROVIDER_UNAVAILABLE' },
    // Crisis / declined consent hit the hanging mock: any provider call would show up in the
    // mock log and stall the response for 12 s.
    { id: 'hang-timeout-12s', host: 'tf-hang', text: caseA, aiConsent: true, expect: 'PROVIDER_UNAVAILABLE' },
    { id: 'krisis-case-C', host: 'tf-hang', text: caseC, aiConsent: true, expect: 'IMMEDIATE_HELP_SCREEN' },
    { id: 'consent-ditolak', host: 'tf-hang', text: caseA, aiConsent: false, expect: 'PROVIDER_UNAVAILABLE' },
  ];

  const rows = [];
  for (const sc of SCENARIOS) {
    const started = Date.now();
    let row;
    try {
      const res = await fetch(`http://${sc.host}:3000/api/care-passport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sc.text, aiConsent: sc.aiConsent }),
      });
      const body = await res.json().catch(() => ({}));
      const result = (body.data ?? body).result ?? {};
      row = {
        scenario: sc.id,
        http: res.status,
        state: result.state ?? '?',
        expected: sc.expect,
        pass: result.state === sc.expect && (sc.expect === 'READY_FOR_USER_REVIEW' || result.provenance?.isFallback === true),
        providerId: result.provenance?.providerId ?? '?',
        isAmd: result.provenance?.isAmd,
        isFallback: result.provenance?.isFallback,
        warnings: (result.warnings ?? []).join(' | ').slice(0, 80),
        ms: Date.now() - started,
      };
    } catch (error) {
      row = { scenario: sc.id, http: 'ERR', state: error.message, expected: sc.expect, pass: false, ms: Date.now() - started };
    }
    rows.push(row);
    process.stdout.write(row.pass ? '.' : 'x');
  }
  process.stdout.write('\n');
  console.table(rows);

  const outDir = new URL('./reports/', import.meta.url);
  await mkdir(outDir, { recursive: true });
  const file = new URL(`faults-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, outDir);
  await writeFile(file, JSON.stringify(rows, null, 2));
  console.log(`Laporan: ${file.pathname}`);
}
