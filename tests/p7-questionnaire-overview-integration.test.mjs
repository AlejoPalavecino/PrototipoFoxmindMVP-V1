import { startBrowserAttempt } from './helpers/browser-admission-step.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';
import { account, api, digest } from './p4-integration-helpers.mjs';
import { classroom, openClassroom, domainSnapshot } from './p6-integration-helpers.mjs';

// Sole actual verification of the human-authorized overview preservation correction; not a full T4 sweep.
test('both actual pre-start overviews remain safe read-only views until explicit start, then taking controls replace them once', { timeout: 330000 }, async t => {
  await withP4IntegrationRuntime(async runtime => {
    const owner = spawnSync('docker', ['ps', '--filter', `publish=${runtime.db.connectionParameters.port}`, '--format', '{{.Label "foxmind.p4.owner"}}'], { encoding: 'utf8', windowsHide: true, timeout: 5000 });
    assert.equal(owner.status, 0); assert.match(owner.stdout.trim(), /^[a-f0-9]{16}$/); console.log(`Overview preservation disposable owner: ${owner.stdout.trim()}`);
    const browser = await chromium.launch({ headless: true }), scratch = await mkdtemp(join(tmpdir(), 'foxmind-p7-overview-browser-'));
    console.log(`Overview retained screenshots: ${scratch}`);
    try {
      const teacher = await (await browser.newContext()).newPage(), student = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
      const suffix = Date.now(), errors = [];
      student.on('pageerror', error => errors.push(error.message));
      await account(teacher, runtime.origin, runtime.inbox, `p7-overview-teacher-${suffix}@example.test`, undefined, "teacher");
      await account(student, runtime.origin, runtime.inbox, `p7-overview-student-${suffix}@example.test`, undefined, "student");
      const room = await classroom(teacher, student, 'Overview preservation classroom');
      const ok = async (...args) => { const result = await api(...args); assert.equal(result.status, 200, `${args[1]} ${args[2]} prerequisite`); return result.body; };
      const detail = await ok(teacher, 'GET', `/classrooms/${room.id}`);
      const change = async operation => ok(teacher, 'POST', `/classrooms/${room.id}/activities`, { revision: (await ok(teacher, 'GET', `/classrooms/${room.id}`)).revision, operation });
      const activities = [];
      for (const type of ['QUESTIONNAIRE', 'EVALUATION']) {
        const title = `${type} overview`, prefix = type === 'QUESTIONNAIRE' ? 'Questionnaire' : 'Evaluation';
        const { id } = await change({ action: 'create', type });
        const questions = [
          { type: 'DEVELOPMENT', prompt: `${prefix} literal <script>window.overviewExecuted=true</script>\nDevelopment prompt`, points: '2', scoringRule: null, options: [] },
          { type: 'SINGLE_CHOICE', prompt: `${prefix} single prompt`, points: '3', scoringRule: 'EXACT', options: [{ text: `${prefix} single first`, correct: true }, { text: `${prefix} single second`, correct: false }] },
          { type: 'MULTIPLE_CHOICE', prompt: `${prefix} multiple prompt`, points: '5', scoringRule: 'PARTIAL', options: [{ text: `${prefix} multiple first`, correct: true }, { text: `${prefix} multiple second`, correct: true }, { text: `${prefix} multiple third`, correct: false }] },
        ];
        await change({ action: 'save', id, payload: { title, unitId: detail.units[0].id, topicId: detail.units[0].topics[0].id, instructions: 'Existing instructions remain unchanged',
          attachmentRequired: false, instructionFileIds: [], materialIds: [], questions, deadline: null, allowLate: false } });
        await change({ action: 'publish', id }); activities.push({ id, title, type, prefix, questions });
      }
      const snapshot = async () => {
        const data = [await domainSnapshot(runtime.db)];
        for (const [table, key] of [['questions','id'], ['question_options','id'], ['student_activities','id'], ['answers','id'], ['answer_selections','answer_id,option_id'], ['attempt_grades','id'], ['question_grades','id']])
          data.push((await runtime.db.query(`SELECT row_to_json(t)::text value FROM ${table} t ORDER BY ${key}`)).rows);
        return digest(JSON.stringify(data));
      };
      let failed = false, expectedAttempts = 0;
      for (const activity of activities) await t.test(`${activity.type}: overview starts nothing, explicit start produces one nonduplicated taking interface`, { skip: failed ? 'Prior targeted overview prerequisite failed' : false }, async () => {
        try {
          await openClassroom(student, runtime.origin, 'Overview preservation classroom');
          await student.getByRole('button', { name: 'Actividades', exact: true }).click();
          const sessionPath = `/classrooms/${room.id}/activities/${activity.id}/session`, beforeSession = await ok(student, 'GET', sessionPath);
          assert.equal(beforeSession.attempt, null); assert.equal(beforeSession.activity.locked, false);
          assert.ok(!/"(?:correct|is_correct|scoringRule|editor_token_hash|final_grade)"/.test(JSON.stringify(beforeSession)));
          const before = await snapshot(), starts = [], observe = req => { if (req.method() === 'POST' && req.url().endsWith('/start')) starts.push(req.url()); };
          student.on('request', observe);
          try {
            const consulted = student.waitForResponse(r => r.url().endsWith(`/activities/${activity.id}/session`));
            await student.getByRole('article', { name: activity.title, exact: true }).getByRole('button', { name: `Abrir ${activity.title}`, exact: true }).click();
            assert.equal((await consulted).status(), 200);
            const dialog = student.getByRole('region', { name: 'Consulta de actividad', exact: true });
            const overview = student.getByRole('region', { name: 'Mi historial de intentos', exact: true });
            await dialog.waitFor();
            await overview.getByText('3 preguntas', { exact: true }).waitFor();
            for (const question of activity.questions) {
              assert.equal(await dialog.getByText(question.prompt, { exact: true }).count(), 0);
              for (const option of question.options) assert.equal(await dialog.getByText(option.text, { exact: true }).count(), 0);
            }
            assert.equal(await dialog.getByRole('textbox').count(), 0); assert.equal(await dialog.getByRole('radio').count(), 0); assert.equal(await dialog.getByRole('checkbox').count(), 0);
            assert.equal(await dialog.getByRole('button', { name: 'Revisar entrega', exact: true }).count(), 0);
            assert.equal(await dialog.locator('script').count(), 0); assert.equal(await student.evaluate(() => window.overviewExecuted === true), false);
            assert.deepEqual(starts, []); assert.equal(await snapshot(), before, 'Read-only browser consultation must preserve the full domain hash');
            const afterSession = await ok(student, 'GET', sessionPath); assert.equal(afterSession.attempt, null); assert.equal(afterSession.activity.locked, false);
            const stored = (await runtime.db.query('SELECT first_started_at FROM activities WHERE id=$1', [activity.id])).rows[0]; assert.equal(stored.first_started_at, null);
            assert.equal((await runtime.db.query('SELECT count(*)::int n FROM attempts')).rows[0].n, expectedAttempts);
            await student.screenshot({ path: join(scratch, `${activity.type.toLowerCase()}-read-only-overview.png`), fullPage: true });
          } finally { student.off('request', observe); }
          const dialog = student.getByRole('region', { name: activity.type === 'EVALUATION' ? 'Evaluación · sesión reducida' : 'Sesión de actividad', exact: true });
          const response = await startBrowserAttempt(student, room.id, activity.id, 30000, 'Empezar actividad'); assert.equal(response.status(), 200);
          const state = await response.json(); assert.equal(state.attempt.status, 'DRAFT'); assert.equal(state.activity.locked, true); assert.deepEqual(state.attempt.answers, []);
          await dialog.getByRole('textbox', { name: 'Respuesta a la pregunta 1', exact: true }).waitFor();
          assert.equal(await student.getByRole('region', { name: 'Consulta de actividad', exact: true }).count(), 0);
          const navigation = dialog.getByRole('navigation', { name: 'Preguntas', exact: true });
          assert.equal(await navigation.getByRole('button').count(), 3);
          for (const [index, expected] of activity.questions.entries()) {
            await navigation.getByRole('button', { name: `Pregunta ${index + 1}, sin responder`, exact: true }).click();
            const question = dialog.getByRole('article', { name: `Pregunta ${index + 1}`, exact: true });
            await question.waitFor();
            assert.equal(await dialog.getByRole('article', { name: /^Pregunta [1-3]$/ }).count(), 1);
            assert.equal(await question.getByRole('heading').textContent(), expected.prompt);
            const type = index === 0 ? 'textbox' : index === 1 ? 'radio' : 'checkbox';
            assert.equal(await question.getByRole(type).count(), index === 0 ? 1 : expected.options.length);
            await question.getByRole(type).first().focus();
            assert.equal(await question.evaluate(element => element.contains(document.activeElement)), true);
          }
          assert.equal(await dialog.locator('script').count(), 0); assert.equal(await student.evaluate(() => window.overviewExecuted === true), false);
          expectedAttempts++; assert.equal((await runtime.db.query('SELECT count(*)::int n FROM attempts')).rows[0].n, expectedAttempts);
          assert.equal((await runtime.db.query("SELECT count(*)::int n FROM attempts WHERE status='SUBMITTED'")).rows[0].n, 0);
          for (const table of ['answers', 'answer_selections', 'attempt_grades', 'question_grades']) assert.equal((await runtime.db.query(`SELECT count(*)::int n FROM ${table}`)).rows[0].n, 0);
          assert.deepEqual(errors, []);
        } catch (error) { failed = true; throw error; }
      });
    } finally { await browser.close(); }
  }, { classrooms: true });
});
