import { visibleNavigation } from './entry-glass-browser-helpers.mjs';
import { startBrowserAttempt, openActivityOverview, openPracticalActivity, openTeacherActivity, selectClassroomSection } from './p8-current-ui-helpers.mjs';
import { readdirSync } from 'node:fs';
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
import { openPublicationPractical } from './p8-publication-browser-helpers.mjs';

async function request(page, method, path, body, headers) {
  let result = await api(page, method, path, body, headers);
  if (result.status === 429) {
    const seconds = Number(result.headers['retry-after']); assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60);
    console.log(`P8 fixture honors actual Retry-After=${seconds}s once`); await delay(seconds * 1000); result = await api(page, method, path, body, headers);
  }
  return result;
}
async function ok(...args) { const result = await request(...args); assert.equal(result.status, 200, `${args[1]} ${args[2]}`); return result.body; }

test('P8 distinct TP delivery -> explicit publication -> clean own result -> private-file/API/data restart and current-access revocation', { timeout: 330000 }, async t => {
  await withP4IntegrationRuntime(async runtime => {
    assert.deepEqual(runtime.migrations, readdirSync('prisma/migrations').filter(name => /^\d+_/.test(name)).sort());
    assert.deepEqual(runtime.migrations.filter(name => ['202610230001_agenda_events', '202610230001_classroom_ai', '202610240001_agenda_event_color', '202610250001_activity_topics', '202610250002_activity_ai'].includes(name)), [
      '202610230001_agenda_events',
      '202610230001_classroom_ai',
      '202610240001_agenda_event_color',
      '202610250001_activity_topics',
      '202610250002_activity_ai',
    ]);
    const scratch = await mkdtemp(join(tmpdir(), 'foxmind-p8-publication-tp-')); console.log(`P8 retained browser evidence: ${scratch}`);
    const browser = await chromium.launch({ headless: true });
    try {
      const teacher = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
      const student = await (await browser.newContext({ viewport: { width: 375, height: 812 } })).newPage();
      const errors = []; for (const page of [teacher, student]) { page.setDefaultTimeout(12000); page.on('pageerror', e => errors.push(e.message)); }
      const suffix = Date.now(), studentEmail = `p8-student-${suffix}@example.test`;
      await account(teacher, runtime.origin, runtime.inbox, `p8-teacher-${suffix}@example.test`, undefined, 'teacher');
      await account(student, runtime.origin, runtime.inbox, studentEmail, undefined, 'student');
      const name = 'P8 distinct TP publication classroom', room = await classroom(teacher, student, name), detail = await ok(teacher, 'GET', `/classrooms/${room.id}`);
      const change = async operation => ok(teacher, 'POST', `/classrooms/${room.id}/activities`, { revision: (await ok(teacher, 'GET', `/classrooms/${room.id}`)).revision, operation });
      const activities = [];
      for (const type of ['ASSIGNMENT']) {
        const { id } = await change({ action: 'create', type }), title = `P8 ${type}`;
        await change({ action: 'save', id, payload: { title, unitId: detail.units[0].id, topicId: detail.units[0].topics[0].id,
          instructions: 'Preserved original instructions', attachmentRequired: type === 'ASSIGNMENT', instructionFileIds: [], materialIds: [], deadline: null, allowLate: false,
          questions: type === 'ASSIGNMENT' ? [] : [{ type: 'DEVELOPMENT', prompt: 'Explain the original answer', points: '10', scoringRule: null, options: [] }] } });
        await change({ action: 'publish', id }); activities.push({ id, title, type });
      }
      const protectedHash = async () => {
        const rows = [];
        for (const table of ['activities', 'questions', 'question_options', 'attempts', 'answers', 'answer_selections', 'attempt_attachments',
          'files', 'uploads', 'file_custodies', 'grade_corrections']) rows.push((await runtime.db.query(`SELECT to_jsonb(t) value FROM ${table} t ORDER BY to_jsonb(t)::text`)).rows);
        return digest(JSON.stringify(rows));
      };
      const gradeHash = async () => digest(JSON.stringify((await runtime.db.query('SELECT to_jsonb(t) value FROM attempt_grades t ORDER BY id')).rows));
      let failed = false;
      const check = (label, fn) => t.test(label, { skip: failed ? 'Earlier actual publication prerequisite failed' : false }, async () => { try { await fn(); } catch (e) { failed = true; throw e; } });
      for (const activity of activities) await check(`${activity.type} real browser saved correction is explicitly published to its own result and notification`, async () => {
        await openClassroom(student, runtime.origin, name); await selectClassroomSection(student, 'activities', 'Actividades');
        const open = () => activity.type === 'ASSIGNMENT'
          ? openPracticalActivity(student, room.id, activity.id, activity.title) : openActivityOverview(student, activity.title);
        if (activity.type === 'ASSIGNMENT') await openPublicationPractical(student, room.id, activity.id, open);
        else await open();
        if (activity.type === 'ASSIGNMENT') {
          const bytes = await planPdf('P8 immutable submitted file');
          await student.getByLabel('Seleccionar archivo del trabajo', { exact: true }).setInputFiles({ name: 'p8-original.pdf', mimeType: 'application/pdf', buffer: bytes });
          const upload = student.waitForResponse(r => r.url().endsWith('/content') && r.request().method() === 'PUT');
          await student.getByRole('button', { name: 'Subir archivo privado', exact: true }).click(); assert.equal((await upload).status(), 200);
          await student.getByRole('button', { name: 'Revisar entrega', exact: true }).click();
          const submitted = student.waitForResponse(r => r.url().endsWith('/submit-practical'));
          await student.getByRole('button', { name: 'Confirmar envío del trabajo', exact: true }).click(); assert.equal((await submitted).status(), 200);
          await student.getByText('Entrega confirmada.', { exact: true }).waitFor();
        } else {
          await startBrowserAttempt(student, room.id, activity.id, 12000);
          await student.getByRole('textbox', { name: 'Respuesta a la pregunta 1', exact: true }).fill('Actual preserved answer 😀');
          await student.getByRole('button', { name: 'Revisar entrega', exact: true }).click();
          const submitted = student.waitForResponse(r => r.url().endsWith('/submit-answers'));
          await student.getByRole('button', { name: 'Confirmar envío de respuestas', exact: true }).click(); assert.equal((await submitted).status(), 200);
          await student.getByText('Entrega confirmada.', { exact: true }).waitFor();
        }
        activity.attempt = (await ok(student, 'GET', `/classrooms/${room.id}/activities/${activity.id}/session`)).attempt.id;
        const path = `/classrooms/${room.id}/attempts/${activity.attempt}/grading`, before = await protectedHash();
        const previewHash = await gradeHash(); await ok(teacher, 'GET', path); assert.equal(await gradeHash(), previewHash);
        await openClassroom(teacher, runtime.origin, name); await selectClassroomSection(teacher, 'activities', 'Actividades');
        await openTeacherActivity(teacher, activity.title);
        await teacher.getByRole('button', { name: 'Corregir intento 1', exact: true }).click();
        const region = teacher.getByRole('region', { name: 'Corrección privada del intento', exact: true });
        await region.getByText('Corrección privada: el estudiante no ve esta calificación.', { exact: false }).waitFor();
        const entered = activity.type === 'ASSIGNMENT' ? '8,50' : activity.type === 'QUESTIONNAIRE' ? '8,35' : '0';
        await region.getByLabel(activity.type === 'ASSIGNMENT' ? 'Nota final' : 'Puntos de la pregunta 1', { exact: true }).fill(entered);
        await region.getByLabel('Devolución general opcional', { exact: true }).fill('Private general feedback');
        const saved = teacher.waitForResponse(r => r.url().endsWith('/grading') && r.request().method() === 'POST');
        await region.getByRole('button', { name: 'Guardar corrección privada', exact: true }).click(); assert.equal((await saved).status(), 200);
        const expected = activity.type === 'ASSIGNMENT' ? '8.50' : activity.type === 'QUESTIONNAIRE' ? '8.35' : '0.00'; activity.expected = expected;
        await region.getByText(`Nota guardada: ${expected.replace('.', ',')}`, { exact: true }).waitFor();
        assert.equal(await protectedHash(), before);
        const persisted = await ok(teacher, 'GET', path); assert.equal(persisted.grade.finalGrade, expected); assert.equal(persisted.grade.isPublished, false);
        assert.equal(persisted.grade.publishedAt, null); assert.equal((await runtime.db.query('SELECT count(*)::int n FROM attempt_grades WHERE attempt_id=$1', [activity.attempt])).rows[0].n, 1);
        const rejectBefore = await gradeHash(); assert.equal((await request(student, 'GET', path)).status, 403); assert.equal(await gradeHash(), rejectBefore);
        const own = await ok(student, 'GET', `/classrooms/${room.id}/attempts/${activity.attempt}/history`);
        assert.ok(!/"(?:finalGrade|overallFeedback|manualPoints|earned|correct|scoringRule)"/.test(JSON.stringify(own)));
        assert.deepEqual(await ok(student, 'GET', `/classrooms/${room.id}/attempts/${activity.attempt}/result`), { status: 'pending', attemptId: activity.attempt });
        await region.getByLabel('Devolución general opcional', { exact: true }).fill('Unsaved local text must not be released');
        assert.equal(await region.getByRole('button', { name: 'Publicar calificación', exact: true }).isDisabled(), true);
        let reload = teacher.waitForResponse(r => r.url().endsWith('/grading') && r.request().method() === 'GET');
        await region.getByRole('button', { name: 'Recargar corrección', exact: true }).click();
        let response = await reload;
        if (response.status() === 429) {
          const seconds = Number(response.headers()['retry-after']); assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60);
          console.log(`P8 publication visible reload honors actual Retry-After=${seconds}s once`); await delay(seconds * 1000);
          reload = teacher.waitForResponse(r => r.url().endsWith('/grading') && r.request().method() === 'GET');
          await region.getByRole('button', { name: 'Recargar corrección', exact: true }).click(); response = await reload;
        }
        assert.equal(response.status(), 200); assert.equal((await response.json()).grade.finalGrade, expected);
        await teacher.waitForFunction(() => document.querySelector('textarea[aria-label="Devolución general opcional"]')?.value === 'Private general feedback');
        assert.equal(await region.getByRole('alert').count(), 0);
        const sourceState = async () => {
          const rows = [];
          for (const table of ['classrooms', 'student_activities', 'attempt_grades', 'question_grades', 'notifications']) rows.push((await runtime.db.query(`SELECT to_jsonb(t) value FROM ${table} t ORDER BY to_jsonb(t)::text`)).rows);
          return digest(JSON.stringify(rows));
        };
        const cancelBefore = await sourceState();
        await region.getByRole('button', { name: 'Publicar calificación', exact: true }).click();
        await region.getByRole('button', { name: 'Cancelar publicación', exact: true }).click();
        assert.equal(await sourceState(), cancelBefore);
        await region.getByRole('button', { name: 'Publicar calificación', exact: true }).click();
        let publication = teacher.waitForResponse(r => r.url().endsWith('/publish-grade') && r.request().method() === 'POST');
        await region.getByRole('button', { name: 'Confirmar publicación', exact: true }).click();
        let released = await publication;
        if (released.status() === 429) {
          const seconds = Number(released.headers()['retry-after']); assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60);
          console.log(`P8 publication visible confirmation honors actual Retry-After=${seconds}s once`); await delay(seconds * 1000);
          publication = teacher.waitForResponse(r => r.url().endsWith('/publish-grade') && r.request().method() === 'POST');
          await region.getByRole('button', { name: 'Confirmar publicación', exact: true }).click(); released = await publication;
        }
        assert.equal(released.status(), 200); assert.equal((await released.json()).grade.finalGrade, expected);
        await region.getByText('Calificación publicada · solo consulta.', { exact: true }).waitFor();
        assert.equal(await region.getByRole('alert').count(), 0);
        const result = await ok(student, 'GET', `/classrooms/${room.id}/attempts/${activity.attempt}/result`);
        assert.equal(result.status, 'published'); assert.equal(result.grade.finalGrade, expected); assert.equal(result.grade.isEffective, true);
        assert.ok(!/"(?:correct|scoringRule|manualPoints|audit|graded_by_id)"/.test(JSON.stringify(result)));
        assert.equal(result.grade.overallFeedback, 'Private general feedback');
        if (activity.type === 'ASSIGNMENT') {
          assert.equal(result.attachments.length, 1);
          const download = await request(student, 'GET', `/files/${result.attachments[0].id}/content`); assert.equal(download.status, 200);
          assert.equal(download.digest, digest(await runtime.privateFileBytes(result.attachments[0].id)));
        }
        await openClassroom(student, runtime.origin, name);
        await visibleNavigation(student);
        await student.getByRole('button', { name: /^Notificaciones/ }).click();
        const notification = student.locator('.p6-notifications li').filter({ hasText: 'Calificación publicada' }).first();
        const resultResponse = student.waitForResponse(r => r.url().endsWith(`/${activity.attempt}/result`) && r.request().method() === 'GET');
        await notification.getByRole('button', { name: 'Ver devolución', exact: true }).click();
        const opened = await resultResponse; assert.equal(opened.status(), 200); assert.equal((await opened.json()).attempt.id, activity.attempt);
        const resultRegion = student.getByRole('region', { name: 'Resultado publicado del intento', exact: true });
        const gradeDisplay = resultRegion.locator('.p8-final-grade');
        await gradeDisplay.getByText('Calificación publicada', { exact: true }).waitFor();
        assert.equal((await gradeDisplay.locator('strong').innerText()).replace(/\s+/g, ' ').trim(), `${expected.replace('.', ',')} / 10`);
        await gradeDisplay.scrollIntoViewIfNeeded();
        assert.equal(await resultRegion.getByRole('alert').count(), 0);
        assert.equal(await student.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await student.screenshot({ path: join(scratch, `student-result-${activity.type.toLowerCase()}.png`), fullPage: true });
        if (activity.type === 'EVALUATION') await teacher.setViewportSize({ width: 375, height: 812 });
        assert.equal(await teacher.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await teacher.screenshot({ path: join(scratch, `teacher-published-${activity.type.toLowerCase()}.png`), fullPage: true });
        await teacher.setViewportSize({ width: 1280, height: 900 });
        assert.equal(await protectedHash(), before);
      });
      await check('database/private-storage/API restart restores published grades, events and safe results; revocation denies former student', async () => {
        const before = await protectedHash(), grades = await gradeHash(); await runtime.restartData();
        for (const activity of activities) {
          const restored = await ok(teacher, 'GET', `/classrooms/${room.id}/attempts/${activity.attempt}/grading`);
          assert.equal(restored.grade.finalGrade, activity.expected); assert.equal(restored.grade.isPublished, true);
          const result = await ok(student, 'GET', `/classrooms/${room.id}/attempts/${activity.attempt}/result`); assert.equal(result.grade.finalGrade, activity.expected);
        }
        assert.equal(await protectedHash(), before); assert.equal(await gradeHash(), grades);
        assert.equal((await runtime.db.query('SELECT count(*)::int n FROM student_activities WHERE effective_grade_id IS NOT NULL')).rows[0].n, 1);
        assert.equal((await runtime.db.query("SELECT count(*)::int n FROM notifications WHERE event_type::text IN ('GRADE_PUBLISHED','GRADE_CORRECTED')")).rows[0].n, 1);
        assert.equal((await runtime.db.query('SELECT count(*)::int n FROM grade_corrections')).rows[0].n, 0);
        const roomPath = `/classrooms/${room.id}`;
        const resultPath = `${roomPath}/attempts/${activities[0].attempt}/result`;
        const attachment = (await ok(student, 'GET', resultPath)).attachments[0];
        const archive = async archived => ok(teacher, 'POST', `${roomPath}/archive`, {
          archived, revision: (await ok(teacher, 'GET', roomPath)).revision,
        });
        await archive(true);
        assert.equal((await request(student, 'POST', `${roomPath}/leave`, {}, { 'x-csrf-token': 'invalid' })).status, 403);
        await openClassroom(student, runtime.origin, name, 'archived');
        const leave = student.getByRole('button', { name: 'Salir del aula', exact: true });
        await leave.focus();
        await student.keyboard.press('Enter');
        const dialog = student.getByRole('dialog', { name: 'Salir del aula' });
        await dialog.getByText(/Tus entregas confirmadas se conservarán/).waitFor();
        await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
        await dialog.waitFor({ state: 'hidden' });
        await student.waitForFunction(() => document.activeElement?.textContent?.trim() === 'Salir del aula');
        assert.equal((await ok(student, 'GET', roomPath)).archived, true);
        await leave.click();
        const confirmLeave = dialog.getByRole('button', { name: 'Confirmar salida', exact: true });
        let releaseLeave;
        const release = new Promise(resolve => { releaseLeave = resolve; });
        await student.route('**/leave', async route => {
          await release;
          await route.fulfill({ status: 503, json: { error: { code: 'SERVICE_UNAVAILABLE' } } });
        }, { times: 1 });
        try {
          await confirmLeave.click();
          await dialog.getByRole('button', { name: 'Procesando…' }).waitFor();
          assert.equal(await dialog.getByRole('button', { name: 'Procesando…' }).isDisabled(), true);
        } finally { releaseLeave(); }
        await dialog.getByRole('alert').waitFor();
        await confirmLeave.focus();
        await student.keyboard.press('Enter');
        await student.getByRole('status').filter({ hasText: 'Saliste del aula' }).waitFor();
        await student.getByRole('heading', { name, exact: true }).waitFor({ state: 'hidden' });
        for (const path of [roomPath, resultPath, `${roomPath}/attempts/${activities[0].attempt}/history`, `/files/${attachment.id}/content`]) {
          assert.equal((await request(student, 'GET', path)).status, 403, path);
        }
        const event = (await runtime.db.query("SELECT id FROM notifications WHERE event_type='GRADE_PUBLISHED' ORDER BY created_at LIMIT 1")).rows[0];
        assert.equal((await request(student, 'POST', `/classrooms/notifications/${event.id}/open`, {})).status, 403);
        assert.equal((await ok(teacher, 'GET', roomPath)).archived, true);
        assert.equal((await ok(teacher, 'GET', resultPath)).grade.finalGrade, activities[0].expected);
        assert.equal(await protectedHash(), before);
        assert.equal(await gradeHash(), grades);
        await archive(false);
        assert.equal((await request(student, 'POST', '/classrooms/codes/preview', { code: room.code })).status, 409);
        const invitation = await ok(teacher, 'POST', `${roomPath}/invitations`, { email: studentEmail });
        await ok(student, 'POST', `/classrooms/invitations/${invitation.id}/accept`, {});
        assert.equal((await ok(student, 'GET', resultPath)).grade.finalGrade, activities[0].expected);
        assert.equal((await request(student, 'GET', `/files/${attachment.id}/content`)).status, 200);
        assert.equal(await protectedHash(), before);
        assert.equal(await gradeHash(), grades);
        const session = await ok(student, 'GET', '/auth/session'), studentId = session.user.id;
        await ok(teacher, 'POST', `/classrooms/${room.id}/members/${studentId}/remove`, {});
        const state = digest(JSON.stringify((await runtime.db.query('SELECT to_jsonb(t) value FROM notifications t ORDER BY id')).rows));
        assert.equal((await request(student, 'GET', `/classrooms/${room.id}/attempts/${activities[0].attempt}/result`)).status, 403);
        assert.equal((await request(student, 'POST', `/classrooms/notifications/${event.id}/open`, {})).status, 403);
        assert.equal(digest(JSON.stringify((await runtime.db.query('SELECT to_jsonb(t) value FROM notifications t ORDER BY id')).rows)), state);
        assert.equal((await ok(teacher, 'GET', `/classrooms/${room.id}/attempts/${activities[0].attempt}/result`)).status, 'published');
        assert.deepEqual(errors, []);
      });
    } finally { await browser.close(); }
  }, { classrooms: true });
});
