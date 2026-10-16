import { test } from 'node:test';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const origin = process.env.QA_BASE_URL ?? 'http://127.0.0.1:3220';

for (const width of [390, 768]) {
  for (const lang of ['id', 'en']) {
   for (const textScale of [100, 140]) {
    test(`first-visit warning takes focus from the menu (${width}px/${lang}/${textScale}%)`, async () => {
      const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE || undefined });
      try {
        const page = await browser.newPage({ viewport: { width, height: 844 } });
        page.setDefaultTimeout(10_000);
        // Deterministically reproduce clicking Menu within the warning's 600ms delay.
        await page.addInitScript((scale) => {
          localStorage.setItem('dengarin:aksesibilitas', JSON.stringify({ textScale: scale }));
          const original = window.setTimeout.bind(window);
          const waiting = [];
          window.setTimeout = (callback, delay, ...args) => {
            if (delay === 600 && typeof callback === 'function') {
              waiting.push(() => callback(...args));
              return original(() => {}, 60_000);
            }
            return original(callback, delay, ...args);
          };
          window.__showFirstVisitWarning = () => waiting.splice(0).forEach((callback) => callback());
        }, textScale);
        await page.context().addCookies([{ name: 'dengarin-lang', value: lang, url: origin }]);
        await page.goto(origin);
        const trigger = page.locator('button[aria-controls="menu-seluler"]');
        await trigger.click();
        await page.locator('#menu-seluler').waitFor();
        await page.evaluate(() => window.__showFirstVisitWarning());
        const warning = page.getByRole('alertdialog');
        await warning.waitFor();
        assert.equal(await warning.evaluate((node) => Boolean(node.closest('[inert]'))), false,
          'a visible warning must never inherit inert from the background');
        await page.locator('#menu-seluler').waitFor({ state: 'detached' });
        assert.equal(await warning.evaluate((node) => node.contains(document.activeElement)), true);
        await page.keyboard.press('Tab');
        await page.keyboard.press('Shift+Tab');
        assert.equal(await warning.evaluate((node) => node.contains(document.activeElement)), true);
        await page.keyboard.press('Escape');
        await warning.waitFor({ state: 'detached' });
        assert.equal(new URL(page.url()).pathname, '/');
        assert.equal(await trigger.evaluate((node) => node === document.activeElement), true);
        assert.equal(await page.locator('main').evaluate((node) => Boolean(node.closest('[inert]'))), false);
        assert.equal(await page.evaluate(() => document.body.style.overflow), '');
      } finally { await browser.close(); }
    });
  }
}
}
