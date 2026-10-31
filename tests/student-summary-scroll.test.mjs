import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { withAuditResourcePreview } from './audit-resource-preview.mjs';

test('student summary remains visible, keyboard reachable and stable after a roster refresh', { timeout: 330000 }, async () => {
  await withAuditResourcePreview(async ({ origin }) => {
    const browser = await chromium.launch({ headless: true, channel: 'chromium' });
    try {
      const page = await browser.newPage({ viewport: { width: 894, height: 486 } });
      await page.goto(`${origin}/?scenario=summary`);
      await page.getByRole('button', { name: 'Alumnos', exact: true }).waitFor();
      assert.equal(await page.evaluate(() => !!document.querySelector('[data-qa-fixture="true"]')), true, 'Synthetic fixture required');
      await page.evaluate(() => window.scrollTo(0, 500));
      await page.getByRole('button', { name: 'Alumnos', exact: true }).click();
      await page.locator('[data-open-summary]').first().waitFor();
      const geometry = await page.evaluate(() => {
        const button = document.querySelector('[data-open-summary]'), r = button.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { top: r.top, bottom: r.bottom, height: innerHeight, hit: hit?.tagName, reachable: hit === button || button.contains(hit) };
      });
      assert.ok(geometry.top >= 0 && geometry.bottom <= geometry.height && geometry.reachable,
        `Student summary covered after tab change: ${JSON.stringify(geometry)}`);
      await page.getByRole('button', { name: 'Alumnos', exact: true }).focus();
      let focused = false;
      for (let i = 0; i < 30 && !focused; i++) {
        await page.keyboard.press('Tab');
        focused = await page.evaluate(() => document.activeElement?.matches('[data-open-summary]') ?? false);
      }
      assert.equal(focused, true, 'Keyboard navigation must reach the summary');
      assert.equal(await page.evaluate(() => {
        const b = document.activeElement, r = b.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return hit === b || b.contains(hit);
      }), true, 'Focused summary must not be obscured');
      await page.evaluate(() => {
        window.auditControl.deferRemoval();
        const scroll = Element.prototype.scrollIntoView;
        window.__summaryScrollCalls = 0;
        Element.prototype.scrollIntoView = function (...args) {
          if (this.matches('[data-open-summary]')) window.__summaryScrollCalls++;
          return scroll.apply(this, args);
        };
      });
      await page.getByRole('button', { name: 'Remover', exact: true }).click();
      await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
      await page.waitForFunction(() => window.auditFixture.removalPending === true);
      await page.evaluate(() => window.scrollTo(0, 500));
      assert.ok(await page.evaluate(() => window.scrollY > 0), 'The roster refresh must be tested after scrolling');
      await page.evaluate(() => window.auditControl.releaseRemoval());
      await page.waitForFunction(() => document.querySelectorAll('[data-open-summary]').length === 2);
      await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.equal(await page.evaluate(() => window.__summaryScrollCalls), 0,
        'A roster refresh must not recenter the summary while already in Alumnos');
    } finally { await browser.close(); }
  });
});
