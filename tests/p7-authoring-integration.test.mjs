import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';
import { account, api, digest } from './p4-integration-helpers.mjs';
import { openClassroom, planPdf, upload, rejectSame } from './p6-integration-helpers.mjs';

test('P7 T1 real P3 sessions, authoring UI, private ready instructions and safe published activities', { timeout: 330000 }, async t => {
  await withP4IntegrationRuntime(async runtime => {
    const browser = await chromium.launch({ headless: true });
    const scratch = await mkdtemp(join(tmpdir(), 'foxmind-p7-authoring-'));
    console.log(`P7 retained browser evidence: ${scratch}`);
    try {
      const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
      const student = await (await browser.newContext()).newPage();
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      const suffix = Date.now();
      await account(page, runtime.origin, runtime.inbox, `p7-author-${suffix}@example.test`);
      await account(student, runtime.origin, runtime.inbox, `p7-reader-${suffix}@example.test`);
      const draft = await api(page, 'POST', '/classrooms/drafts', {}); assert.equal(draft.status, 200);
      const plan = await upload(page, { kind: 'draft', id: draft.body.id }, await planPdf());
      const saved = await api(page, 'PATCH', `/classrooms/drafts/${draft.body.id}`, { revision: draft.body.revision,
        payload: { name: 'P7 authoring classroom', subject: 'Science', division: 'A', academicYear: 2026, timezone: 'America/New_York',
          coverKey: 'explore', planFileId: plan.id, units: [{ name: 'First unit', topics: [{ name: 'First topic' }] }] } });
      assert.equal(saved.status, 200);
      const room = await api(page, 'POST', `/classrooms/drafts/${draft.body.id}/publish`, { revision: saved.body.revision }); assert.equal(room.status, 200);
      const roomId = room.body.id;
      const code = await api(student, 'POST', '/classrooms/codes/preview', { code: room.body.code }); assert.equal(code.status, 200);
      assert.equal((await api(student, 'POST', '/classrooms/codes/confirm', { confirmation: code.body.confirmation })).status, 200);
      const detail = async () => {
        let response = await api(page, 'GET', `/classrooms/${roomId}`);
        if (response.status === 429) {
          const seconds = Number(response.headers['retry-after']);
          assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60, 'Actual bounded Retry-After required');
          console.log(`P7 fixture respects actual detail Retry-After=${seconds}s once`);
          await delay(seconds * 1000);
          response = await api(page, 'GET', `/classrooms/${roomId}`);
        }
        assert.equal(response.status, 200, 'A failed prerequisite must not become an incomplete mutation payload');
        assert.match(response.body.revision, /^\d+$/);
        return response.body;
      };
      const change = async operation => api(page, 'POST', `/classrooms/${roomId}/activities`, { revision: (await detail()).revision, operation });
      let assignment, instructions;
      let failed = false;
      const check = (name, operation) => t.test(name, { skip: failed ? 'Prior shared authoring journey failed' : false }, async () => {
        try { await operation(); } catch (error) { failed = true; throw error; }
      });
      await check('teacher private assignment editor explicitly resolves gaps/overlap and persists real scanned instructions', async () => {
        await openClassroom(page, runtime.origin, 'P7 authoring classroom');
        await page.getByRole('button', { name: 'Actividades', exact: true }).click();
        await page.getByRole('button', { name: 'Crear borrador de actividad', exact: true }).click();
        await page.getByLabel('Título de la actividad', { exact: true }).fill('Browser assignment');
        await page.getByLabel('Unidad de la actividad', { exact: true }).selectOption({ label: 'First unit' });
        await page.getByLabel('Tema de la actividad', { exact: true }).selectOption({ label: 'First topic' });
        await page.getByLabel('Observaciones', { exact: true }).fill('Read carefully.\nPreserve this second line.');
        await page.getByLabel('Fecha y hora del aula', { exact: true }).fill('2026-03-08T02:30');
        await page.getByRole('button', { name: 'Verificar hora', exact: true }).click();
        await page.getByText('Esta hora no existe por el cambio de horario.', { exact: false }).waitFor();
        await page.getByLabel('Fecha y hora del aula', { exact: true }).fill('2026-11-01T01:30');
        await page.getByRole('button', { name: 'Verificar hora', exact: true }).click();
        await page.getByLabel('Ocurrencia de la hora repetida', { exact: true }).waitFor();
        assert.equal(await page.getByLabel('Ocurrencia de la hora repetida').locator('option').count(), 3);
        await page.getByLabel('Ocurrencia de la hora repetida').selectOption('-300');
        const bytes = await planPdf('Assignment instructions');
        await page.getByLabel('Archivo de instrucciones (PDF o DOCX, hasta 20 MB)', { exact: true }).setInputFiles({ name: 'instructions.pdf', mimeType: 'application/pdf', buffer: bytes });
        await page.getByText('instructions.pdf · Aprobado', { exact: false }).waitFor();
        await page.getByRole('button', { name: 'Guardar actividad', exact: true }).click();
        await page.getByText('Cambios confirmados por el servidor.', { exact: false }).waitFor();
        const list = (await api(page, 'GET', `/classrooms/${roomId}/activities`)).body.activities;
        assignment = list[0].id;
        assert.equal((await api(student, 'GET', `/classrooms/${roomId}/activities`)).body.activities.length, 0);
        const state = (await api(page, 'GET', `/classrooms/${roomId}/activities/${assignment}/preview`)).body.activity;
        assert.equal(state.instructions, 'Read carefully.\nPreserve this second line.');
        assert.equal(state.deadlineAt, '2026-11-01T06:30:00.000Z');
        instructions = state.instructionFiles[0].id;
        assert.equal((await api(page, 'GET', `/files/${instructions}/content`)).digest, digest(bytes));
        await rejectSame(runtime.db, () => api(student, 'GET', `/files/${instructions}/content`), 403);
        await page.getByRole('button', { name: 'Cerrar editor', exact: true }).click();
      });
      await check('preview starts no attempt, publication is explicit and the actual student consultation remains key-free', async () => {
        const article = page.getByRole('article', { name: 'Browser assignment', exact: true });
        await article.getByRole('button', { name: 'Vista previa docente', exact: true }).click();
        await page.getByText('Vista previa docente: no inicia un intento', { exact: false }).waitFor();
        assert.equal((await runtime.db.query('SELECT count(*)::int n FROM attempts')).rows[0].n, 0);
        assert.equal((await runtime.db.query('SELECT first_started_at FROM activities WHERE id=$1', [assignment])).rows[0].first_started_at, null);
        await page.getByRole('button', { name: 'Cerrar diálogo', exact: true }).click();
        await article.getByRole('button', { name: 'Publicar', exact: true }).click();
        assert.equal((await api(student, 'GET', `/classrooms/${roomId}/activities`)).body.activities.length, 0);
        await page.getByRole('button', { name: 'Confirmar publicación', exact: true }).click();
        await page.getByText('Estado de publicación confirmado.', { exact: true }).waitFor();
        assert.equal((await api(student, 'GET', `/files/${instructions}/content`)).status, 403,
          'Eligible assignment instructions require the explicit first-opening start boundary');
        await openClassroom(student, runtime.origin, 'P7 authoring classroom');
        await student.getByRole('button', { name: 'Actividades', exact: true }).click();
        await student.getByRole('article', { name: 'Browser assignment', exact: true }).getByRole('button', { name: 'Abrir trabajo práctico', exact: true }).click();
        await student.getByRole('link', { name: 'Descargar instructions.pdf', exact: true }).waitFor();
        assert.equal(await student.getByRole('button', { name: 'Guardar actividad', exact: true }).count(), 0);
      });
      await check('questionnaire/evaluation browser editors cover all question types and invalid questions remain visibly unsaved', async () => {
        // The other actor's first start legitimately changed the classroom revision.
        const refreshed = Promise.all([`/api/v1/classrooms/${roomId}`, `/api/v1/classrooms/${roomId}/activities`]
          .map(path => page.waitForResponse(response => new URL(response.url()).pathname === path && response.request().method() === 'GET')));
        await page.getByRole('button', { name: 'Actualizar actividades', exact: true }).click();
        for (const response of await refreshed) assert.equal(response.status(), 200);
        for (const [type, name] of [['QUESTIONNAIRE', 'Browser questionnaire'], ['EVALUATION', 'Browser evaluation']]) {
          await page.getByLabel('Tipo de actividad', { exact: true }).selectOption(type);
          const created = page.waitForResponse(response => new URL(response.url()).pathname === `/api/v1/classrooms/${roomId}/activities`
            && response.request().method() === 'POST');
          await page.getByRole('button', { name: 'Crear borrador de actividad', exact: true }).click();
          assert.equal((await created).status(), 200, 'Current teacher revision must create the requested draft');
          await page.getByLabel('Título de la actividad', { exact: true }).fill(name);
          await page.getByLabel('Unidad de la actividad', { exact: true }).selectOption({ label: 'First unit' });
          await page.getByLabel('Tema de la actividad', { exact: true }).selectOption({ label: 'First topic' });
          for (const [index, qtype] of ['DEVELOPMENT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE'].entries()) {
            await page.getByRole('button', { name: 'Agregar pregunta', exact: true }).click();
            const group = page.getByRole('group', { name: `Pregunta ${index + 1}`, exact: true });
            await group.getByLabel('Tipo de pregunta', { exact: true }).selectOption(qtype);
            await group.getByLabel('Consigna de la pregunta', { exact: true }).fill(`Question ${index + 1}`);
            await group.getByLabel('Puntos disponibles', { exact: true }).fill(index === 0 ? '0' : '2.50');
            if (qtype !== 'DEVELOPMENT') {
              await group.getByLabel('Opción 1', { exact: true }).fill('Option A');
              await group.getByLabel('Opción 2', { exact: true }).fill('Option B');
              if (qtype === 'MULTIPLE_CHOICE') await group.getByLabel('Regla de puntuación', { exact: true }).selectOption('PARTIAL');
            }
          }
          const before = (await api(page, 'GET', `/classrooms/${roomId}/activities`)).body.activities.find(a => a.type === type);
          await page.getByRole('button', { name: 'Guardar actividad', exact: true }).click();
          await page.getByText('Los cambios no confirmados permanecen en este editor', { exact: false }).waitFor();
          assert.equal((await api(page, 'GET', `/classrooms/${roomId}/activities/${before.id}/preview`)).body.activity.questions.length, 0);
          assert.equal(await page.getByRole('group', { name: 'Pregunta 1', exact: true }).getByLabel('Puntos disponibles', { exact: true }).inputValue(), '0');
          await page.getByRole('group', { name: 'Pregunta 1', exact: true }).getByLabel('Puntos disponibles', { exact: true }).fill('1.25');
          await page.getByRole('button', { name: 'Guardar actividad', exact: true }).click();
          await page.getByText('Cambios confirmados por el servidor.', { exact: false }).waitFor();
          await page.getByRole('button', { name: 'Cerrar editor', exact: true }).click();
          await page.getByRole('article', { name, exact: true }).getByRole('button', { name: 'Publicar', exact: true }).click();
          await page.getByRole('button', { name: 'Confirmar publicación', exact: true }).click();
          await page.getByText('Estado de publicación confirmado.', { exact: true }).waitFor();
          const safe = await api(student, 'GET', `/classrooms/${roomId}/activities/${before.id}`);
          assert.equal(safe.status, 200); assert.equal(safe.body.activity.questions.length, 3);
          for (const q of safe.body.activity.questions) {
            assert.equal(Object.hasOwn(q, 'scoringRule'), false);
            for (const option of q.options) assert.equal(Object.hasOwn(option, 'correct'), false);
          }
        }
      });
      await check('real-session guards and persistence retain P3/P4/P6 boundaries; responsive selected Activities remains visible', async () => {
        await rejectSame(runtime.db, async () => api(student, 'POST', `/classrooms/${roomId}/activities`, { revision: (await detail()).revision, operation: { action: 'withdraw', id: assignment } }), 403);
        await rejectSame(runtime.db, () => change({ action: 'withdraw', id: '00000000-0000-4000-8000-000000000000' }), 403);
        const snapshot = (await api(page, 'GET', `/classrooms/${roomId}/activities`)).body;
        await runtime.restartData();
        assert.deepEqual((await api(page, 'GET', `/classrooms/${roomId}/activities`)).body, snapshot);
        await page.setViewportSize({ width: 320, height: 900 });
        await page.getByRole('button', { name: 'Actividades', exact: true }).click();
        const selected = await page.getByRole('button', { name: 'Actividades', exact: true }).evaluate(element => {
          const box = element.getBoundingClientRect(), parent = element.parentElement.getBoundingClientRect();
          return { selected: element.getAttribute('aria-current'), visible: box.left >= parent.left && box.right <= parent.right + 1 };
        });
        assert.equal(selected.selected, 'page'); assert.equal(selected.visible, true);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await page.screenshot({ path: join(scratch, 'activities-320.png'), fullPage: true });
        assert.deepEqual(errors, []);
        assert.equal((await api(page, 'POST', `/classrooms/${roomId}/archive`, { revision: (await detail()).revision, archived: true })).status, 200);
        await rejectSame(runtime.db, () => change({ action: 'create', type: 'ASSIGNMENT' }), 409);
        assert.equal((await api(student, 'GET', `/files/${instructions}/content`)).status, 200);
      });
    } finally { await browser.close(); }
  }, { classrooms: true });
});
