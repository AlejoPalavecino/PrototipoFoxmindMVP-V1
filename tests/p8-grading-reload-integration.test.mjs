import { openPracticalActivity, openTeacherGrading, observedUiAction, selectClassroomSection } from './p8-current-ui-helpers.mjs';
import { readdirSync } from 'node:fs';
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
    assert.deepEqual(runtime.migrations, readdirSync('prisma/migrations').filter(name => /^\d+_/.test(name)).sort());
    assert.deepEqual(runtime.migrations.filter(name => ['202610230001_agenda_events', '202610230001_classroom_ai', '202610240001_agenda_event_color', '202610250001_activity_topics', '202610250002_activity_ai'].includes(name)), [
      '202610230001_agenda_events',
      '202610230001_classroom_ai',
      '202610240001_agenda_event_color',
      '202610250001_activity_topics',
      '202610250002_activity_ai',
    ]);
    const scratch = await mkdtemp(join(tmpdir(), 'foxmind-p8-tp-reload-')); console.log(`P8 targeted TP retained evidence: ${scratch}`);
    const browser = await chromium.launch({ headless: true });
    try {
      const teacher = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
      const student = await (await browser.newContext({ viewport: { width: 375, height: 812 } })).newPage();
      for (const page of [teacher, student]) page.setDefaultTimeout(12000);
      const suffix = Date.now(); await account(teacher, runtime.origin, runtime.inbox, `p8-reload-teacher-${suffix}@example.test`, undefined, "teacher");
      await account(student, runtime.origin, runtime.inbox, `p8-reload-student-${suffix}@example.test`, undefined, "student");
      const roomName = 'P8 targeted TP reload', room = await classroom(teacher, student, roomName);
      const ok = async (page, method, path, body) => { const result = await api(page, method, path, body); assert.equal(result.status, 200, `${method} ${path}`); return result.body; };
      const detail = await ok(teacher, 'GET', `/classrooms/${room.id}`);
      const change = async operation => ok(teacher, 'POST', `/classrooms/${room.id}/activities`, { revision: (await ok(teacher, 'GET', `/classrooms/${room.id}`)).revision, operation });
      const { id } = await change({ action: 'create', type: 'ASSIGNMENT' });
      await change({ action: 'save', id, payload: { title: 'Targeted TP', unitId: detail.units[0].id, topicId: detail.units[0].topics[0].id,
        instructions: 'Retain original submitted PDF', attachmentRequired: true, instructionFileIds: [], materialIds: [], deadline: null, allowLate: false, questions: [] } });
      await change({ action: 'publish', id });
      await openClassroom(student, runtime.origin, roomName); await selectClassroomSection(student, 'activities', 'Actividades');
      await openPracticalActivity(student, room.id, id, 'Targeted TP');
      const bytes = await planPdf('Targeted TP original');
      await student.getByLabel('Seleccionar archivo del trabajo', { exact: true }).setInputFiles({ name: 'targeted-original.pdf', mimeType: 'application/pdf', buffer: bytes });
      const uploaded = student.waitForResponse(r => r.url().endsWith('/content') && r.request().method() === 'PUT');
      await student.getByRole('button', { name: 'Subir archivo privado', exact: true }).click(); assert.equal((await uploaded).status(), 200);
      await student.getByRole('button', { name: 'Revisar entrega', exact: true }).click();
      const submitted = student.waitForResponse(r => r.url().endsWith('/submit-practical'));
      await student.getByRole('button', { name: 'Confirmar envío del trabajo', exact: true }).click(); assert.equal((await submitted).status(), 200);
      await student.getByRole('region', { name: 'Comprobante de entrega', exact: true })
        .getByText('Entrega confirmada', { exact: true }).waitFor();
      const state = await ok(student, 'GET', `/classrooms/${room.id}/activities/${id}/session`), attemptId = state.attempt.id;
      await openClassroom(teacher, runtime.origin, roomName); await selectClassroomSection(teacher, 'activities', 'Actividades');
      const region = await openTeacherGrading(teacher, 'Targeted TP');
      await region.getByLabel('Nota final', { exact: true }).fill('8,50');
      await region.getByRole('button', { name: 'Devolución', exact: true }).click();
      await region.getByLabel('Devolución general opcional', { exact: true }).fill('Persisted targeted feedback');
      const saved = teacher.waitForResponse(r => r.url().endsWith('/grading') && r.request().method() === 'POST');
      await region.getByRole('button', { name: 'Guardar corrección privada', exact: true }).click(); assert.equal((await saved).status(), 200);
      await region.getByText('Corrección privada guardada. No se ha publicado.', { exact: true }).waitFor();
      const persistedHash = async () => digest(JSON.stringify((await runtime.db.query('SELECT to_jsonb(g) value FROM attempt_grades g WHERE attempt_id=$1', [attemptId])).rows));
      const before = await persistedHash();
      await region.getByRole('button', { name: 'Rúbrica y nota', exact: true }).click();
      await region.getByLabel('Nota final', { exact: true }).fill('2,00');
      await region.getByRole('button', { name: 'Devolución', exact: true }).click();
      await region.getByLabel('Devolución general opcional', { exact: true }).fill('Unsaved local feedback');
      const reload = () => observedUiAction(teacher, async () => {
        await region.getByRole('button', { name: 'Recargar corrección', exact: true }).click();
        const discard = teacher.getByRole('dialog', { name: 'Tenés cambios sin guardar', exact: true });
        await discard.getByRole('button', { name: 'Descartar cambios', exact: true }).click();
      }, r => r.url().endsWith(`/${attemptId}/grading`) && r.request().method() === 'GET');
      let response = await reload();
      console.log(`P8 targeted visible reload first status=${response.status()} retry-after=${response.headers()['retry-after'] ?? 'absent'}`);
      if (response.status() === 429) {
        const seconds = Number(response.headers()['retry-after']); assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60);
        await delay(seconds * 1000); response = await reload(); console.log(`P8 targeted visible reload bounded retry status=${response.status()}`);
      }
      assert.equal(response.status(), 200);
      assert.equal((await response.json()).grade.finalGrade, '8.50');
      await teacher.waitForFunction(() => document.querySelector('input[aria-label="Nota final"]')?.value === '8,50');
      assert.equal(await region.getByLabel('Devolución general opcional', { exact: true }).inputValue(), 'Persisted targeted feedback');
      assert.equal(await region.getByText('Tus cambios no se han confirmado.', { exact: false }).count(), 0);
      assert.equal(await persistedHash(), before);
      await region.getByRole('button', { name: 'Rúbrica y nota', exact: true }).click();
      await region.getByText('Nota guardada: 8,50', { exact: true }).waitFor();
      await teacher.screenshot({ path: join(scratch, 'teacher-tp-reload-confirmed-200.png'), fullPage: true });
      assert.equal(await teacher.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.equal((await api(student, 'GET', `/classrooms/${room.id}/attempts/${attemptId}/grading`)).status, 403);
      assert.equal((await runtime.db.query('SELECT count(*)::int n FROM student_activities WHERE effective_grade_id IS NOT NULL')).rows[0].n, 0);
      assert.equal((await runtime.db.query('SELECT count(*)::int n FROM attempt_grades WHERE is_published')).rows[0].n, 0);
    } finally { await browser.close(); }
  }, { classrooms: true });
});
