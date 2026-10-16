import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const origin = process.env.QA_BASE_URL ?? 'http://127.0.0.1:3221';

for (const lang of ['id', 'en']) {
  for (const mode of ['local-decline', 'server-decline', 'outage']) {
    test(`manual fallback distinguishes consent from outage (${lang}/${mode})`, async () => {
      const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
      try {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
        page.setDefaultTimeout(5_000);
        page.on('pageerror', (error) => console.error('BROWSER', error.message));
        await page.addInitScript(() => {
          localStorage.setItem('dengarin_privacy_warning_dismissed', 'true');
          localStorage.setItem('dengarin_anonymous_session', JSON.stringify({ consentGiven: true, ageBracket: '18-24', id: 'synthetic-qa-session' }));
        });
        await page.context().addCookies([{ name: 'dengarin-lang', value: lang, url: origin }]);
        const requests = [];
        page.on('request', (req) => { if (new URL(req.url()).pathname.startsWith('/api/')) requests.push(req.url()); });
        // Only the provider response is simulated. Preview and redaction use the local server.
        await page.route('**/api/care-passport', (route) => route.fulfill({
          json: { ok: true, data: { kind: 'result', result: {
            state: 'PROVIDER_UNAVAILABLE',
            provenance: { providerId: 'none', isAmd: false, isFallback: true },
            droppedClaims: 0,
            warnings: mode === 'server-decline' ? ['ai_consent_declined'] : ['no_provider_configured'],
          } } },
        }));
        await page.goto(`${origin}/care-passport`);
        if (mode === 'local-decline') {
          await page.getByRole('button', { name: lang === 'id' ? 'Tidak, saya tulis sendiri' : 'No, I will write it myself', exact: true }).click();
        } else {
          await page.getByRole('checkbox').click();
          await page.getByRole('button', { name: lang === 'id' ? 'Setuju, lanjut tulis cerita' : 'Agree, go on to write my story', exact: true }).click();
          await page.locator('#cerita').fill('Aku sulit tidur karena tugas kuliah selama tiga minggu terakhir.');
          await page.getByRole('button', { name: lang === 'id' ? 'Lanjut: cek data pribadi' : 'Next: check personal data', exact: true }).click();
          await page.getByRole('button', { name: lang === 'id' ? 'Kirim dan susun catatan' : 'Send and build the notes', exact: true }).click();
        }
        const declined = mode !== 'outage';
        const title = lang === 'id'
          ? (declined ? 'Kamu menulis, kami menyiapkan kerangkanya.' : 'AI sedang tidak bisa dipakai. Kerangkanya tetap ada.')
          : (declined ? 'You write, we provide the template.' : 'AI cannot be used right now. The template is still here.');
        await page.getByRole('heading', { name: title, exact: true }).waitFor();
        const retry = page.getByRole('button', { name: lang === 'id' ? 'Coba AI lagi' : 'Try AI again', exact: true });
        assert.equal(await retry.count(), declined ? 0 : 1);
        const download = page.getByRole('button', { name: /\.txt$/ });
        assert.equal(await download.count(), 0, 'export requires explicit review');
        await page.locator('#manual-concerns').fill('Catatan sintetis: sulit tidur.');
        await page.getByRole('checkbox').click();
        const event = page.waitForEvent('download');
        await download.click();
        const file = await event;
        assert.match(await readFile(await file.path(), 'utf8'), /Catatan sintetis: sulit tidur\./);
        if (mode === 'local-decline') assert.equal(requests.length, 0, 'local refusal and export must make no API requests');
      } finally { await browser.close(); }
    });
  }
}
