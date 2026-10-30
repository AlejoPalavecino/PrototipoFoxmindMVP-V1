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
      const suffix = Date.now(); await account(teacher, runtime.origin, runtime.inbox, `p8-progress-teacher-${suffix}@example.test`);
      const studentUser = await account(student, runtime.origin, runtime.inbox, `p8-progress-student-${suffix}@example.test`);
      const name = 'P8 progress classroom', room = await classroom(teacher, student, name), root = `/classrooms/${room.id}`;
      const detail = await ok(teacher, 'GET', root), progressPath = `${root}/progress`, memberPath = `${root}/members/${studentUser.id}/progress`;
      const domainTables = ['classrooms', 'units', 'topics', 'study_plan_versions', 'enrollments', 'membership_periods', 'activities',
        'student_activities', 'attempts', 'answers', 'answer_selections', 'attempt_grades', 'question_grades', 'grade_corrections',
        'notifications', 'attempt_attachments', 'files', 'uploads', 'file_custodies'];
      const hash = async () => digest(JSON.stringify(await Promise.all(domainTables.map(async table =>
        (await runtime.db.query(`SELECT to_jsonb(t) value FROM ${table} t ORDER BY to_jsonb(t)::text`)).rows))));
      const region = page => page.getByRole('region', { name: 'Seguimiento del aprendizaje', exact: true });
      async function roomReads(page, after, paths = [root]) {
        let results = await Promise.all(paths.map(path => observed(page, path, 'GET', after)));
        const limited = results.filter(response => response.status() === 429);
        if (limited.length) {
          await honor(limited.sort((a, b) => Number(b.headers()['retry-after']) - Number(a.headers()['retry-after']))[0]);
          const next = responses.length;
          if (paths[0] === root) await page.getByRole('button', { name: 'Actualizar aula', exact: true }).click();
          else { await page.getByRole('button', { name: 'Plan', exact: true }).click(); await page.getByRole('button', { name: 'Alumnos', exact: true }).click(); }
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
          await page.getByRole('button', { name: 'Actividades', exact: true }).click();
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
        assert.equal(response.status(), 200); await region(page).getByRole('heading', { name: 'Cumplimiento de entregas', exact: true }).waitFor();
        assert.equal(await region(page).getByRole('alert').count(), 0); return response.json();
      }
      let failed = false, expectedOwn, expectedClass;
      const check = (label, work) => t.test(label, { skip: failed ? 'Earlier actual progress prerequisite failed' : false }, async () => {
        try { await work(); } catch (error) { failed = true; throw error; }
      });
      await check('actual zero-expected class is empty, without a completion percentage or invented grade', async () => {
        await enter(teacher); const before = await hash();
        const data = await progressRead(teacher, progressPath, () => teacher.getByRole('button', { name: 'Progreso', exact: true }).click());
        assert.equal(data.scope, 'classroom'); assert.equal(data.studentCount, 1);
        assert.equal(data.completion.percentage, null); assert.equal(data.performance.average, null);
        const completion = region(teacher).getByRole('region', { name: 'Cumplimiento de entregas', exact: true });
        await completion.getByText('Sin actividades pendientes de seguimiento', { exact: true }).waitFor(); assert.ok(!(await completion.innerText()).includes('%'));
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
        await student.getByRole('button', { name: 'Mi progreso', exact: true }).click();
        await region(student).getByText('Cargando progreso…', { exact: true }).waitFor();
        assert.equal(await region(student).getByRole('button', { name: 'Actualizar progreso', exact: true }).isDisabled(), true);
        release(); let response = await observed(student, progressPath, 'GET', after);
        if (response.status() === 429) {
          await region(student).getByRole('alert').waitFor(); await honor(response);
          const next = responses.length; await region(student).getByRole('button', { name: 'Reintentar progreso', exact: true }).click();
          response = await observed(student, progressPath, 'GET', next);
        }
        assert.equal(response.status(), 200); expectedOwn = await response.json();
        assert.equal(expectedOwn.scope, 'self'); assert.equal(expectedOwn.completion.percentage, '50.00'); assert.equal(expectedOwn.completion.pendingResubmissions, 1);
        assert.equal(expectedOwn.performance.average, '8.35'); assert.deepEqual(expectedOwn.plan, { total: 2, taught: 1, percentage: '50.00' });
        assert.ok(!/Private feedback|"(?:students|studentCount|gradedStudents|reason|audit|actor|correct|scoringRule)"/.test(JSON.stringify(expectedOwn)));
        await region(student).getByRole('region', { name: 'Rendimiento académico', exact: true }).getByText('8,35', { exact: true }).waitFor();
        await region(student).getByText('Reentrega pendiente; la entrega anterior se conserva.', { exact: true }).waitFor();
        assert.equal(await region(student).getByRole('region', { name: 'Estudiantes actuales' }).count(), 0);
        assert.equal(await region(student).getByRole('alert').count(), 0);
        assert.equal(await student.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await student.screenshot({ path: join(scratch, 'student-own-mobile.png'), fullPage: true });
        const before = await hash();
        expectedClass = await progressRead(teacher, progressPath, () => region(teacher).getByRole('button', { name: 'Actualizar progreso', exact: true }).click());
        assert.equal(expectedClass.performance.average, '8.35'); assert.equal(expectedClass.performance.gradedStudents, 1);
        assert.deepEqual(expectedClass.completion, expectedOwn.completion); assert.equal(await hash(), before);
        await teacher.screenshot({ path: join(scratch, 'teacher-class-progress.png'), fullPage: true });
      });
      await check('failed explicit refresh hides retained values, and visible retry needs an actual admitted GET200', async () => {
        const before = await hash(); await student.route('**/api/v1' + progressPath, route => route.abort('failed'), { times: 1 });
        await region(student).getByRole('button', { name: 'Actualizar progreso', exact: true }).click();
        await region(student).getByRole('alert').waitFor(); assert.equal(await region(student).getByRole('region', { name: 'Rendimiento académico', exact: true }).count(), 0);
        const fresh = await progressRead(student, progressPath, () => region(student).getByRole('button', { name: 'Reintentar progreso', exact: true }).click());
        assert.deepEqual(fresh, expectedOwn); assert.equal(await hash(), before);
      });
      await check('actual current member summary preserves old DTO/history and adds separate member progress', async () => {
        await teacher.getByRole('button', { name: 'Alumnos', exact: true }).click();
        const after = responses.length; await teacher.getByRole('button', { name: 'Ver resumen', exact: true }).click();
        const old = await observed(teacher, `${root}/members/${studentUser.id}`, 'GET', after); assert.equal(old.status(), 200);
        assert.deepEqual(Object.keys(await old.json()).sort(), ['firstName', 'lastName', 'attempts'].sort());
        const current = await observed(teacher, memberPath, 'GET', after); assert.equal(current.status(), 200);
        assert.equal((await current.json()).currentMember, true);
        await region(teacher).getByRole('region', { name: 'Rendimiento académico', exact: true }).getByText('8,35', { exact: true }).waitFor();
        await teacher.getByRole('heading', { name: 'Entregas y calificaciones', exact: true }).waitFor();
        await teacher.getByRole('dialog').getByRole('button', { name: 'Cerrar diálogo', exact: true }).click();
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
        await teacher.getByRole('button', { name: 'Remover', exact: true }).click();
        const after = responses.length; await teacher.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click();
        assert.equal((await observed(teacher, `${root}/members/${studentUser.id}/remove`, 'POST', after)).status(), 200);
        await roomReads(teacher, after, [`${root}/members`]);
        const before = await hash(); assert.equal((await request(student, 'GET', progressPath)).status, 403);
        const current = await ok(teacher, 'GET', progressPath); assert.equal(current.studentCount, 0);
        assert.equal(current.completion.expected, 0); assert.equal(current.completion.percentage, null); assert.equal(current.performance.average, null);
        await teacher.setViewportSize({ width: 375, height: 812 });
        await teacher.getByRole('button', { name: 'Historial', exact: true }).click();
        const historical = await progressRead(teacher, memberPath, () => teacher.getByRole('button', { name: 'Ver resumen', exact: true }).click());
        assert.equal(historical.currentMember, false); assert.deepEqual(historical.completion, expectedOwn.completion);
        assert.equal(historical.performance.average, '8.35');
        await region(teacher).getByText('Registro histórico:', { exact: false }).waitFor();
        await region(teacher).getByRole('region', { name: 'Rendimiento académico', exact: true }).getByText('8,35', { exact: true }).scrollIntoViewIfNeeded();
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
