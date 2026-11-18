import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { withAuditResourcePreview } from './audit-resource-preview.mjs';
import { selectClassroomSection } from './p9-journey-helpers-current.mjs';

test('student summary remains visible, keyboard reachable and stable after a roster refresh', { timeout: 330000 }, async () => {
  await mkdir('.test-artifacts/browser-alignment', { recursive: true });
  await withAuditResourcePreview(async ({ origin }) => {
    const browser = await chromium.launch({ headless: true, channel: 'chromium' });
    let page, geometry;
    const pending = new Map(), failures = [], errors = [];
    try {
      page = await browser.newPage({ viewport: { width: 894, height: 486 } });
      page.on('request', request => pending.set(request, { method: request.method(), path: new URL(request.url()).pathname }));
      page.on('requestfinished', request => pending.delete(request));
      page.on('requestfailed', request => { failures.push({ ...pending.get(request), error: request.failure()?.errorText }); pending.delete(request); });
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${origin}/?scenario=summary`, { waitUntil: 'domcontentloaded' });
      await page.locator('[data-qa-fixture="true"]').waitFor();
      await page.waitForFunction(() => document.fonts.status === 'loaded');
      assert.equal(await page.evaluate(() => !!document.querySelector('[data-qa-fixture="true"]')), true, 'Synthetic fixture required');
      await page.evaluate(() => window.scrollTo(0, 500));
      await selectClassroomSection(page, 'members', 'Estudiantes');
      await page.locator('[data-open-summary]').first().waitFor();
      geometry = await page.evaluate(() => {
        const button = document.querySelector('[data-open-summary]'), r = button.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        const navigation = hit?.closest('nav'), style = navigation ? getComputedStyle(navigation) : null;
        return { top: r.top, bottom: r.bottom, height: innerHeight, hit: hit?.tagName, hitText: hit?.textContent?.trim(), hitClass: hit?.className,
          coveringNavigation: navigation ? { label: navigation.getAttribute('aria-label'), className: navigation.className, position: style.position, inset: style.inset, width: style.width } : null,
          reachable: hit === button || button.contains(hit) };
      });
      assert.ok(geometry.top >= 0 && geometry.bottom <= geometry.height && geometry.reachable,
        `Student summary covered after tab change: ${JSON.stringify(geometry)}`);
      const mobileSections = page.getByRole('combobox', { name: 'Sección del aula', exact: true });
      if (await mobileSections.isVisible()) await mobileSections.focus();
      else await page.getByRole('navigation', { name: 'Secciones del aula', exact: true }).getByRole('button', { name: 'Estudiantes', exact: true }).focus();
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
      await page.locator('[data-open-summary]').first().click();
      await page.getByRole('heading', { name: 'Ada Prueba', exact: true }).waitFor();
      await page.getByRole('button', { name: 'Dar de baja del aula', exact: true }).click();
      await page.getByRole('dialog', { name: 'Dar de baja del aula', exact: true }).getByRole('button', { name: 'Confirmar', exact: true }).click();
      await page.waitForFunction(() => window.auditFixture.removalPending === true);
      await page.evaluate(() => window.scrollTo(0, 500));
      assert.ok(await page.evaluate(() => window.scrollY > 0), 'The roster refresh must be tested after scrolling');
      await page.evaluate(() => window.auditControl.releaseRemoval());
      await page.waitForFunction(() => document.querySelectorAll('[data-open-summary]').length === 2);
      await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.equal(await page.evaluate(() => window.__summaryScrollCalls), 0,
        'A roster refresh must not recenter the summary while already in Estudiantes');
      const boundaryEvidence = [];
      for (const width of [800, 801, 1023, 1024]) {
        await page.setViewportSize({ width, height: 486 });
        for (const [key, label] of [['plan', 'Plan'], ['members', 'Estudiantes']]) {
          const mobile = page.getByRole('combobox', { name: 'Sección del aula', exact: true });
          if (await mobile.isVisible()) { await mobile.focus(); assert.equal(await mobile.evaluate(node => node === document.activeElement), true); await mobile.selectOption(key); }
          else {
            const button = page.getByRole('navigation', { name: 'Secciones del aula', exact: true }).getByRole('button', { name: label, exact: true });
            await button.focus(); assert.equal(await button.evaluate(node => node === document.activeElement), true); await button.press('Enter');
          }
          await page.locator(`[data-classroom-tab="${key}"]`).waitFor();
        }
        const summary = page.locator('[data-open-summary]').first();
        await summary.scrollIntoViewIfNeeded(); await summary.focus();
        const observed = await summary.evaluate(button => {
          const box = button.getBoundingClientRect(), hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
          return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: innerWidth, height: innerHeight,
            focused: document.activeElement === button, reachable: hit === button || button.contains(hit) };
        });
        assert.equal(observed.focused, true); assert.equal(observed.reachable, true, JSON.stringify({ width, ...observed }));
        assert.ok(observed.left >= 0 && observed.right <= width && observed.top >= 0 && observed.bottom <= 486);
        boundaryEvidence.push({ width, ...observed });
        await page.screenshot({ path: `.test-artifacts/browser-alignment/summary-boundary-${width}.png` });
      }
      const cssEvidence = [];
      for (const width of [768, 1280]) {
        await page.setViewportSize({ width, height: 486 });
        const comparison = await page.evaluate(() => {
          const matches = [];
          const inspect = (rules, media = '') => { for (const rule of rules) {
            if (rule.selectorText?.replace(/["']/g, '').replace(/\s*>\s*/g, '>') === '.fm3d-theme .fm-home-navigation[data-private=true]>.fm3d-shell-nav'
              && /min-width:\s*801px/.test(media)) matches.push(rule);
            if (rule.cssRules) inspect(rule.cssRules, `${media} ${rule.conditionText ?? ''}`);
          } };
          for (const sheet of document.styleSheets) inspect(sheet.cssRules);
          if (matches.length !== 1) throw new Error(`Expected one canonical sidebar navigation rule, found ${matches.length}`);
          const rule = matches[0], node = document.querySelector('header.fm3d-shell > nav.fm3d-shell-nav');
          const snapshot = () => { const style = getComputedStyle(node), box = node.getBoundingClientRect(); return {
            position: style.position, inset: style.inset, display: style.display, width: style.width, height: style.height,
            left: box.left, right: box.right, top: box.top, bottom: box.bottom,
          }; };
          const before = snapshot(), saved = ['position', 'inset'].map(name => ({ name, value: rule.style.getPropertyValue(name), priority: rule.style.getPropertyPriority(name) }));
          let without;
          try { for (const property of saved) rule.style.removeProperty(property.name); without = snapshot(); }
          finally { for (const property of saved) rule.style.setProperty(property.name, property.value, property.priority); }
          return { before, without, restored: snapshot(), properties: saved };
        });
        assert.deepEqual(comparison.properties.map(({ name, value }) => ({ name, value })), [{ name: 'position', value: 'static' }, { name: 'inset', value: 'auto' }]);
        assert.deepEqual(comparison.without, comparison.before, `Two navigation declarations do not alter CSSOM at ${width}`);
        assert.deepEqual(comparison.restored, comparison.before);
        cssEvidence.push({ width, ...comparison });
      }
      await writeFile('.test-artifacts/browser-alignment/summary-boundaries-and-cssom.json', JSON.stringify({ originalViewport: { width: 894, height: 486 }, originalGeometry: geometry, boundaryEvidence, cssEvidence }, null, 2));
    } catch (error) {
      await mkdir('.test-artifacts/browser-alignment', { recursive: true });
      await writeFile('.test-artifacts/browser-alignment/student-summary-diagnostic.json', JSON.stringify({ geometry, pending: [...pending.values()], failures, errors }, null, 2));
      await page?.screenshot({ path: '.test-artifacts/browser-alignment/student-summary-failure.png', fullPage: true }).catch(() => {});
      throw error;
    } finally { await browser.close(); }
  });
});
