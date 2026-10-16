import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const origin = process.env.QA_BASE_URL ?? 'http://127.0.0.1:3222';

for (const lang of ['id', 'en']) {
  for (const field of ['concerns', 'impact', 'duration', 'context', 'questions']) {
    test(`editing approved manual ${field} requires fresh review (${lang})`, async () => {
      const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
      try {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
        page.setDefaultTimeout(10_000);
        await page.addInitScript(() => {
          localStorage.setItem('dengarin_privacy_warning_dismissed', 'true');
          localStorage.setItem('dengarin_anonymous_session', JSON.stringify({ consentGiven: true, ageBracket: '18-24', id: 'synthetic-qa-session' }));
        });
        await page.context().addCookies([{ name: 'dengarin-lang', value: lang, url: origin }]);
        const apiCalls = [];
        page.on('request', (req) => { if (new URL(req.url()).pathname.startsWith('/api/')) apiCalls.push(req.url()); });
        await page.goto(`${origin}/care-passport`);
        await page.getByRole('button', { name: lang === 'id' ? 'Tidak, saya tulis sendiri' : 'No, I will write it myself', exact: true }).click();
        await page.locator('#manual-concerns').fill('Catatan sintetis pertama.');
        const review = page.getByRole('checkbox');
        await review.click();
        assert.equal(await page.getByRole('button', { name: /\.txt$/ }).count(), 1);
        const edited = `Perubahan sintetis pada ${field}.`;
        await page.locator(`#manual-${field}`).fill(edited);
        assert.equal(await review.getAttribute('aria-checked'), 'false', 'each edit must revoke approval');
        for (const format of ['md', 'txt']) assert.equal(await page.getByRole('button', { name: new RegExp(`\\.${format}$`) }).count(), 0);
        await review.click();
        for (const format of ['md', 'txt']) {
          const [download] = await Promise.all([
            page.waitForEvent('download'),
            page.getByRole('button', { name: new RegExp(`\\.${format}$`) }).click(),
          ]);
          assert.ok((await readFile(await download.path(), 'utf8')).includes(edited));
        }
        assert.equal(apiCalls.length, 0, 'manual edits and exports stay local');
      } finally { await browser.close(); }
    });
  }
}
