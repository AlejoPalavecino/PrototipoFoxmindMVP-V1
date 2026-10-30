import { startBrowserAttempt } from './helpers/browser-admission-step.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { setTimeout as delay } from 'node:timers/promises';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';
import { account, api, digest } from './p4-integration-helpers.mjs';
import { classroom, openClassroom } from './p6-integration-helpers.mjs';

async function request(page, method, path, body, headers) {
  let response = await api(page, method, path, body, headers);
  if (response.status === 429) {
    const seconds = Number(response.headers['retry-after']);
    assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60);
    console.log(`P8 E fixture actual ${method} ${path} status429 Retry-After=${seconds}s; one admitted request re-entry`);
    await delay(seconds * 1000);
    response = await api(page, method, path, body, headers);
  }
  return response;
}
async function ok(...args) {
  const response = await request(...args);
  assert.equal(response.status, 200, `${args[1]} ${args[2]}`);
  return response.body;
}

/** A rejected result is not success; only a real bounded Retry-After permits one visible reopen. */
async function openCorrectedNotificationResult(page, attemptId) {
  async function openFromCenter() {
    await page.getByRole('button', { name: /^Notificaciones/ }).click();
    const notification = page.locator('.p6-notifications li').filter({ hasText: 'Calificación corregida' }).first();
    const opening = page.waitForResponse(response => /\/notifications\/[^/]+\/open$/.test(new URL(response.url()).pathname)
      && response.request().method() === 'POST');
    const result = page.waitForResponse(response => response.url().endsWith('/' + attemptId + '/result') && response.request().method() === 'GET');
    await notification.getByRole('button', { name: 'Ver devolución', exact: true }).click();
    const [opened, own] = await Promise.all([opening, result]);
    assert.equal(opened.status(), 200); const target = await opened.json();
    assert.equal(target.kind, 'grade'); assert.equal(target.attemptId, attemptId);
    return own;
  }
  let ownResponse = await openFromCenter();
  if (ownResponse.status() === 429) {
    const seconds = Number(ownResponse.headers()['retry-after']);
    assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60);
    const ownRegion = page.getByRole('region', { name: 'Resultado publicado del intento', exact: true });
    await ownRegion.getByRole('alert').waitFor();
    assert.equal(await ownRegion.locator('.p8-final-grade').count(), 0);
    console.log('P8 notification result actual GET ' + new URL(ownResponse.url()).pathname + ' status429 Retry-After=' + seconds + 's; one visible notification reopen');
    await delay(seconds * 1000);
    await page.getByRole('dialog', { name: 'Mi historial de intentos', exact: true })
      .getByRole('button', { name: 'Cerrar diálogo', exact: true }).click();
    ownResponse = await openFromCenter();
  }
  assert.equal(ownResponse.status(), 200);
  return ownResponse;
}

