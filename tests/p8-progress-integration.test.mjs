import { selectClassroomSection as selectSharedSection } from './p8-current-ui-helpers.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';
import { account, api, digest } from './p4-integration-helpers.mjs';
import { classroom, openClassroom } from './p6-integration-helpers.mjs';

async function selectClassroomSection(page, key, label) {
  const navigation = page.getByRole('navigation', { name: 'Secciones del aula', exact: true });
  if (key === 'progress' && await navigation.isVisible()) {
    await navigation.getByRole('button', { name: label, exact: true }).click();
  } else await selectSharedSection(page, key, label);
}

test('P8 actual separate completion/performance/plan, own/class/history, retry, restart and fresh access', { timeout: 330000 }, async t => {
  await withP4IntegrationRuntime(async runtime => {
    const scratch = await mkdtemp(join(tmpdir(), 'foxmind-p8-progress-'));
    console.log(`P8 retained progress browser evidence: ${scratch}`);
    const browser = await chromium.launch({ headless: true }), responses = [], errors = [];
    try {
      const teacher = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
      const student = await (await browser.newContext({ viewport: { width: 375, height: 812 } })).newPage();
      for (const [index, page] of [teacher, student].entries()) {
        page.setDefaultTimeout(12000); page.on('pageerror', error => errors.push(error.message));
        page.on('response', response => {
          const path = new URL(response.url()).pathname;
          if (path.startsWith('/api/v1/')) responses.push({ page: index ? 'student' : 'teacher', path,
            method: response.request().method(), status: response.status(), retryAfter: response.headers()['retry-after'] ?? null, response });
        });
      }
      const identity = page => page === teacher ? 'teacher' : 'student';
      async function observed(page, path, method, after) {
        const deadline = Date.now() + 12000;
        while (Date.now() < deadline) {
          const row = responses.slice(after).find(row => row.page === identity(page) && row.path === '/api/v1' + path && row.method === method);
          if (row) return row.response;
          await delay(25);
        }
        assert.fail(`Missing actual ${method} ${path}`);
      }
      async function honor(response) {
        const raw = typeof response.status === 'function' ? response.headers()['retry-after'] : response.headers['retry-after'];
        const seconds = Number(raw); assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60);
        console.log(`P8 progress honors actual Retry-After=${seconds}s once`); await delay(seconds * 1000);
      }
      async function request(page, method, path, body, headers) {
        let response = await api(page, method, path, body, headers);
        if (response.status === 429) { await honor(response); response = await api(page, method, path, body, headers); }
        return response;
      }
      async function ok(...args) { const response = await request(...args); assert.equal(response.status, 200, `${args[1]} ${args[2]}`); return response.body; }
      const suffix = Date.now(); await account(teacher, runtime.origin, runtime.inbox, `p8-progress-teacher-${suffix}@example.test`, undefined, "teacher");
      const studentUser = await account(student, runtime.origin, runtime.inbox, `p8-progress-student-${suffix}@example.test`, undefined, "student");
      const name = 'P8 progress classroom', room = await classroom(teacher, student, name), root = `/classrooms/${room.id}`;
      const detail = await ok(teacher, 'GET', root), progressPath = `${root}/progress`, memberPath = `${root}/members/${studentUser.id}/progress`;
      const domainTables = ['classrooms', 'units', 'topics', 'study_plan_versions', 'enrollments', 'membership_periods', 'activities',
        'student_activities', 'attempts', 'answers', 'answer_selections', 'attempt_grades', 'question_grades', 'grade_corrections',
        'notifications', 'attempt_attachments', 'files', 'uploads', 'file_custodies'];
      const hash = async () => digest(JSON.stringify(await Promise.all(domainTables.map(async table =>
        (await runtime.db.query(`SELECT to_jsonb(t) value FROM ${table} t ORDER BY to_jsonb(t)::text`)).rows))));
      const region = page => page.getByRole('region', { name: 'Seguimiento del aprendizaje', exact: true });
      async function progressReady(page, scope) {
        const heading = { classroom: 'Cómo vienen las entregas', self: 'Tu trabajo va tomando forma', member: 'Registro de actividades' }[scope];
        if (scope === 'member') {
          // StudentRecord deliberately hides its repeated headings inside the named dialog.
          await region(page).getByRole('region', { name: 'Actividades del seguimiento', exact: true }).waitFor();
        } else await region(page).getByRole('heading', { name: heading, exact: true }).waitFor();
        assert.equal(await region(page).getAttribute('data-progress-scope'), scope);
        assert.equal(await region(page).getAttribute('aria-busy'), 'false');
        assert.equal(await region(page).getByRole('alert').count(), 0);
      }
      async function assertSelfValuesHidden(page) {
        assert.equal(await region(page).locator('.parity-own-summary').count(), 0);
        assert.equal(await region(page).locator('.parity-own-grade').count(), 0);
        assert.equal(await region(page).getByRole('region', { name: 'Avance del plan', exact: true }).count(), 0);
      }
      async function assertUnitProgress(page, plan) {
        const units = region(page).getByRole('region', { name: 'Avance del plan', exact: true });
        await units.waitFor();
        assert.equal(await units.getByRole('article').count(), plan.units.length);
        for (const unit of plan.units) {
          const row = units.getByRole('article').filter({ has: page.getByRole('heading', { name: unit.name, exact: true }) });
          await row.getByText(`${unit.taught} de ${unit.total} temas`, { exact: true }).waitFor();
          const bar = row.getByRole('progressbar', { name: unit.name, exact: true });
          assert.equal(await bar.getAttribute('value'), String(unit.taught));
          assert.equal(await bar.getAttribute('max'), String(unit.total));
        }
      }
      // Progress has no same-instance refresh control in the current UI or baseline 29fda64.
      // Re-enter the section to test the supported fresh-read and stale-content boundary.
      async function reenterProgress(page) {
        await selectClassroomSection(page, 'activities', 'Actividades');
        await selectClassroomSection(page, 'progress', page === teacher ? 'Progreso' : 'Mi progreso');
      }
      async function roomReads(page, after, paths = [root]) {
        let results = await Promise.all(paths.map(path => observed(page, path, 'GET', after)));
        const limited = results.filter(response => response.status() === 429);
        if (limited.length) {
          await honor(limited.sort((a, b) => Number(b.headers()['retry-after']) - Number(a.headers()['retry-after']))[0]);
          const next = responses.length;
          if (paths[0] === root) await page.getByRole('button', { name: 'Actualizar aula', exact: true }).click();
          else { await selectClassroomSection(page, 'plan', 'Plan'); await selectClassroomSection(page, 'members', 'Estudiantes'); }
          results = await Promise.all(paths.map(path => observed(page, path, 'GET', next)));
        }
        for (const response of results) assert.equal(response.status(), 200);
      }
      async function enter(page) {
        const requests = [], capture = request => requests.push({ path: new URL(request.url()).pathname, method: request.method() });
        page.on('request', capture);
        try {
          const after = responses.length; await openClassroom(page, runtime.origin, name); await roomReads(page, after);
          const activityAfter = responses.length;
          await selectClassroomSection(page, 'activities', 'Actividades');
          assert.equal((await observed(page, `${root}/activities`, 'GET', activityAfter)).status(), 200);
          assert.equal(requests.some(request => request.method === 'GET' && request.path === `/api/v1${root}/members`), false,
            'Opening Activities must not request the independent Members resource');
        } finally { page.off('request', capture); }
      }
      async function progressRead(page, path, trigger) {
        const after = responses.length; await trigger(); let response = await observed(page, path, 'GET', after);
        if (response.status() === 429) {
          await region(page).getByRole('alert').waitFor(); await honor(response);
          const next = responses.length; await region(page).getByRole('button', { name: 'Reintentar progreso', exact: true }).click();
          response = await observed(page, path, 'GET', next);
        }
        assert.equal(response.status(), 200);
        const data = await response.json(); await progressReady(page, data.scope); return data;
      }
      let failed = false, expectedOwn, expectedClass;
      const check = (label, work) => t.test(label, { skip: failed ? 'Earlier actual progress prerequisite failed' : false }, async () => {
        try { await work(); } catch (error) { failed = true; throw error; }
      });
      await check('actual zero-expected class is empty, without a completion percentage or invented grade', async () => {
        await enter(teacher); const before = await hash();
        const data = await progressRead(teacher, progressPath, () => selectClassroomSection(teacher, 'progress', 'Progreso'));
        assert.equal(data.scope, 'classroom'); assert.equal(data.studentCount, 1);
        assert.equal(data.completion.percentage, null); assert.equal(data.performance.average, null);
        assert.equal(data.completion.pending, 0); assert.equal(data.completion.pendingResubmissions, 0);
        const completion = region(teacher).locator('.parity-teacher-metrics > section')
          .filter({ has: teacher.getByText('Entregas recibidas', { exact: true }) });
        assert.match(await completion.locator('strong').innerText(), /^0\s*\/\s*0$/); assert.ok(!(await completion.innerText()).includes('%'));
        const grades = region(teacher).locator('.parity-teacher-charts > section')
          .filter({ has: teacher.getByRole('heading', { name: 'Resultados publicados', exact: true }) });
        await grades.getByRole('heading', { name: 'Todavía no hay notas publicadas', exact: true }).waitFor();
        assert.equal(await grades.locator('.parity-grade-summary').count(), 0);
        assert.equal(await grades.getByRole('img', { name: /^Distribución de notas:/ }).count(), 0);
        assert.equal(await hash(), before);
      });
      await check('public receipt/publication/reopening and TAUGHT feed fresh own mobile/class views, without conflating measures', async () => {
        const change = async operation => ok(teacher, 'POST', `${root}/activities`, { revision: (await ok(teacher, 'GET', root)).revision, operation });
        const activities = [];
        for (const title of ['Progress delivered', 'Progress pending']) {
          const { id } = await change({ action: 'create', type: 'ASSIGNMENT' });
          await change({ action: 'save', id, payload: { title, unitId: detail.units[0].id, topicId: detail.units[0].topics[0].id,
            instructions: 'Actual progress instructions', attachmentRequired: false, instructionFileIds: [], materialIds: [], deadline: null, allowLate: false, questions: [] } });
          await change({ action: 'publish', id }); activities.push(id);
        }
        const state = await ok(student, 'POST', `${root}/activities/${activities[0]}/start`, {});
        await ok(student, 'POST', `${root}/attempts/${state.attempt.id}/submit-practical`, { revision: state.attempt.revision, confirm: true },
          { 'x-attempt-editor': state.editor.token, 'x-attempt-epoch': state.editor.epoch });
        const saved = await ok(teacher, 'POST', `${root}/attempts/${state.attempt.id}/grading`, {
          revision: (await ok(teacher, 'GET', root)).revision, overallGrade: '8.35', overallFeedback: 'Private feedback excluded from progress', questions: [] });
        await ok(teacher, 'POST', `${root}/attempts/${state.attempt.id}/publish-grade`, { revision: saved.revision, confirm: true });
        await ok(teacher, 'POST', `${root}/activities/${activities[0]}/reopen`, { revision: (await ok(teacher, 'GET', root)).revision,
          studentId: studentUser.id, deadline: null, confirm: true });
        await ok(teacher, 'POST', `${root}/plan`, { revision: (await ok(teacher, 'GET', root)).revision,
          operation: { action: 'setTopicState', id: detail.units[0].topics[0].id, status: 'TAUGHT' } });
        await enter(student);
        let release; const released = new Promise(resolve => { release = resolve; });
        await student.route('**/api/v1' + progressPath, async route => { await released; await route.continue(); }, { times: 1 });
        const after = responses.length;
        await selectClassroomSection(student, 'progress', 'Mi progreso');
        await region(student).getByText('Cargando progreso…', { exact: true }).waitFor();
        assert.equal(await region(student).getAttribute('aria-busy'), 'true');
        await assertSelfValuesHidden(student);
        release(); let response = await observed(student, progressPath, 'GET', after);
        if (response.status() === 429) {
          await region(student).getByRole('alert').waitFor(); await honor(response);
          const next = responses.length; await region(student).getByRole('button', { name: 'Reintentar progreso', exact: true }).click();
          response = await observed(student, progressPath, 'GET', next);
        }
        assert.equal(response.status(), 200); expectedOwn = await response.json();
        await progressReady(student, 'self');
        assert.equal(expectedOwn.scope, 'self'); assert.equal(expectedOwn.completion.percentage, '50.00'); assert.equal(expectedOwn.completion.pendingResubmissions, 1);
        assert.equal(expectedOwn.performance.average, '8.35'); assert.deepEqual(expectedOwn.plan, { total: 2, taught: 1, percentage: '50.00', units: detail.units.map((unit, index) => ({ id: unit.id, name: unit.name, total: unit.topics.length, taught: index === 0 ? 1 : 0 })) });
        assert.ok(!/Private feedback|"(?:students|studentCount|gradedStudents|reason|audit|actor|correct|scoringRule)"/.test(JSON.stringify(expectedOwn)));
        await region(student).locator('.parity-own-grade > b').filter({ hasText: /^8,35\s*\/\s*10$/ }).waitFor();
        const ring = region(student).getByRole('img', { name: '50% de entregas confirmadas', exact: true });
        await ring.getByText('1 de 2', { exact: true }).waitFor();
        await assertUnitProgress(student, expectedOwn.plan);
        const delivered = expectedOwn.activities.find(activity => activity.id === activities[0]);
        assert.ok(delivered.firstSubmission); assert.equal(delivered.pendingResubmission, true);
        await region(student).getByText(`Revisá los cambios para volver a entregar «${delivered.title}».`, { exact: true }).waitFor();
        assert.equal(await region(student).getByRole('region', { name: 'Estudiantes actuales' }).count(), 0);
        assert.equal(await region(student).getByRole('alert').count(), 0);
        assert.equal(await student.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await student.screenshot({ path: join(scratch, 'student-own-mobile.png'), fullPage: true });
        const ownReadHash = await hash();
        await region(student).getByRole('button', { name: 'Seguir con mis actividades', exact: true }).click();
        // Activities is retained by the current classroom shell; the CTA can reuse its admitted snapshot.
        const resubmission = student.getByRole('article', { name: 'Progress delivered', exact: true });
        await resubmission.getByText('Reentrega habilitada', { exact: true }).waitFor();
        assert.equal(await resubmission.getAttribute('data-student-state'), 'RESUBMISSION');
        const returned = await progressRead(student, progressPath, () => selectClassroomSection(student, 'progress', 'Mi progreso'));
        assert.deepEqual(returned, expectedOwn); assert.equal(await hash(), ownReadHash);
        const before = await hash();
        expectedClass = await progressRead(teacher, progressPath, () => reenterProgress(teacher));
        assert.equal(expectedClass.performance.average, '8.35'); assert.equal(expectedClass.performance.gradedStudents, 1);
        assert.deepEqual(expectedClass.completion, expectedOwn.completion); assert.equal(await hash(), before);
        const received = region(teacher).locator('.parity-teacher-metrics > section')
          .filter({ has: teacher.getByText('Entregas recibidas', { exact: true }) });
        assert.match(await received.locator('strong').innerText(), /^1\s*\/\s*2$/);
        const worked = region(teacher).locator('.parity-teacher-metrics > section')
          .filter({ has: teacher.getByText('Plan trabajado', { exact: true }) });
        await worked.getByText('50%', { exact: true }).waitFor(); await worked.getByText('1 de 2 temas dados', { exact: true }).waitFor();
        await region(teacher).locator('.parity-grade-summary > b').filter({ hasText: /^8,35\s*\/\s*10$/ }).waitFor();
        await teacher.screenshot({ path: join(scratch, 'teacher-class-progress.png'), fullPage: true });
      });
      await check('failed section re-entry hides retained values, and visible retry needs an actual admitted GET200', async () => {
        const before = await hash(); await student.route('**/api/v1' + progressPath, route => route.abort('failed'), { times: 1 });
        await reenterProgress(student);
        await region(student).getByRole('alert').waitFor(); await assertSelfValuesHidden(student);
        const fresh = await progressRead(student, progressPath, () => region(student).getByRole('button', { name: 'Reintentar progreso', exact: true }).click());
        assert.deepEqual(fresh, expectedOwn); assert.equal(await hash(), before);
      });
      await check('actual current member summary preserves old DTO/history and adds separate member progress', async () => {
        await selectClassroomSection(teacher, 'members', 'Estudiantes');
        const after = responses.length; await teacher.getByRole('button', { name: 'Ver ficha', exact: true }).click();
        const old = await observed(teacher, `${root}/members/${studentUser.id}`, 'GET', after); assert.equal(old.status(), 200);
        assert.deepEqual(Object.keys(await old.json()).sort(), ['firstName', 'lastName', 'attempts'].sort());
        await teacher.getByRole('button', { name: 'Ver progreso individual', exact: true }).waitFor();
        assert.equal(responses.slice(after).some(row => row.page === 'teacher' && row.path === '/api/v1' + memberPath && row.method === 'GET'), false,
          'Opening the student record must not automatically request individual progress');
        await teacher.getByRole('button', { name: 'Ver progreso individual', exact: true }).click();
        const current = await observed(teacher, memberPath, 'GET', after); assert.equal(current.status(), 200);
        assert.equal((await current.json()).currentMember, true); await progressReady(teacher, 'member');
        await region(teacher).locator('[aria-label="Rendimiento académico"]').filter({ hasText: /^Promedio publicado: 8,35$/ }).waitFor();
        await region(teacher).getByRole('region', { name: 'Actividades del seguimiento', exact: true }).getByRole('listitem')
          .filter({ hasText: 'Progress delivered' }).getByText('Devolución publicada · Reentrega pendiente', { exact: true }).waitFor();
        await teacher.getByRole('dialog', { name: `El recorrido de ${studentUser.firstName} ${studentUser.lastName}`, exact: true }).waitFor();
        await teacher.getByRole('button', { name: /Volver a la ficha/ }).click();
        await teacher.getByRole('button', { name: /Volver a Estudiantes/ }).click();
      });
      await check('restart preserves all academic/private data; archive permits reads; rejected cross-scope reads never write', async () => {
        const before = await hash(); await runtime.restartData(); assert.equal(await hash(), before);
        assert.deepEqual(await ok(student, 'GET', progressPath), expectedOwn); assert.deepEqual(await ok(teacher, 'GET', progressPath), expectedClass);
        assert.equal((await request(student, 'GET', memberPath)).status, 403);
        assert.equal((await request(teacher, 'GET', `${root}/members/${randomUUID()}/progress`)).status, 403);
        assert.equal((await request(student, 'GET', `/classrooms/${randomUUID()}/progress`)).status, 403);
        assert.equal(await hash(), before);
        await ok(teacher, 'POST', `${root}/archive`, { revision: expectedClass.revision, archived: true });
        const archivedHash = await hash(); assert.equal((await ok(student, 'GET', progressPath)).archived, true);
        assert.equal((await ok(teacher, 'GET', memberPath)).archived, true); assert.equal(await hash(), archivedHash);
        await ok(teacher, 'POST', `${root}/archive`, { revision: (await ok(teacher, 'GET', root)).revision, archived: false });
      });
      await check('actual removal excludes current metrics, retains teacher historical mobile view and revokes student/session access', async () => {
        await teacher.getByRole('button', { name: 'Ver ficha', exact: true }).click();
        await teacher.getByRole('button', { name: 'Dar de baja del aula', exact: true }).click();
        const after = responses.length; await teacher.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click();
        assert.equal((await observed(teacher, `${root}/members/${studentUser.id}/remove`, 'POST', after)).status(), 200);
        await roomReads(teacher, after, [`${root}/members`]);
        const before = await hash(); assert.equal((await request(student, 'GET', progressPath)).status, 403);
        const current = await ok(teacher, 'GET', progressPath); assert.equal(current.studentCount, 0);
        assert.equal(current.completion.expected, 0); assert.equal(current.completion.percentage, null); assert.equal(current.performance.average, null);
        await teacher.setViewportSize({ width: 375, height: 812 });
        await selectClassroomSection(teacher, 'history', 'Historial');
        const historical = await progressRead(teacher, memberPath, () => teacher.getByRole('button', { name: 'Ver registros', exact: true }).click());
        assert.equal(historical.currentMember, false); assert.deepEqual(historical.completion, expectedOwn.completion);
        assert.equal(historical.performance.average, '8.35');
        await region(teacher).getByText('Historial académico conservado.', { exact: true }).waitFor();
        await region(teacher).locator('[aria-label="Rendimiento académico"]').filter({ hasText: /^Promedio publicado: 8,35$/ }).scrollIntoViewIfNeeded();
        assert.equal(await teacher.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await teacher.screenshot({ path: join(scratch, 'teacher-historical-mobile.png'), fullPage: true });
        assert.equal(await hash(), before);
        const cookie = (await teacher.context().cookies()).map(row => `${row.name}=${row.value}`).join('; ');
        assert.equal((await request(teacher, 'POST', '/auth/logout', {})).status, 204);
        const revoked = await fetch(`${runtime.origin}/api/v1${progressPath}`, { headers: { cookie } });
        assert.ok([401, 403].includes(revoked.status)); assert.equal(await hash(), before); assert.deepEqual(errors, []);
      });
    } finally {
      await writeFile(join(scratch, 'safe-responses.json'), JSON.stringify(responses.map(({ response: _response, ...row }) => row), null, 2));
      await browser.close();
    }
  }, { classrooms: true });
});
