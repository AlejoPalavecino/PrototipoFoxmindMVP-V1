import { visibleNavigation } from './entry-glass-browser-helpers.mjs';
import { startBrowserAttempt, openActivityOverview, openPracticalActivity, openTeacherActivity, selectClassroomSection } from './p8-current-ui-helpers.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { setTimeout as delay } from 'node:timers/promises';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';
import { account, api, digest } from './p4-integration-helpers.mjs';
import { classroom, openClassroom, planPdf } from './p6-integration-helpers.mjs';
import { openPublicationPractical } from './p8-publication-browser-helpers.mjs';

async function request(page, method, path, body, headers) {
  let response = await api(page, method, path, body, headers);
  if (response.status === 429) {
    const seconds = Number(response.headers['retry-after']); assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60);
    console.log(`P8 correction fixture honors actual Retry-After=${seconds}s once`); await delay(seconds * 1000);
    response = await api(page, method, path, body, headers);
  }
  return response;
}
async function ok(...args) { const response = await request(...args); assert.equal(response.status, 200, `${args[1]} ${args[2]}`); return response.body; }

/** A rejected result is not success; only a real bounded Retry-After permits one visible reopen. */
async function openCorrectedNotificationResult(page, attemptId) {
  async function openFromCenter() {
    await visibleNavigation(page);
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
    await page.getByRole('region', { name: 'Mi historial de intentos', exact: true })
      .getByRole('button', { name: 'Volver a actividades', exact: true }).click();
    ownResponse = await openFromCenter();
  }
  assert.equal(ownResponse.status(), 200);
  return ownResponse;
}


