import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';
import { account, api, digest } from './p4-integration-helpers.mjs';
import { classroom, openClassroom, planPdf } from './p6-integration-helpers.mjs';

test('P8 targeted TP private editor reload confirms actual 200 before restoring saved fields and clean visual state', { timeout: 330000 }, async () => {
  await withP4IntegrationRuntime(async runtime => {
    assert.equal(runtime.migrations.length, 12);
    assert.deepEqual(runtime.migrations.slice(-3), [
      '202610230001_agenda_events',
      '202610230001_classroom_ai',
      '202610240001_agenda_event_color',
    ]);
    const scratch = await mkdtemp(join(tmpdir(), 'foxmind-p8-tp-reload-')); console.log(`P8 targeted TP retained evidence: ${scratch}`);
    const browser = await chromium.launch({ headless: true });
    try {
      const teacher = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
      const student = await (await browser.newContext({ viewport: { width: 375, height: 812 } })).newPage();
      for (const page of [teacher, student]) page.setDefaultTimeout(12000);
      const suffix = Date.now(); await account(teacher, runtime.origin, runtime.inbox, `p8-reload-teacher-${suffix}@example.test`);
      await account(student, runtime.origin, runtime.inbox, `p8-reload-student-${suffix}@example.test`);
      const roomName = 'P8 targeted TP reload', room = await classroom(teacher, student, roomName);
      const ok = async (page, method, path, body) => { const result = await api(page, method, path, body); assert.equal(result.status, 200, `${method} ${path}`); return result.body; };
      const detail = await ok(teacher, 'GET', `/classrooms/${room.id}`);
      const change = async operation => ok(teacher, 'POST', `/classrooms/${room.id}/activities`, { revision: (await ok(teacher, 'GET', `/classrooms/${room.id}`)).revision, operation });
      const { id } = await change({ action: 'create', type: 'ASSIGNMENT' });
      await change({ action: 'save', id, payload: { title: 'Targeted TP', unitId: detail.units[0].id, topicId: detail.units[0].topics[0].id,
        instructions: 'Retain original submitted PDF', attachmentRequired: true, instructionFileIds: [], materialIds: [], deadline: null, allowLate: false, questions: [] } });
      await change({ action: 'publish', id });
      await openClassroom(student, runtime.origin, roomName); await student.getByRole('button', { name: 'Actividades', exact: true }).click();
      await student.getByRole('article', { name: 'Targeted TP', exact: true }).getByRole('button', { name: 'Abrir trabajo práctico', exact: true }).click();
      const bytes = await planPdf('Targeted TP original');
      await student.getByLabel('Seleccionar archivo del trabajo', { exact: true }).setInputFiles({ name: 'targeted-original.pdf', mimeType: 'application/pdf', buffer: bytes });
      const uploaded = student.waitForResponse(r => r.url().endsWith('/content') && r.request().method() === 'PUT');
      await student.getByRole('button', { name: 'Subir archivo privado', exact: true }).click(); assert.equal((await uploaded).status(), 200);
      await student.getByRole('button', { name: 'Enviar trabajo práctico', exact: true }).click();
      const submitted = student.waitForResponse(r => r.url().endsWith('/submit-practical'));
      await student.getByRole('button', { name: 'Confirmar envío del trabajo', exact: true }).click(); assert.equal((await submitted).status(), 200);
      await student.getByRole('heading', { name: 'Comprobante de entrega', exact: true }).waitFor();
      const state = await ok(student, 'GET', `/classrooms/${room.id}/activities/${id}/session`), attemptId = state.attempt.id;
      await openClassroom(teacher, runtime.origin, roomName); await teacher.getByRole('button', { name: 'Actividades', exact: true }).click();
      await teacher.getByRole('article', { name: 'Targeted TP', exact: true }).getByRole('button', { name: 'Ver entregas recibidas', exact: true }).click();
      await teacher.getByRole('button', { name: 'Corregir intento 1', exact: true }).click();
      const region = teacher.getByRole('region', { name: 'Corrección privada del intento', exact: true });
      await region.getByLabel('Calificación general', { exact: true }).fill('8,50');
      await region.getByLabel('Devolución general opcional', { exact: true }).fill('Persisted targeted feedback');
      const saved = teacher.waitForResponse(r => r.url().endsWith('/grading') && r.request().method() === 'POST');
      await region.getByRole('button', { name: 'Guardar corrección privada', exact: true }).click(); assert.equal((await saved).status(), 200);
      await region.getByText('Corrección privada guardada. No se ha publicado.', { exact: true }).waitFor();
      const persistedHash = async () => digest(JSON.stringify((await runtime.db.query('SELECT to_jsonb(g) value FROM attempt_grades g WHERE attempt_id=$1', [attemptId])).rows));
      const before = await persistedHash();
      await region.getByLabel('Calificación general', { exact: true }).fill('2,00');
      await region.getByLabel('Devolución general opcional', { exact: true }).fill('Unsaved local feedback');
      const reload = async () => {
        const response = teacher.waitForResponse(r => r.url().endsWith('/grading') && r.request().method() === 'GET');
        await region.getByRole('button', { name: 'Recargar corrección', exact: true }).click(); return response;
      };
      let response = await reload();
      console.log(`P8 targeted visible reload first status=${response.status()} retry-after=${response.headers()['retry-after'] ?? 'absent'}`);
      if (response.status() === 429) {
        const seconds = Number(response.headers()['retry-after']); assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60);
        await delay(seconds * 1000); response = await reload(); console.log(`P8 targeted visible reload bounded retry status=${response.status()}`);
      }
      assert.equal(response.status(), 200);
      assert.equal((await response.json()).grade.finalGrade, '8.50');
      await teacher.waitForFunction(() => document.querySelector('input[aria-label="Calificación general"]')?.value === '8,50');
      assert.equal(await region.getByLabel('Devolución general opcional', { exact: true }).inputValue(), 'Persisted targeted feedback');
      assert.equal(await region.getByText('Tus cambios no se han confirmado.', { exact: false }).count(), 0);
      assert.equal(await persistedHash(), before);
      await region.getByText('Calificación calculada: 8,50', { exact: true }).waitFor();
      await teacher.screenshot({ path: join(scratch, 'teacher-tp-reload-confirmed-200.png'), fullPage: true });
      assert.equal(await teacher.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal((await api(student, 'GET', `/classrooms/${room.id}/attempts/${attemptId}/grading`)).status, 403);
      assert.equal((await runtime.db.query('SELECT count(*)::int n FROM student_activities WHERE effective_grade_id IS NOT NULL')).rows[0].n, 0);
      assert.equal((await runtime.db.query('SELECT count(*)::int n FROM attempt_grades WHERE is_published')).rows[0].n, 0);
    } finally { await browser.close(); }
  }, { classrooms: true });
});
