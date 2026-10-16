import { test } from 'node:test';
import assert from 'node:assert/strict';

// Run against a local app; Playwright can come from an external QA install.
let chromium = null;
try {
  ({ chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright'));
} catch {
  // Gracefully skip when playwright is not installed in the local environment
}
const origin = process.env.QA_BASE_URL ?? 'http://127.0.0.1:3217';

if (!chromium) {
  test('mobile modal contains keyboard focus', { skip: 'Playwright module is not installed in local environment' }, () => {});
} else {
  for (const width of [390, 768]) {
    for (const lang of ['id', 'en']) {
      test(`mobile modal contains keyboard focus (${width}px, ${lang})`, async () => {
      const browser = await chromium.launch({
        executablePath: process.env.CHROMIUM_EXECUTABLE || undefined,
      });
      try {
        const page = await browser.newPage({ viewport: { width, height: 844 } });
        page.setDefaultTimeout(10_000);
        await page.addInitScript(() => localStorage.setItem('dengarin_privacy_warning_dismissed', 'true'));
        await page.context().addCookies([{ name: 'dengarin-lang', value: lang, url: origin }]);
        await page.goto(`${origin}/crisis`);
        const trigger = page.locator('button[aria-controls="menu-seluler"]');
        const drawer = page.locator('#menu-seluler');
        await trigger.click();
        await drawer.waitFor();
        const focusInside = () => drawer.evaluate((node) => node.contains(document.activeElement));
        assert.equal(await focusInside(), true, 'opening must focus the drawer');
        assert.equal(await page.locator('main').evaluate((node) => Boolean(node.closest('[inert]'))), true,
          'background must be inert while the modal is open');

        await page.keyboard.press('Shift+Tab');
        assert.equal(await focusInside(), true, 'Shift+Tab from first action must wrap inside');
        await page.keyboard.press('Tab');
        assert.equal(await focusInside(), true, 'Tab from last action must wrap inside');

        for (let i = 0; i < 40; i++) {
          await page.keyboard.press('Tab');
          assert.equal(await focusInside(), true, `Tab ${i + 1} escaped the modal`);
        }

        await page.keyboard.press('Escape');
        await drawer.waitFor({ state: 'hidden' });
        assert.equal(await trigger.evaluate((node) => node === document.activeElement), true);
        assert.equal(new URL(page.url()).pathname, '/crisis', 'Escape must not trigger quick exit');
        assert.equal(await page.locator('main').evaluate((node) => Boolean(node.closest('[inert]'))), false,
          'closing must restore the background');

        await trigger.click();
        await drawer.getByRole('button', { name: lang === 'id' ? 'Tutup menu lengkap' : 'Close full menu', exact: true }).click();
        await drawer.waitFor({ state: 'hidden' });
        assert.equal(await trigger.evaluate((node) => node === document.activeElement), true);

        await trigger.click();
        await page.setViewportSize({ width: 1280, height: 844 });
        await drawer.waitFor({ state: 'detached' });
        await page.waitForFunction(() => !document.querySelector('main')?.closest('[inert]'));
        assert.equal(await page.locator('main').evaluate((node) => Boolean(node.closest('[inert]'))), false,
          'switching to desktop must release the modal background');
      } finally {
        await browser.close();
      }
    });
  }
}
}