test('P8 actual all-type published final correction, teacher-only audit, student notification, clean reload and restart', { timeout: 330000 }, async t => {
  await withP4IntegrationRuntime(async runtime => {
    const scratch = await mkdtemp(join(tmpdir(), 'foxmind-p8-corrections-')); console.log(`P8 retained correction browser evidence: ${scratch}`);
    const browser = await chromium.launch({ headless: true });
    const responses = [];
    try {
      const teacher = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
      const student = await (await browser.newContext({ viewport: { width: 375, height: 812 } })).newPage();
      const errors = [];
      for (const [index, page] of [teacher, student].entries()) {
        page.setDefaultTimeout(12000); page.on('pageerror', e => errors.push(e.message));
        page.on('response', response => {
          const path = new URL(response.url()).pathname;
          if (path.startsWith('/api/v1/classrooms')) responses.push({ page: index === 0 ? 'teacher' : 'student',
            method: response.request().method(), path, status: response.status(), retryAfter: response.headers()['retry-after'] ?? null, response });
        });
      }
      async function observedResponse(path, method, after) {
        const deadline = Date.now() + 12000;
        while (Date.now() < deadline) {
          const row = responses.slice(after).find(row => row.page === 'teacher' && row.path === path && row.method === method);
          if (row) return row.response;
          await delay(25);
        }
        assert.fail(`Missing actual ${method} ${path}`);
      }
      const suffix = Date.now(); await account(teacher, runtime.origin, runtime.inbox, `p8-correction-teacher-${suffix}@example.test`, undefined, "teacher");
      const studentUser = await account(student, runtime.origin, runtime.inbox, `p8-correction-student-${suffix}@example.test`, undefined, "student");
      const name = 'P8 correction classroom', room = await classroom(teacher, student, name), detail = await ok(teacher, 'GET', `/classrooms/${room.id}`);
      const change = async operation => ok(teacher, 'POST', `/classrooms/${room.id}/activities`, { revision: (await ok(teacher, 'GET', `/classrooms/${room.id}`)).revision, operation });
      const activities = [];
      for (const type of ['ASSIGNMENT', 'QUESTIONNAIRE', 'EVALUATION']) {
        const { id } = await change({ action: 'create', type }), title = `P8 rectification ${type}`;
        await change({ action: 'save', id, payload: { title, unitId: detail.units[0].id, topicId: detail.units[0].topics[0].id,
          instructions: 'Immutable correction instructions', attachmentRequired: type === 'ASSIGNMENT', instructionFileIds: [], materialIds: [], deadline: null, allowLate: false,
          questions: type === 'ASSIGNMENT' ? [] : [{ type: 'DEVELOPMENT', prompt: 'Preserved development answer', points: '10', scoringRule: null, options: [] }] } });
        await change({ action: 'publish', id }); activities.push({ id, title, type });
      }
      const hash = async tables => digest(JSON.stringify(await Promise.all(tables.map(async table =>
        (await runtime.db.query(`SELECT to_jsonb(t) value FROM ${table} t ORDER BY to_jsonb(t)::text`)).rows))));
      const evidenceTables = ['activities', 'questions', 'question_options', 'attempts', 'answers', 'answer_selections', 'attempt_attachments', 'files', 'uploads', 'file_custodies', 'question_grades', 'student_activities'];
      const domainTables = [...evidenceTables, 'classrooms', 'attempt_grades', 'grade_corrections', 'notifications'];
      let failed = false;
      const check = (label, work) => t.test(label, { skip: failed ? 'Earlier actual correction prerequisite failed' : false }, async () => {
        try { await work(); } catch (e) { failed = true; throw e; }
      });
      for (const activity of activities) await check(`${activity.type} actual submission/private grading/publication -> reason/cancel/confirmed correction -> clean safe own result`, async () => {
        await openClassroom(student, runtime.origin, name); await selectClassroomSection(student, 'activities', 'Actividades');
        const open = () => activity.type === 'ASSIGNMENT'
          ? openPracticalActivity(student, room.id, activity.id, activity.title) : openActivityOverview(student, activity.title);
        if (activity.type === 'ASSIGNMENT') {
          await openPublicationPractical(student, room.id, activity.id, open);
          const bytes = await planPdf('P8 correction immutable submitted PDF');
          await student.getByLabel('Seleccionar archivo del trabajo', { exact: true }).setInputFiles({ name: 'p8-correction-original.pdf', mimeType: 'application/pdf', buffer: bytes });
          const uploaded = student.waitForResponse(r => r.url().endsWith('/content') && r.request().method() === 'PUT');
          await student.getByRole('button', { name: 'Subir archivo privado', exact: true }).click(); assert.equal((await uploaded).status(), 200);
          await student.getByRole('button', { name: 'Revisar entrega', exact: true }).click();
          const submitted = student.waitForResponse(r => r.url().endsWith('/submit-practical'));
          await student.getByRole('button', { name: 'Confirmar envío del trabajo', exact: true }).click(); assert.equal((await submitted).status(), 200);
          await student.getByText('Entrega confirmada.', { exact: true }).waitFor();
        } else {
          await open(); await startBrowserAttempt(student, room.id, activity.id, 12000);
          await student.getByRole('textbox', { name: 'Respuesta a la pregunta 1', exact: true }).fill('Original answer remains unchanged 😀');
          await student.getByRole('button', { name: 'Revisar entrega', exact: true }).click();
          const submitted = student.waitForResponse(r => r.url().endsWith('/submit-answers'));
          await student.getByRole('button', { name: 'Confirmar envío de respuestas', exact: true }).click(); assert.equal((await submitted).status(), 200);
          await student.getByText('Entrega confirmada.', { exact: true }).waitFor();
        }
        activity.attempt = (await ok(student, 'GET', `/classrooms/${room.id}/activities/${activity.id}/session`)).attempt.id;
        const base = `/classrooms/${room.id}/attempts/${activity.attempt}`, path = `${base}/grade-corrections`;
        await openClassroom(teacher, runtime.origin, name); await selectClassroomSection(teacher, 'activities', 'Actividades');
        await openTeacherActivity(teacher, activity.title);
        await teacher.getByRole('button', { name: 'Corregir intento 1', exact: true }).click();
        const grading = teacher.getByRole('region', { name: 'Corrección privada del intento', exact: true });
        await grading.getByLabel(activity.type === 'ASSIGNMENT' ? 'Nota final' : 'Puntos de la pregunta 1', { exact: true }).fill('6');
        await grading.getByLabel('Devolución general opcional', { exact: true }).fill('Preserved overall feedback');
        let observed = teacher.waitForResponse(r => r.url().endsWith('/grading') && r.request().method() === 'POST');
        await grading.getByRole('button', { name: 'Guardar corrección privada', exact: true }).click(); assert.equal((await observed).status(), 200);
        await grading.getByText('Corrección privada guardada. No se ha publicado.', { exact: true }).waitFor();
        await grading.getByRole('button', { name: 'Publicar calificación', exact: true }).click();
        const published = teacher.waitForResponse(r => r.url().endsWith('/publish-grade') && r.request().method() === 'POST');
        const firstAudit = teacher.waitForResponse(r => r.url().endsWith('/grade-corrections') && r.request().method() === 'GET');
        await grading.getByRole('button', { name: 'Confirmar publicación', exact: true }).click(); assert.equal((await published).status(), 200);
        const auditResponse = await firstAudit; assert.equal(auditResponse.status(), 200); const original = await auditResponse.json();
        activity.publishedAt = original.grade.publishedAt;
        const correction = teacher.getByRole('region', { name: 'Rectificación de calificación publicada', exact: true });
        await correction.getByText('No hay rectificaciones registradas.', { exact: true }).waitFor();
        const before = await hash(domainTables), immutable = await hash(evidenceTables);
        assert.equal((await request(student, 'GET', path)).status, 403);
        assert.equal((await request(student, 'POST', path, { revision: original.revision, newGrade: '9', reason: 'Not teacher', confirm: true })).status, 403);
        assert.equal((await request(teacher, 'POST', path, { revision: original.revision, newGrade: '9', reason: ' ', confirm: true })).status, 400);
        assert.equal(await hash(domainTables), before);
        await correction.getByLabel('Nueva calificación publicada', { exact: true }).fill('8,345');
        await correction.getByLabel('Motivo de la rectificación', { exact: true }).fill('Teacher-only actual rationale 😀');
        assert.equal(await correction.getByRole('button', { name: 'Rectificar calificación', exact: true }).isDisabled(), true);
        activity.expected = activity.type === 'EVALUATION' ? '0.00' : '8.35';
        await correction.getByLabel('Nueva calificación publicada', { exact: true }).fill(activity.expected.replace('.', ','));
        await correction.getByLabel('Motivo de la rectificación', { exact: true }).fill('');
        assert.equal(await correction.getByRole('button', { name: 'Rectificar calificación', exact: true }).isDisabled(), true);
        await correction.getByLabel('Motivo de la rectificación', { exact: true }).fill('Teacher-only actual rationale 😀');
        await correction.getByRole('button', { name: 'Rectificar calificación', exact: true }).click();
        await correction.getByRole('button', { name: 'Cancelar rectificación', exact: true }).click(); assert.equal(await hash(domainTables), before);
        await correction.getByRole('button', { name: 'Rectificar calificación', exact: true }).click();
        const committed = teacher.waitForResponse(r => r.url().endsWith('/grade-corrections') && r.request().method() === 'POST');
        const after = responses.length;
        await correction.getByRole('button', { name: 'Confirmar rectificación', exact: true }).click();
        const post = await committed; assert.equal(post.status(), 200); const corrected = await post.json();
        const current = await observedResponse(`/api/v1${path}`, 'GET', after);
        let limited = current.status() === 429 ? current : null;
        if (!limited) {
          assert.equal(current.status(), 200); assert.equal((await current.json()).grade.finalGrade, activity.expected);
          const gradingResponse = await observedResponse(`/api/v1${base}/grading`, 'GET', after);
          if (gradingResponse.status() === 429) limited = gradingResponse;
          else { assert.equal(gradingResponse.status(), 200); assert.equal((await gradingResponse.json()).grade.finalGrade, activity.expected); }
        }
        if (limited) {
          const seconds = Number(limited.headers()['retry-after']);
          assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60);
          await correction.getByRole('alert').waitFor();
          assert.equal(await correction.getByText('Calificación rectificada y estado actualizado.', { exact: false }).count(), 0);
          console.log(`P8 remaining visible ${limited.request().method()} ${new URL(limited.url()).pathname} status429 Retry-After=${seconds}s; one visible reload after the observed wait`);
          await delay(seconds * 1000);
          const refreshGrade = teacher.waitForResponse(r => r.url().endsWith('/grading') && r.request().method() === 'GET');
          await grading.getByRole('button', { name: 'Recargar corrección', exact: true }).click();
          const grade200 = await refreshGrade; assert.equal(grade200.status(), 200); assert.equal((await grade200.json()).grade.finalGrade, activity.expected);
          const refreshAudit = teacher.waitForResponse(r => r.url().endsWith('/grade-corrections') && r.request().method() === 'GET');
          await correction.getByRole('button', { name: 'Recargar rectificaciones', exact: true }).click();
          const audit200 = await refreshAudit; assert.equal(audit200.status(), 200); assert.equal((await audit200.json()).grade.finalGrade, activity.expected);
        } else await correction.getByText('Calificación rectificada y estado actualizado.', { exact: false }).waitFor();
        await correction.getByText(`6,00 → ${activity.expected.replace('.', ',')}`, { exact: true }).waitFor();
        assert.equal(corrected.corrections[0].previousGrade, '6.00'); assert.equal(corrected.corrections[0].newGrade, activity.expected);
        assert.equal(corrected.corrections[0].reason, 'Teacher-only actual rationale 😀'); assert.equal(corrected.grade.publishedAt, activity.publishedAt);
        assert.equal(await correction.getByRole('alert').count(), 0); assert.equal(await grading.getByRole('alert').count(), 0);
        const reload = teacher.waitForResponse(r => r.url().endsWith('/grade-corrections') && r.request().method() === 'GET');
        await correction.getByRole('button', { name: 'Recargar rectificaciones', exact: true }).click();
        const reloaded = await reload; assert.equal(reloaded.status(), 200); assert.equal((await reloaded.json()).grade.finalGrade, activity.expected);
        assert.equal(await correction.getByRole('alert').count(), 0); assert.equal(await hash(evidenceTables), immutable);
        const result = await ok(student, 'GET', `${base}/result`); assert.equal(result.grade.finalGrade, activity.expected); assert.equal(result.grade.isEffective, true);
        assert.ok(!/Teacher-only actual rationale|"(?:corrections|reason|actor|audit|correct|scoringRule)"/.test(JSON.stringify(result)));
        assert.equal(result.grade.overallFeedback, 'Preserved overall feedback');
        if (activity.type === 'ASSIGNMENT') {
          const file = result.attachments[0]; assert.ok(file.ready);
          const download = await request(student, 'GET', `/files/${file.id}/content`); assert.equal(download.status, 200);
          assert.equal(download.digest, digest(await runtime.privateFileBytes(file.id)));
        }
        await teacher.setViewportSize({ width: 375, height: 812 });
        await correction.getByText(`6,00 → ${activity.expected.replace('.', ',')}`, { exact: true }).scrollIntoViewIfNeeded();
        assert.equal(await teacher.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await teacher.screenshot({ path: join(scratch, `teacher-audit-${activity.type.toLowerCase()}.png`), fullPage: true });
        await teacher.setViewportSize({ width: 1280, height: 900 });
        await openClassroom(student, runtime.origin, name);
        const ownResponse = await openCorrectedNotificationResult(student, activity.attempt);
        assert.equal((await ownResponse.json()).attempt.id, activity.attempt);
        const own = student.getByRole('region', { name: 'Resultado publicado del intento', exact: true });
        const gradeDisplay = own.locator('.p8-final-grade');
        await gradeDisplay.getByText('Calificación publicada', { exact: true }).waitFor();
        assert.equal((await gradeDisplay.locator('strong').innerText()).replace(/\s+/g, ' ').trim(), `${activity.expected.replace('.', ',')} / 10`);
        await gradeDisplay.scrollIntoViewIfNeeded();
        assert.ok(!(await own.innerText()).includes('Teacher-only actual rationale')); assert.equal(await own.getByRole('alert').count(), 0);
        assert.equal(await student.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await student.screenshot({ path: join(scratch, `student-corrected-${activity.type.toLowerCase()}.png`), fullPage: true });
        assert.equal(await hash(evidenceTables), immutable);
      });
      await check('restart preserves audit and final values; revoked membership and signed-out teacher cannot mutate/open', async () => {
        const before = await hash(domainTables); await runtime.restartData(); assert.equal(await hash(domainTables), before);
        for (const activity of activities) {
          const audit = await ok(teacher, 'GET', `/classrooms/${room.id}/attempts/${activity.attempt}/grade-corrections`);
          assert.equal(audit.grade.finalGrade, activity.expected); assert.equal(audit.grade.publishedAt, activity.publishedAt); assert.equal(audit.corrections.length, 1);
          assert.equal((await ok(student, 'GET', `/classrooms/${room.id}/attempts/${activity.attempt}/result`)).grade.finalGrade, activity.expected);
        }
        const events = await ok(student, 'GET', '/classrooms/notifications'), event = events.find(row => row.eventType === 'GRADE_CORRECTED');
        assert.equal(events.filter(row => row.eventType === 'GRADE_CORRECTED').length, 3);
        await ok(teacher, 'POST', `/classrooms/${room.id}/members/${studentUser.id}/remove`, {});
        const removed = await hash(domainTables);
        assert.equal((await request(student, 'POST', `/classrooms/notifications/${event.id}/open`, {})).status, 403);
        assert.equal((await request(student, 'GET', `/classrooms/${room.id}/attempts/${activities[0].attempt}/result`)).status, 403);
        assert.equal(await hash(domainTables), removed);
        const audit = await ok(teacher, 'GET', `/classrooms/${room.id}/attempts/${activities[0].attempt}/grade-corrections`);
        const cookie = (await teacher.context().cookies()).map(row => `${row.name}=${row.value}`).join('; ');
        const csrf = await teacher.evaluate(async () => (await (await fetch('/api/v1/auth/csrf')).json()).csrfToken);
        assert.equal((await request(teacher, 'POST', '/auth/logout', {})).status, 204);
        const stale = await fetch(`${runtime.origin}/api/v1/classrooms/${room.id}/attempts/${activities[0].attempt}/grade-corrections`, {
          method: 'POST', headers: { cookie, origin: runtime.origin, 'content-type': 'application/json', 'x-csrf-token': csrf },
          body: JSON.stringify({ revision: audit.revision, newGrade: '1', reason: 'Stale session', confirm: true }) });
        assert.ok([401, 403].includes(stale.status)); assert.equal(await hash(domainTables), removed); assert.deepEqual(errors, []);
      });
    } finally {
      await writeFile(join(scratch, 'safe-responses.json'), JSON.stringify(responses.map(({ response, ...safe }) => safe), null, 2));
      await browser.close();
    }
  }, { classrooms: true });
});
