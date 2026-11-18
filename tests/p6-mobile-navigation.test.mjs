import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';
import { account, api } from './p4-integration-helpers.mjs';
import { classroom } from './p6-integration-helpers.mjs';
import { visibleNavigation } from './entry-glass-browser-helpers.mjs';

test('mobile notification opening and responsive reflow reveal the active classroom tab', { timeout: 120000 }, async () => {
  await withP4IntegrationRuntime(async runtime => {
    const browser = await chromium.launch({ headless: true });
    try {
      const teacher = await (await browser.newContext()).newPage();
      const student = await (await browser.newContext({ viewport: { width: 320, height: 900 } })).newPage();
      const suffix = Date.now();
      await account(teacher, runtime.origin, runtime.inbox, `mobile-teacher-${suffix}@example.test`, undefined, 'teacher');
      await account(student, runtime.origin, runtime.inbox, `mobile-student-${suffix}@example.test`, undefined, 'student');
      const room = await classroom(teacher, student, 'Mobile notification classroom');
      const detail = (await api(teacher, 'GET', `/classrooms/${room.id}`)).body;
      assert.equal((await api(teacher, 'POST', `/classrooms/${room.id}/wall`, {
        revision: detail.revision, operation: { action: 'publish', body: 'A notice opened from a mobile notification' },
      })).status, 200);
      await student.goto(`${runtime.origin}/mis-aulas`);
      await visibleNavigation(student);
      await student.locator('a[href="/notificaciones"]:visible').click();
      const notice = student.getByRole('region', { name: 'Tu bandeja de notificaciones', exact: true })
        .getByRole('article').filter({ has: student.getByRole('heading', { name: 'Nuevo aviso del docente', exact: true }) });
      await notice.getByRole('button', { name: 'Ir al muro', exact: true }).click();
      await student.getByRole('region', { name: 'Muro del aula', exact: true }).waitFor();
      await student.getByText('A notice opened from a mobile notification', { exact: true }).waitFor();
      await mkdir('.test-artifacts/p6-integration', { recursive: true });
      for (const width of [320, 375, 1280, 320]) {
        await student.setViewportSize({ width, height: 900 });
        await student.waitForFunction(() => {
          const mobile = document.querySelector('select[aria-label="Sección del aula"]');
          if (mobile?.getClientRects().length) {
            const bounds = mobile.getBoundingClientRect();
            return mobile.value === 'wall' && mobile.selectedOptions[0]?.textContent === 'Muro'
              && bounds.left >= 0 && bounds.right <= innerWidth;
          }
          const nav = document.querySelector('nav[aria-label="Secciones del aula"]');
          const active = nav?.querySelector('[aria-current="page"]');
          if (!nav || !active) return false;
          const n = nav.getBoundingClientRect(), a = active.getBoundingClientRect();
          return active.textContent === 'Muro' && a.left >= n.left && a.right <= n.right
            && a.left >= 0 && a.right <= innerWidth;
        });
        assert.equal(await student.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      }
      await student.screenshot({ path: '.test-artifacts/p6-integration/mobile-notification-wall-320.png', fullPage: true });
    } finally { await browser.close(); }
  }, { classrooms: true });
});
