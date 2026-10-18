import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chromium } from '@playwright/test';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';
import { account, api } from './p4-integration-helpers.mjs';
import { classroom, openClassroom } from './p6-integration-helpers.mjs';

// Targeted correction proof, not a replay of the complete original T4 journey.
test('questionnaire recovery from ambiguous acknowledgement and stale focus epoch', { timeout: 330000 }, async t => {
  await withP4IntegrationRuntime(async runtime => {
    const owner = spawnSync('docker', ['ps', '--filter', `publish=${runtime.db.connectionParameters.port}`, '--format', '{{.Label "foxmind.p4.owner"}}'], { encoding: 'utf8', windowsHide: true, timeout: 5000 });
    assert.equal(owner.status, 0); assert.match(owner.stdout.trim(), /^[a-f0-9]{16}$/); console.log(`Questionnaire recovery disposable owner: ${owner.stdout.trim()}`);
    const browser = await chromium.launch({ headless: true });
    try {
      const teacher = await (await browser.newContext()).newPage(), student = await (await browser.newContext()).newPage(), suffix = Date.now();
      await account(teacher, runtime.origin, runtime.inbox, `p7-answer-recovery-teacher-${suffix}@example.test`);
      await account(student, runtime.origin, runtime.inbox, `p7-answer-recovery-student-${suffix}@example.test`);
      const room = await classroom(teacher, student, 'Answer recovery classroom');
      const ok = async (...args) => { const r = await api(...args); assert.equal(r.status, 200, `${args[1]} ${args[2]} prerequisite`); return r.body; };
      const detail = await ok(teacher, 'GET', `/classrooms/${room.id}`);
      const change = async operation => ok(teacher, 'POST', `/classrooms/${room.id}/activities`, { revision: (await ok(teacher, 'GET', `/classrooms/${room.id}`)).revision, operation });
      const { id } = await change({ action: 'create', type: 'QUESTIONNAIRE' });
      await change({ action: 'save', id, payload: { title: 'Recovery questionnaire', unitId: detail.units[0].id, topicId: detail.units[0].topics[0].id,
        instructions: 'Recovery fixture', attachmentRequired: false, instructionFileIds: [], materialIds: [], deadline: null, allowLate: false,
        questions: [{ type: 'DEVELOPMENT', prompt: 'Explain', points: '1', scoringRule: null, options: [] }] } });
      await change({ action: 'publish', id });
      await openClassroom(student, runtime.origin, 'Answer recovery classroom'); await student.getByRole('button', { name: 'Actividades', exact: true }).click();
      await student.getByRole('article', { name: 'Recovery questionnaire', exact: true }).getByRole('button', { name: 'Consultar actividad', exact: true }).click();
      const start = student.waitForResponse(r => r.url().endsWith(`/activities/${id}/start`)); await student.getByRole('button', { name: 'Comenzar', exact: true }).click(); assert.equal((await start).status(), 200);
      const input = student.getByRole('textbox', { name: 'Respuesta a la pregunta 1', exact: true });
      const session = () => ok(student, 'GET', `/classrooms/${room.id}/activities/${id}/session`);
      let failed = false;
      const check = (name, action) => t.test(name, { skip: failed ? 'Prior targeted recovery prerequisite failed' : false }, async () => { try { await action(); } catch (e) { failed = true; throw e; } });
      await check('network-controlled lost response AFTER actual commit retains dirty intent and the first explicit retry uses refreshed CAS', async () => {
        let intercepted = false, committedRevision;
        await student.route('**/attempts/*/answer', async route => {
          if (intercepted) return route.continue(); intercepted = true;
          const response = await route.fetch(); assert.equal(response.status(), 200); committedRevision = (await response.json()).revision;
          await route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":{"code":"SERVICE_UNAVAILABLE"}}' });
        });
        try {
          await input.fill('Actual commit with lost acknowledgement');
          await student.getByRole('button', { name: 'Reintentar guardado', exact: true }).click();
          await student.getByText('Las respuestas siguen en pantalla; no se confirmó su guardado.', { exact: false }).waitFor();
          assert.equal(await input.inputValue(), 'Actual commit with lost acknowledgement'); assert.equal(await input.isEnabled(), true);
          assert.equal(await student.getByText('Guardado confirmado', { exact: true }).count(), 0);
          assert.equal((await session()).attempt.revision, committedRevision);
          await input.fill('Newer retained local intent');
          const retried = student.waitForResponse(r => r.url().endsWith('/answer') && r.request().postDataJSON().text === 'Newer retained local intent');
          await student.getByRole('button', { name: 'Reintentar guardado', exact: true }).click();
          const result = await retried; assert.equal(result.request().postDataJSON().revision, committedRevision); assert.equal(result.status(), 200);
          await student.getByText('Guardado confirmado', { exact: true }).waitFor();
          assert.equal((await session()).attempt.answers[0].text, 'Newer retained local intent');
        } finally { await student.unroute('**/attempts/*/answer'); }
      });
      await check('network-controlled stale focus snapshot cannot roll back a newer successful explicit transfer', async () => {
        // Create a read-only mount, then hold its older read while the same tab explicitly takes control.
        await student.reload(); await student.getByRole('button', { name: 'Entrar al aula', exact: true }).click();
        await student.getByRole('button', { name: 'Actividades', exact: true }).click();
        await student.getByRole('article', { name: 'Recovery questionnaire', exact: true }).getByRole('button', { name: 'Consultar actividad', exact: true }).click();
        assert.equal(await input.isDisabled(), true);
        let entered, release; const waiting = new Promise(r => entered = r), gate = new Promise(r => release = r); let intercepted = false;
        await student.route(`**/activities/${id}/session`, async route => {
          if (intercepted) return route.continue(); intercepted = true;
          const response = await route.fetch(); assert.equal(response.status(), 200); entered(); await gate; await route.fulfill({ response });
        });
        try {
          await student.evaluate(() => window.dispatchEvent(new Event('focus'))); await waiting;
          await student.getByRole('button', { name: 'Transferir edición a esta pestaña', exact: true }).click();
          const transfer = student.waitForResponse(r => r.url().endsWith('/transfer')); await student.getByRole('button', { name: 'Confirmar transferencia', exact: true }).click();
          assert.equal((await transfer).status(), 200); await input.waitFor(); assert.equal(await input.isEnabled(), true);
          const oldRead = student.waitForResponse(r => r.url().endsWith(`/activities/${id}/session`)); release(); assert.equal((await oldRead).status(), 200);
          await student.getByText('Control de edición en esta pestaña.', { exact: false }).waitFor(); assert.equal(await input.isEnabled(), true);
          const saved = student.waitForResponse(r => r.url().endsWith('/answer')); await input.fill('Still owns the newer epoch');
          await student.getByRole('button', { name: 'Reintentar guardado', exact: true }).click(); assert.equal((await saved).status(), 200);
          assert.equal((await session()).attempt.answers[0].text, 'Still owns the newer epoch');
          for (const table of ['attempt_grades','question_grades','grade_corrections']) assert.equal((await runtime.db.query(`SELECT count(*)::int n FROM ${table}`)).rows[0].n, 0);
        } finally { release?.(); await student.unroute(`**/activities/${id}/session`); }
      });
    } finally { await browser.close(); }
  }, { classrooms: true });
});