test('P8 authorized E-only notification-result, persisted restart and current-access proof', { timeout: 330000 }, async t => {
  await withP4IntegrationRuntime(async runtime => {
    const scratch = await mkdtemp(join(tmpdir(), 'foxmind-p8-corrections-e-final-'));
    console.log(`P8 retained E-only evidence: ${scratch}`);
    const browser = await chromium.launch({ headless: true }), responses = [];
    try {
      const teacher = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
      const student = await (await browser.newContext({ viewport: { width: 375, height: 812 } })).newPage();
      const errors = [];
      for (const [index, page] of [teacher, student].entries()) {
        page.setDefaultTimeout(12000); page.on('pageerror', error => errors.push(error.message));
        page.on('response', response => {
          const path = new URL(response.url()).pathname;
          if (path.startsWith('/api/v1/classrooms')) responses.push({ page: index === 0 ? 'teacher' : 'student',
            method: response.request().method(), path, status: response.status(), retryAfter: response.headers()['retry-after'] ?? null });
        });
      }
      const suffix = Date.now();
      const teacherUser = await account(teacher, runtime.origin, runtime.inbox, `p8-e-final-teacher-${suffix}@example.test`);
      const studentUser = await account(student, runtime.origin, runtime.inbox, `p8-e-final-student-${suffix}@example.test`);
      const name = 'P8 E final correction classroom', room = await classroom(teacher, student, name);
      const detail = await ok(teacher, 'GET', `/classrooms/${room.id}`);
      const change = async operation => ok(teacher, 'POST', `/classrooms/${room.id}/activities`, {
        revision: (await ok(teacher, 'GET', `/classrooms/${room.id}`)).revision, operation });
      const { id: activityId } = await change({ action: 'create', type: 'EVALUATION' });
      const title = 'P8 E final published correction';
      await change({ action: 'save', id: activityId, payload: { title, unitId: detail.units[0].id, topicId: detail.units[0].topics[0].id,
        instructions: 'Preserved E final instructions', attachmentRequired: false, instructionFileIds: [], materialIds: [], deadline: null, allowLate: false,
        questions: [{ type: 'DEVELOPMENT', prompt: 'Preserved E final question', points: '10', scoringRule: null, options: [] }] } });
      await change({ action: 'publish', id: activityId });
      async function tableHash(tables) {
        const rows = [];
        for (const table of tables) rows.push((await runtime.db.query(`SELECT to_jsonb(t) value FROM ${table} t ORDER BY to_jsonb(t)::text`)).rows);
        return digest(JSON.stringify(rows));
      }
      const evidenceTables = ['activities', 'questions', 'question_options', 'attempts', 'answers', 'answer_selections', 'attempt_attachments',
        'files', 'uploads', 'file_custodies', 'question_grades', 'student_activities'];
      const domainTables = [...evidenceTables, 'classrooms', 'enrollments', 'membership_periods', 'attempt_grades', 'grade_corrections', 'notifications'];
      let attemptId, gradeId, publishedAt, expectedAudit, failed = false;
      const check = (label, work) => t.test(label, { skip: failed ? 'Earlier E-only prerequisite failed' : false }, async () => {
        try { await work(); } catch (error) { failed = true; throw error; }
      });
      await check('real E submission and same-attempt published-zero correction establish only required prerequisites', async () => {
        await openClassroom(student, runtime.origin, name); await student.getByRole('button', { name: 'Actividades', exact: true }).click();
        await student.getByRole('article', { name: title, exact: true }).getByRole('button', { name: 'Consultar actividad', exact: true }).click();
        await startBrowserAttempt(student, room.id, activityId, 12000);
        await student.getByRole('textbox', { name: 'Respuesta a la pregunta 1', exact: true }).fill('Original E answer remains unchanged 😀');
        await student.getByRole('button', { name: 'Enviar respuestas', exact: true }).click();
        const submitResponse = student.waitForResponse(response => response.url().endsWith('/submit-answers') && response.request().method() === 'POST');
        await student.getByRole('button', { name: 'Confirmar envío de respuestas', exact: true }).click();
        assert.equal((await submitResponse).status(), 200);
        await student.getByText('Entrega confirmada.', { exact: true }).waitFor();
        attemptId = (await ok(student, 'GET', `/classrooms/${room.id}/activities/${activityId}/session`)).attempt.id;
        await openClassroom(teacher, runtime.origin, name); await teacher.getByRole('button', { name: 'Actividades', exact: true }).click();
        await teacher.getByRole('article', { name: title, exact: true }).getByRole('button', { name: 'Ver entregas recibidas', exact: true }).click();
        await teacher.getByRole('button', { name: 'Corregir intento 1', exact: true }).click();
        const grading = teacher.getByRole('region', { name: 'Corrección privada del intento', exact: true });
        await grading.getByLabel('Puntos de la pregunta 1', { exact: true }).fill('6');
        await grading.getByLabel('Devolución general opcional', { exact: true }).fill('Preserved E overall feedback');
        const saveResponse = teacher.waitForResponse(response => response.url().endsWith('/grading') && response.request().method() === 'POST');
        await grading.getByRole('button', { name: 'Guardar corrección privada', exact: true }).click();
        assert.equal((await saveResponse).status(), 200);
        await grading.getByText('Corrección privada guardada. No se ha publicado.', { exact: true }).waitFor();
        await grading.getByRole('button', { name: 'Publicar calificación', exact: true }).click();
        const publishResponse = teacher.waitForResponse(response => response.url().endsWith('/publish-grade') && response.request().method() === 'POST');
        const initialAuditResponse = teacher.waitForResponse(response => response.url().endsWith('/grade-corrections') && response.request().method() === 'GET');
        await grading.getByRole('button', { name: 'Confirmar publicación', exact: true }).click();
        assert.equal((await publishResponse).status(), 200);
        const firstAudit = await initialAuditResponse; assert.equal(firstAudit.status(), 200);
        const original = await firstAudit.json(); gradeId = original.grade.id; publishedAt = original.grade.publishedAt;
        const correction = teacher.getByRole('region', { name: 'Rectificación de calificación publicada', exact: true });
        await correction.getByText('No hay rectificaciones registradas.', { exact: true }).waitFor();
        const evidence = await tableHash(evidenceTables);
        await correction.getByLabel('Nueva calificación publicada', { exact: true }).fill('0');
        await correction.getByLabel('Motivo de la rectificación', { exact: true }).fill('Private E-only correction rationale 😀');
        await correction.getByRole('button', { name: 'Rectificar calificación', exact: true }).click();
        const correctResponse = teacher.waitForResponse(response => response.url().endsWith('/grade-corrections') && response.request().method() === 'POST');
        const freshAuditResponse = teacher.waitForResponse(response => response.url().endsWith('/grade-corrections') && response.request().method() === 'GET');
        const freshGradeResponse = teacher.waitForResponse(response => response.url().endsWith('/grading') && response.request().method() === 'GET');
        await correction.getByRole('button', { name: 'Confirmar rectificación', exact: true }).click();
        const corrected = await correctResponse; assert.equal(corrected.status(), 200);
        const audit = await freshAuditResponse; assert.equal(audit.status(), 200); expectedAudit = await audit.json();
        const refreshed = await freshGradeResponse; assert.equal(refreshed.status(), 200); assert.equal((await refreshed.json()).grade.finalGrade, '0.00');
        await correction.getByText('Calificación rectificada y estado actualizado.', { exact: false }).waitFor();
        assert.equal(expectedAudit.grade.id, gradeId); assert.equal(expectedAudit.grade.finalGrade, '0.00'); assert.equal(expectedAudit.grade.publishedAt, publishedAt);
        assert.equal(expectedAudit.corrections.length, 1); assert.equal(expectedAudit.corrections[0].previousGrade, '6.00');
        assert.equal(expectedAudit.corrections[0].newGrade, '0.00'); assert.equal(expectedAudit.corrections[0].actor.id, teacherUser.id);
        assert.equal(await tableHash(evidenceTables), evidence); assert.equal(await grading.getByRole('alert').count(), 0);
        await teacher.setViewportSize({ width: 375, height: 812 });
        await correction.getByText('6,00 → 0,00', { exact: true }).scrollIntoViewIfNeeded();
        assert.equal(await teacher.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await teacher.screenshot({ path: join(scratch, 'teacher-e-zero-audit.png'), fullPage: true });
      });
      await check('actual corrected E notification opens the exact own zero result with admitted clean mobile UI and no audit', async () => {
        await openClassroom(student, runtime.origin, name);
        const ownResponse = await openCorrectedNotificationResult(student, attemptId);
        const own = await ownResponse.json();
        assert.equal(own.status, 'published'); assert.equal(own.attempt.id, attemptId); assert.equal(own.grade.id, gradeId);
        assert.equal(own.grade.finalGrade, '0.00'); assert.equal(own.grade.isEffective, true); assert.equal(own.grade.publishedAt, publishedAt);
        assert.ok(!/Private E-only correction rationale|"(?:corrections|reason|actor|audit|correct|scoringRule)"/.test(JSON.stringify(own)));
        const resultRegion = student.getByRole('region', { name: 'Resultado publicado del intento', exact: true });
        const gradeDisplay = resultRegion.locator('.p8-final-grade');
        await gradeDisplay.getByText('Calificación publicada', { exact: true }).waitFor();
        assert.equal((await gradeDisplay.locator('strong').innerText()).replace(/\s+/g, ' ').trim(), `${'0,00'} / 10`);
        await gradeDisplay.scrollIntoViewIfNeeded();
        assert.ok(!(await resultRegion.innerText()).includes('Private E-only correction rationale'));
        assert.equal(await resultRegion.getByRole('alert').count(), 0);
        assert.equal(await student.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await student.screenshot({ path: join(scratch, 'student-e-corrected-zero.png'), fullPage: true });
      });
      await check('data/storage/API restart preserves corrected grade/audit/event/pointer; revoked and signed-out operations remain write-free', async () => {
        const before = await tableHash(domainTables); await runtime.restartData(); assert.equal(await tableHash(domainTables), before);
        const path = `/classrooms/${room.id}/attempts/${attemptId}`;
        assert.deepEqual(await ok(teacher, 'GET', `${path}/grade-corrections`), expectedAudit);
        const result = await ok(student, 'GET', `${path}/result`);
        assert.equal(result.grade.id, gradeId); assert.equal(result.grade.finalGrade, '0.00'); assert.equal(result.grade.isEffective, true);
        const pointer = await runtime.db.query('SELECT effective_grade_id FROM student_activities WHERE id=(SELECT student_activity_id FROM attempts WHERE id=$1)', [attemptId]);
        assert.equal(pointer.rows[0].effective_grade_id, gradeId);
        const events = await ok(student, 'GET', '/classrooms/notifications'), correctedEvents = events.filter(row => row.eventType === 'GRADE_CORRECTED');
        assert.equal(correctedEvents.length, 1); assert.equal(correctedEvents[0].attemptId, attemptId); assert.equal(correctedEvents[0].gradeId, gradeId);
        const eventId = correctedEvents[0].id;
        await ok(teacher, 'POST', `/classrooms/${room.id}/members/${studentUser.id}/remove`, {});
        const removed = await tableHash(domainTables);
        assert.equal((await request(student, 'GET', `${path}/result`)).status, 403);
        assert.equal((await request(student, 'GET', `${path}/grade-corrections`)).status, 403);
        assert.equal((await request(student, 'POST', `/classrooms/notifications/${eventId}/open`, {})).status, 403);
        assert.equal((await request(student, 'POST', `/classrooms/notifications/${eventId}/read`, {})).status, 403);
        assert.ok(!(await ok(student, 'GET', '/classrooms/notifications')).some(row => row.id === eventId));
        assert.equal(await tableHash(domainTables), removed);
        const historical = await ok(teacher, 'GET', `${path}/grade-corrections`);
        assert.deepEqual(historical.corrections, expectedAudit.corrections); assert.equal(historical.grade.finalGrade, '0.00');
        assert.equal((await ok(teacher, 'GET', `${path}/result`)).grade.finalGrade, '0.00');
        const cookie = (await teacher.context().cookies()).map(row => `${row.name}=${row.value}`).join('; ');
        const csrf = await teacher.evaluate(async () => (await (await fetch('/api/v1/auth/csrf')).json()).csrfToken);
        assert.equal((await request(teacher, 'POST', '/auth/logout', {})).status, 204);
        const stale = await fetch(`${runtime.origin}/api/v1${path}/grade-corrections`, { method: 'POST',
          headers: { cookie, origin: runtime.origin, 'content-type': 'application/json', 'x-csrf-token': csrf },
          body: JSON.stringify({ revision: historical.revision, newGrade: '1', reason: 'Signed-out stale session', confirm: true }) });
        responses.push({ page: 'signed-out stale session', method: 'POST', path: `/api/v1${path}/grade-corrections`, status: stale.status,
          retryAfter: stale.headers.get('retry-after') });
        assert.ok([401, 403].includes(stale.status)); assert.equal(await tableHash(domainTables), removed);
        assert.deepEqual(errors, []);
      });
    } finally {
      await writeFile(join(scratch, 'safe-responses.json'), JSON.stringify(responses, null, 2));
      await browser.close();
    }
  }, { classrooms: true });
});
