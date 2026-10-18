import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';
import { account, api, digest } from './p4-integration-helpers.mjs';
import { classroom, openClassroom, planPdf, rejectSame } from './p6-integration-helpers.mjs';

test('P6 Plan actual sessions, production UI, private versions and persistence', { timeout: 330000 }, async t => {
  await withP4IntegrationRuntime(async runtime => {
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
      const studentPage = await (await browser.newContext()).newPage();
      const otherPage = await (await browser.newContext()).newPage();
      const suffix = Date.now();
      await account(page, runtime.origin, runtime.inbox, `p6-plan-teacher-${suffix}@example.test`);
      await account(studentPage, runtime.origin, runtime.inbox, `p6-plan-student-${suffix}@example.test`);
      await account(otherPage, runtime.origin, runtime.inbox, `p6-plan-other-${suffix}@example.test`);
      const room = await classroom(page, studentPage);
      const detail = async () => (await api(page, 'GET', `/classrooms/${room.id}`)).body;
      const change = async operation => api(page, 'POST', `/classrooms/${room.id}/plan`, { revision: (await detail()).revision, operation });
      let failed = false;
      const check = (name, operation) => t.test(name, { skip: failed ? 'Prior shared journey failed' : false }, async () => {
        try { await operation(); } catch (error) { failed = true; throw error; }
      });
      await check('actual teacher management and student read-only Plan use the existing shell', async () => {
        await openClassroom(page, runtime.origin);
        await page.getByRole('button', { name: 'Plan', exact: true }).click();
        await page.getByLabel('Nueva unidad', { exact: true }).fill('Added through browser');
        await page.getByRole('button', { name: 'Agregar unidad', exact: true }).click();
        await page.getByRole('heading', { name: 'Unidad 2 · Added through browser', exact: true }).waitFor();
        const added = page.getByRole('group', { name: 'Agregar tema a Added through browser', exact: true });
        await added.getByLabel('Nuevo tema', { exact: true }).fill('Browser topic');
        await added.getByRole('button', { name: 'Agregar tema', exact: true }).click();
        await page.getByLabel('Estado de Browser topic').waitFor();
        const management = page.getByRole('group', { name: 'Administrar Added through browser', exact: true });
        await management.getByLabel('Nombre de la unidad', { exact: true }).fill('Browser renamed unit');
        await management.getByRole('button', { name: 'Renombrar unidad', exact: true }).click();
        await page.getByRole('heading', { name: 'Unidad 2 · Browser renamed unit', exact: true }).waitFor();
        await page.getByRole('group', { name: 'Administrar Browser renamed unit', exact: true })
          .getByRole('button', { name: 'Subir unidad', exact: true }).click();
        await page.getByRole('heading', { name: 'Unidad 1 · Browser renamed unit', exact: true }).waitFor();
        await page.getByLabel('Nueva unidad', { exact: true }).fill('Disposable unit');
        await page.getByRole('button', { name: 'Agregar unidad', exact: true }).click();
        const disposable = page.getByRole('group', { name: 'Administrar Disposable unit', exact: true });
        await disposable.getByRole('button', { name: 'Eliminar unidad', exact: true }).click();
        await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
        assert.equal((await detail()).units.some(unit => unit.name === 'Disposable unit'), true);
        await disposable.getByRole('button', { name: 'Eliminar unidad', exact: true }).click();
        await page.getByRole('button', { name: 'Confirmar eliminación', exact: true }).click();
        await disposable.waitFor({ state: 'detached' });
        assert.equal((await detail()).units.some(unit => unit.name === 'Disposable unit'), false);
        for (const [topic, state] of [['First topic', 'NEXT'], ['Browser topic', 'NEXT'], ['First topic', 'TAUGHT']]) {
          const response = page.waitForResponse(value => value.request().method() === 'POST' && new URL(value.url()).pathname === `/api/v1/classrooms/${room.id}/plan`);
          await page.getByLabel(`Estado de ${topic}`).selectOption(state);
          assert.equal((await response).status(), 200);
        }
        await openClassroom(studentPage, runtime.origin);
        await studentPage.getByRole('button', { name: 'Plan', exact: true }).click();
        assert.equal(await studentPage.getByLabel('Nueva unidad', { exact: true }).count(), 0);
        assert.equal(await studentPage.getByRole('combobox').count(), 0);
        await studentPage.getByText('Browser topic', { exact: true }).waitFor();
        const state = await detail();
        assert.equal(state.units.flatMap(unit => unit.topics).filter(topic => topic.status === 'NEXT').length, 1);
        await mkdir('.test-artifacts/p6-integration', { recursive: true });
        for (const width of [375, 320]) {
          await page.setViewportSize({ width, height: 900 });
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
          await page.screenshot({ path: `.test-artifacts/p6-integration/plan-${width}.png`, fullPage: true });
        }
        await page.setViewportSize({ width: 1280, height: 900 });
      });
      await check('new actual scanned plan is explicitly versioned and old bytes remain accessible', async () => {
        const bytes = await planPdf('New independent version');
        await page.getByLabel('Archivo del plan (PDF o DOCX)', { exact: true }).setInputFiles({ name: 'new-plan.pdf', mimeType: 'application/pdf', buffer: bytes });
        await page.getByText('Archivo aprobado. Confirma para publicar la nueva versión.', { exact: true }).waitFor();
        assert.equal((await detail()).plans.length, 1);
        await page.getByRole('button', { name: 'Publicar nueva versión', exact: true }).click();
        await page.getByRole('link', { name: 'Descargar plan · Versión 2', exact: true }).waitFor();
        const plans = (await detail()).plans;
        assert.equal(plans.length, 2);
        assert.equal((await api(studentPage, 'GET', `/files/${plans[0].fileId}/content`)).digest, digest(bytes));
        assert.equal((await api(studentPage, 'GET', `/files/${room.fileId}/content`)).digest, digest(room.bytes));
      });
      await check('public guards reject student, foreign, wrong CSRF and stale commands unchanged', async () => {
        const body = { revision: (await detail()).revision, operation: { action: 'addUnit', name: 'Rejected' } };
        await rejectSame(runtime.db, () => api(studentPage, 'POST', `/classrooms/${room.id}/plan`, body), 403);
        await rejectSame(runtime.db, () => api(otherPage, 'POST', `/classrooms/${room.id}/plan`, body), 403);
        await rejectSame(runtime.db, () => api(page, 'POST', `/classrooms/${room.id}/plan`, body, { 'x-csrf-token': 'invalid' }), 403);
        await rejectSame(runtime.db, () => api(page, 'POST', `/classrooms/${room.id}/plan`, { ...body, revision: '0' }), 409);
        const taught = (await detail()).units.flatMap(unit => unit.topics).find(topic => topic.status === 'TAUGHT');
        assert.ok(taught);
        await rejectSame(runtime.db, () => change({ action: 'deleteTopic', id: taught.id, confirm: true }), 409);
      });
      await check('concurrent real-session NEXT commands serialize with revision conflict and no automatic replacement', async () => {
        const current = await detail(), topics = current.units.flatMap(unit => unit.topics);
        const result = await Promise.all(topics.slice(0, 2).map(topic => api(page, 'POST', `/classrooms/${room.id}/plan`, {
          revision: current.revision, operation: { action: 'setTopicState', id: topic.id, status: 'NEXT' },
        })));
        assert.deepEqual(result.map(value => value.status).sort(), [200, 409]);
        const selected = (await detail()).units.flatMap(unit => unit.topics).filter(topic => topic.status === 'NEXT');
        assert.equal(selected.length, 1);
        assert.equal((await change({ action: 'setTopicState', id: selected[0].id, status: 'TAUGHT' })).status, 200);
        assert.equal((await detail()).units.flatMap(unit => unit.topics).some(topic => topic.status === 'NEXT'), false);
        assert.equal((await runtime.db.query('SELECT count(*)::int AS n FROM attempts')).rows[0].n, 0);
      });
      await check('actual data/API restart retains versions and curriculum, archive blocks writes not reads', async () => {
        const before = await detail();
        await runtime.restartData();
        assert.deepEqual(await detail(), before);
        const archived = await api(page, 'POST', `/classrooms/${room.id}/archive`, { revision: before.revision, archived: true });
        assert.equal(archived.status, 200);
        await rejectSame(runtime.db, () => change({ action: 'addUnit', name: 'Archived denied' }), 409);
        assert.equal((await api(studentPage, 'GET', `/files/${room.fileId}/content`)).status, 200);
        await openClassroom(page, runtime.origin); await page.getByRole('button', { name: 'Plan', exact: true }).click();
        assert.equal(await page.getByLabel('Nueva unidad', { exact: true }).count(), 0);
      });
    } finally { await browser.close(); }
  }, { classrooms: true });
});
