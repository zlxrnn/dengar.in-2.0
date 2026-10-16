import { createServer } from 'node:http';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Private, disposable staging network only. Never log request bodies or keys.
if (process.argv[2] === 'proxy') {
  let mode = '503';
  let calls = 0;
  let upstreamStatus = null;
  createServer(async (req, res) => {
    if (req.url === '/control') {
      let body = ''; for await (const chunk of req) body += chunk;
      mode = JSON.parse(body).mode; calls = 0; upstreamStatus = null;
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{}'); return;
    }
    if (req.url === '/stats') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ calls, upstreamStatus })); return;
    }
    calls++;
    if (mode === 'hang') return;
    if (mode === '401' || mode === 'badmodel') {
      let body = ''; for await (const chunk of req) body += chunk;
      const payload = JSON.parse(body);
      if (mode === 'badmodel') payload.model = 'nonexistent-scrum33-model';
      try {
        const upstream = await fetch(process.env.AMD_BASE_URL + '/chat/completions', {
          method: 'POST', headers: { 'Content-Type': 'application/json',
            Authorization: `Bearer ${mode === '401' ? 'invalid-synthetic-scrum33-key' : process.env.AMD_API_KEY}` },
          body: JSON.stringify(payload), signal: AbortSignal.timeout(15000),
        });
        upstreamStatus = upstream.status;
        // Preserve actual upstream status, discard potentially sensitive provider body.
        res.writeHead(upstream.status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'controlled upstream failure' } }));
      } catch {
        res.writeHead(502); res.end('{}');
      }
      return;
    }
    res.writeHead(Number(mode), { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: { message: 'synthetic hosted fault' } }));
  }).listen(8080, '0.0.0.0');
} else {
  const proxy = 'http://dengarin-qa-scrum33-proxy:8080';
  const app = 'http://dengarin-qa-scrum33-web:3000';
  const text = 'Data sintetis: tugas belajar menumpuk dan saya ingin mengatur istirahat.';
  const scenarios = [
    ['actual-invalid-key', '401', text, true, 'PROVIDER_UNAVAILABLE'],
    ['actual-invalid-model', 'badmodel', text, true, 'PROVIDER_UNAVAILABLE'],
    ['injected-429', '429', text, true, 'PROVIDER_UNAVAILABLE'],
    ['injected-503', '503', text, true, 'PROVIDER_UNAVAILABLE'],
    ['hang-timeout', 'hang', text, true, 'PROVIDER_UNAVAILABLE'],
    ['crisis-no-provider', 'hang', 'Aku ingin mengakhiri hidupku malam ini.', true, 'IMMEDIATE_HELP_SCREEN'],
    ['declined-consent-no-provider', 'hang', text, false, 'PROVIDER_UNAVAILABLE'],
  ];
  const rows = [], startedAt = new Date().toISOString();
  for (const [id, mode, input, consent, expected] of scenarios) {
    await fetch(proxy + '/control', { method: 'POST', body: JSON.stringify({ mode }) });
    const start = Date.now();
    const response = await fetch(app + '/api/care-passport', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: input, aiConsent: consent }), signal: AbortSignal.timeout(25000),
    });
    const body = await response.json(), result = (body.data ?? body).result;
    const { calls, upstreamStatus } = await (await fetch(proxy + '/stats')).json();
    const gate = id.includes('no-provider');
    const row = { id, http: response.status, state: result?.state, providerId: result?.provenance?.providerId,
      isAmd: result?.provenance?.isAmd, isFallback: result?.provenance?.isFallback,
      calls, upstreamStatus, ms: Date.now() - start, passportPresent: !!result?.passport,
      pass: response.status === 200 && result?.state === expected && result?.provenance?.providerId === 'none'
        && result?.provenance?.isAmd === false && !result?.passport && calls === (gate ? 0 : 1)
        && (mode !== '401' || upstreamStatus === 401)
        && (mode !== 'badmodel' || [400, 404].includes(upstreamStatus)) };
    rows.push(row); console.log(JSON.stringify(row));
  }
  await writeFile('/qa/report.json', JSON.stringify({ startedAt, finishedAt: new Date().toISOString(), rows,
    limits: 'Disposable VPS staging using deployed app image. 401 and invalid model contact real AMD; 429/503/hang are injected. Production configuration untouched.' }, null, 2));
  assert.ok(rows.every(r => r.pass), 'Hosted fault assertions failed');
}
