import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { setTimeout as delay } from 'node:timers/promises';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';
import { account, api, digest } from './p4-integration-helpers.mjs';
import { classroom, openClassroom, planPdf } from './p6-integration-helpers.mjs';

async function request(page, method, path, body, headers) {
  let result = await api(page, method, path, body, headers);
  if (result.status === 429) {
    const seconds = Number(result.headers['retry-after']); assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60);
    console.log(`P8 fixture honors actual Retry-After=${seconds}s once`); await delay(seconds * 1000); result = await api(page, method, path, body, headers);
  }
  return result;
}
async function ok(...args) { const result = await request(...args); assert.equal(result.status, 200, `${args[1]} ${args[2]}`); return result.body; }

test('P8 actual all-type student delivery -> teacher private correction -> reload/restart preserves safe student DTO and original records', { timeout: 330000 }, async t => {
  await withP4IntegrationRuntime(async runtime => {
    assert.equal(runtime.migrations.length, 9);
    const scratch = await mkdtemp(join(tmpdir(), 'foxmind-p8-private-grading-')); console.log(`P8 retained browser evidence: ${scratch}`);
    const browser = await chromium.launch({ headless: true });
    try {
      const teacher = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
      const student = await (await browser.newContext({ viewport: { width: 375, height: 812 } })).newPage();
      const errors = []; for (const page of [teacher, student]) { page.setDefaultTimeout(12000); page.on('pageerror', e => errors.push(e.message)); }
      const suffix = Date.now(); await account(teacher, runtime.origin, runtime.inbox, `p8-teacher-${suffix}@example.test`);
      await account(student, runtime.origin, runtime.inbox, `p8-student-${suffix}@example.test`);
      const name = 'P8 private correction classroom', room = await classroom(teacher, student, name), detail = await ok(teacher, 'GET', `/classrooms/${room.id}`);
      const change = async operation => ok(teacher, 'POST', `/classrooms/${room.id}/activities`, { revision: (await ok(teacher, 'GET', `/classrooms/${room.id}`)).revision, operation });
      const activities = [];
      for (const type of ['QUESTIONNAIRE', 'EVALUATION', 'ASSIGNMENT']) {
        const { id } = await change({ action: 'create', type }), title = `P8 ${type}`;
        await change({ action: 'save', id, payload: { title, unitId: detail.units[0].id, topicId: detail.units[0].topics[0].id,
          instructions: 'Preserved original instructions', attachmentRequired: type === 'ASSIGNMENT', instructionFileIds: [], materialIds: [], deadline: null, allowLate: false,
          questions: type === 'ASSIGNMENT' ? [] : [{ type: 'DEVELOPMENT', prompt: 'Explain the original answer', points: '10', scoringRule: null, options: [] }] } });
        await change({ action: 'publish', id }); activities.push({ id, title, type });
      }
      const protectedHash = async () => {
        const rows = [];
        for (const table of ['activities', 'questions', 'question_options', 'student_activities', 'attempts', 'answers', 'answer_selections', 'attempt_attachments',
          'files', 'uploads', 'file_custodies', 'grade_corrections', 'notifications']) rows.push((await runtime.db.query(`SELECT to_jsonb(t) value FROM ${table} t ORDER BY to_jsonb(t)::text`)).rows);
        return digest(JSON.stringify(rows));
      };
      const gradeHash = async () => digest(JSON.stringify((await runtime.db.query('SELECT to_jsonb(t) value FROM attempt_grades t ORDER BY id')).rows));
      let failed = false;
      const check = (label, fn) => t.test(label, { skip: failed ? 'Earlier actual private-grading prerequisite failed' : false }, async () => { try { await fn(); } catch (e) { failed = true; throw e; } });
      for (const activity of activities) await check(`${activity.type} real browser submission and teacher correction remain private across reload`, async () => {
        await openClassroom(student, runtime.origin, name); await student.getByRole('button', { name: 'Actividades', exact: true }).click();
        await student.getByRole('article', { name: activity.title, exact: true }).getByRole('button', { name: activity.type === 'ASSIGNMENT' ? 'Abrir trabajo práctico' : 'Consultar actividad', exact: true }).click();
        if (activity.type === 'ASSIGNMENT') {
          const bytes = await planPdf('P8 immutable submitted file');
          await student.getByLabel('Seleccionar archivo del trabajo', { exact: true }).setInputFiles({ name: 'p8-original.pdf', mimeType: 'application/pdf', buffer: bytes });
          const upload = student.waitForResponse(r => r.url().endsWith('/content') && r.request().method() === 'PUT');
          await student.getByRole('button', { name: 'Subir archivo privado', exact: true }).click(); assert.equal((await upload).status(), 200);
          await student.getByRole('button', { name: 'Enviar trabajo práctico', exact: true }).click();
          const submitted = student.waitForResponse(r => r.url().endsWith('/submit-practical'));
          await student.getByRole('button', { name: 'Confirmar envío del trabajo', exact: true }).click(); assert.equal((await submitted).status(), 200);
          await student.getByRole('heading', { name: 'Comprobante de entrega', exact: true }).waitFor();
        } else {
          await student.getByRole('button', { name: 'Comenzar', exact: true }).click();
          await student.getByRole('textbox', { name: 'Respuesta a la pregunta 1', exact: true }).fill('Actual preserved answer 😀');
          await student.getByRole('button', { name: 'Enviar respuestas', exact: true }).click();
          const submitted = student.waitForResponse(r => r.url().endsWith('/submit-answers'));
          await student.getByRole('button', { name: 'Confirmar envío de respuestas', exact: true }).click(); assert.equal((await submitted).status(), 200);
          await student.getByText('Comprobante de entrega · pendiente de corrección.', { exact: false }).waitFor();
        }
        activity.attempt = (await ok(student, 'GET', `/classrooms/${room.id}/activities/${activity.id}/session`)).attempt.id;
        const path = `/classrooms/${room.id}/attempts/${activity.attempt}/grading`, before = await protectedHash();
        const previewHash = await gradeHash(); await ok(teacher, 'GET', path); assert.equal(await gradeHash(), previewHash);
        await openClassroom(teacher, runtime.origin, name); await teacher.getByRole('button', { name: 'Actividades', exact: true }).click();
        await teacher.getByRole('article', { name: activity.title, exact: true }).getByRole('button', { name: 'Ver entregas recibidas', exact: true }).click();
        await teacher.getByRole('button', { name: 'Corregir intento 1', exact: true }).click();
        const region = teacher.getByRole('region', { name: 'Corrección privada del intento', exact: true });
        await region.getByText('Corrección privada: el estudiante no ve esta calificación.', { exact: false }).waitFor();
        if (activity.type === 'QUESTIONNAIRE') {
          await region.getByLabel('Devolución de la pregunta 1', { exact: true }).fill('Private feedback with pending points');
          const saved = teacher.waitForResponse(r => r.url().endsWith('/grading') && r.request().method() === 'POST');
          await region.getByRole('button', { name: 'Guardar corrección privada', exact: true }).click(); assert.equal((await saved).status(), 200);
          await region.getByRole('button', { name: 'Recargar corrección', exact: true }).click();
          await region.getByText('Calificación pendiente de corrección manual', { exact: true }).waitFor();
          assert.equal(await region.getByLabel('Devolución de la pregunta 1', { exact: true }).inputValue(), 'Private feedback with pending points');
        }
        const entered = activity.type === 'ASSIGNMENT' ? '8,50' : activity.type === 'QUESTIONNAIRE' ? '8,35' : '0';
        await region.getByLabel(activity.type === 'ASSIGNMENT' ? 'Calificación general' : 'Puntos de la pregunta 1', { exact: true }).fill(entered);
        await region.getByLabel('Devolución general opcional', { exact: true }).fill('Private general feedback');
        const saved = teacher.waitForResponse(r => r.url().endsWith('/grading') && r.request().method() === 'POST');
        await region.getByRole('button', { name: 'Guardar corrección privada', exact: true }).click(); assert.equal((await saved).status(), 200);
        const expected = activity.type === 'ASSIGNMENT' ? '8.50' : activity.type === 'QUESTIONNAIRE' ? '8.35' : '0.00'; activity.expected = expected;
        await region.getByText(`Calificación calculada: ${expected.replace('.', ',')}`, { exact: true }).waitFor();
        assert.equal(await protectedHash(), before);
        const persisted = await ok(teacher, 'GET', path); assert.equal(persisted.grade.finalGrade, expected); assert.equal(persisted.grade.isPublished, false);
        assert.equal(persisted.grade.publishedAt, null); assert.equal((await runtime.db.query('SELECT count(*)::int n FROM attempt_grades WHERE attempt_id=$1', [activity.attempt])).rows[0].n, 1);
        const rejectBefore = await gradeHash(); assert.equal((await request(student, 'GET', path)).status, 403); assert.equal(await gradeHash(), rejectBefore);
        const own = await ok(student, 'GET', `/classrooms/${room.id}/attempts/${activity.attempt}/history`);
        assert.ok(!/"(?:finalGrade|overallFeedback|manualPoints|earned|correct|scoringRule)"/.test(JSON.stringify(own)));
        await region.getByRole('button', { name: 'Recargar corrección', exact: true }).click();
        await region.getByText(`Calificación calculada: ${expected.replace('.', ',')}`, { exact: true }).waitFor();
        if (activity.type === 'ASSIGNMENT') {
          const file = persisted.attempt.attachments[0], download = await request(teacher, 'GET', `/files/${file.id}/content`); assert.equal(download.status, 200);
          assert.equal(download.length > 0, true);
        }
        if (activity.type === 'EVALUATION') await teacher.setViewportSize({ width: 375, height: 812 });
        await teacher.screenshot({ path: join(scratch, `teacher-private-${activity.type.toLowerCase()}.png`), fullPage: true });
        assert.equal(await teacher.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await teacher.setViewportSize({ width: 1280, height: 900 });
      });
      await check('database/private-storage/API restart restores every private correction without effective grade, publication or notification', async () => {
        const before = await protectedHash(), grades = await gradeHash(); await runtime.restartData();
        for (const activity of activities) {
          const restored = await ok(teacher, 'GET', `/classrooms/${room.id}/attempts/${activity.attempt}/grading`);
          assert.equal(restored.grade.finalGrade, activity.expected); assert.equal(restored.grade.isPublished, false);
        }
        assert.equal(await protectedHash(), before); assert.equal(await gradeHash(), grades);
        assert.equal((await runtime.db.query('SELECT count(*)::int n FROM student_activities WHERE effective_grade_id IS NOT NULL')).rows[0].n, 0);
        assert.equal((await runtime.db.query("SELECT count(*)::int n FROM notifications WHERE event_type::text IN ('GRADE_PUBLISHED','GRADE_CORRECTED')")).rows[0].n, 0);
        assert.equal((await runtime.db.query('SELECT count(*)::int n FROM grade_corrections')).rows[0].n, 0);
        assert.deepEqual(errors, []);
      });
    } finally { await browser.close(); }
  }, { classrooms: true });
});
