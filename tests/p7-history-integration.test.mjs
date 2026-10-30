import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, expect } from '@playwright/test';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';
import { account, api, digest } from './p4-integration-helpers.mjs';
import { classroom, openClassroom, planPdf } from './p6-integration-helpers.mjs';
import { watchResponse, createJourneyObserver } from './helpers/browser-action-observer.mjs';

async function request(page, method, path, body, headers = {}) {
  let result = await api(page, method, path, body, headers, { stopOnCsrfFailure: true });
  if (result.status === 429) { assert.equal(result.body?.error?.code, 'RATE_LIMITED');
    const retry = result.headers['retry-after']; assert.match(retry ?? '', /^\d+$/);
    const seconds = Number(retry); assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60);
    console.log(`History fixture honors actual Retry-After=${seconds}s once`); await delay(seconds * 1000); result = await api(page, method, path, body, headers, { stopOnCsrfFailure: true }); }
  return result;
}
const ok = async (...args) => { const result = await request(...args); assert.equal(result.status, 200, `${args[1]} ${args[2]}`); return result.body; };
const editorHeaders = editor => ({ 'x-attempt-editor': editor.token, 'x-attempt-epoch': editor.epoch });

test('P7 actual teacher reopen/student prefill-transfer-revise-submit preserve original question and private-file history', { timeout: 330000 }, async t => {
  await withP4IntegrationRuntime(async runtime => {
    const owner = spawnSync('docker', ['ps', '--filter', `publish=${runtime.db.connectionParameters.port}`, '--format', '{{.Label "foxmind.p4.owner"}}'], { encoding: 'utf8', windowsHide: true, timeout: 5000 });
    assert.equal(owner.status, 0); console.log(`History actual disposable owner: ${owner.stdout.trim()}`);
    const scratch = await mkdtemp(join(tmpdir(), 'foxmind-p7-history-')); console.log(`History retained browser evidence: ${scratch}`);
    const browser = await chromium.launch({ headless: true });
    let journey;
    try {
      const teacher = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
      const student = await (await browser.newContext({ viewport: { width: 375, height: 812 } })).newPage();
      journey = createJourneyObserver({ teacher, student });
      journey.setStage('teacher', 'setup', 'bootstrap'); journey.setStage('student', 'setup', 'bootstrap');
      const errors = []; for (const page of [teacher, student]) page.on('pageerror', e => errors.push(e.message));
      const suffix = Date.now(); await account(teacher, runtime.origin, runtime.inbox, `history-teacher-${suffix}@example.test`);
      await account(student, runtime.origin, runtime.inbox, `history-student-${suffix}@example.test`);
      const room = await classroom(teacher, student, 'P7 history classroom'), detail = await ok(teacher, 'GET', `/classrooms/${room.id}`);
      const change = async operation => ok(teacher, 'POST', `/classrooms/${room.id}/activities`, { revision: (await ok(teacher, 'GET', `/classrooms/${room.id}`)).revision, operation });
      const activities = [];
      for (const type of ['QUESTIONNAIRE', 'ASSIGNMENT', 'EVALUATION']) {
        journey.setStage('teacher', type, 'setup'); journey.setStage('student', type, 'originalstart');
        const { id } = await change({ action: 'create', type }), title = `History ${type}`;
        await change({ action: 'save', id, payload: { title, unitId: detail.units[0].id, topicId: detail.units[0].topics[0].id,
          instructions: 'Original immutable instructions', attachmentRequired: type === 'ASSIGNMENT', instructionFileIds: [], materialIds: [], deadline: null, allowLate: false,
          questions: type === 'ASSIGNMENT' ? [] : [{ type: 'DEVELOPMENT', prompt: 'Retained question', points: '2', scoringRule: null, options: [] }] } });
        await change({ action: 'publish', id });
        let state = await ok(student, 'POST', `/classrooms/${room.id}/activities/${id}/start`, {}), editor = state.editor;
        if (type === 'ASSIGNMENT') {
          const bytes = await planPdf('Immutable original work');
          const allocated = await request(student, 'POST', '/files', { scope: { kind: 'classroom', id: room.id }, purpose: 'attachment', targetId: state.attempt.id, name: 'retained-original.pdf', bytes: bytes.length }, editorHeaders(editor));
          assert.equal(allocated.status, 201); assert.equal((await request(student, 'PUT', `/files/${allocated.body.id}/content`, { base64: bytes.toString('base64') }, editorHeaders(editor))).body.ready, true);
        } else await ok(student, 'POST', `/classrooms/${room.id}/attempts/${state.attempt.id}/answer`, { revision: state.attempt.revision, questionId: state.activity.questions[0].id, text: 'Original answer\n😀', optionIds: [] }, editorHeaders(editor));
        state = await ok(student, 'GET', `/classrooms/${room.id}/activities/${id}/session`);
        await ok(student, 'POST', `/classrooms/${room.id}/attempts/${state.attempt.id}/${type === 'ASSIGNMENT' ? 'submit-practical' : 'submit-answers'}`,
          { revision: state.attempt.revision, confirm: true, ...(type === 'ASSIGNMENT' ? {} : { confirmIncomplete: false }) }, editorHeaders(editor));
        const original = state.attempt.id;
        const obligation = (await runtime.db.query('SELECT student_activity_id FROM attempts WHERE id=$1', [original])).rows[0].student_activity_id;
        const path = `/classrooms/${room.id}/attempts/${original}`;
        const grading = await ok(teacher, 'GET', `${path}/grading`);
        const saved = await ok(teacher, 'POST', `${path}/grading`, { revision: grading.revision,
          overallGrade: type === 'ASSIGNMENT' ? '8' : null, overallFeedback: null,
          questions: grading.activity.questions.map(question => ({ questionId: question.id, points: '1.60', feedback: null })) });
        assert.equal(saved.grade.finalGrade, '8.00'); assert.equal(saved.grade.isPublished, false);
        const published = await ok(teacher, 'POST', `${path}/publish-grade`, { revision: saved.revision, confirm: true });
        assert.equal(published.grade.finalGrade, '8.00'); assert.equal(published.grade.isPublished, true);
        const grade = published.grade.id;
        assert.equal((await runtime.db.query('SELECT effective_grade_id FROM student_activities WHERE id=$1', [obligation])).rows[0].effective_grade_id, grade);
        const result = await ok(student, 'GET', `${path}/result`);
        assert.equal(result.status, 'published'); assert.equal(result.grade.isEffective, true);
        if (type !== 'ASSIGNMENT') assert.equal(result.questions[0].answer.text, 'Original answer\n😀');
        activities.push({ id, title, type, original, obligation, grade, questionId: state.activity.questions[0]?.id });
      }
      const originalHash = async activity => digest(JSON.stringify(await Promise.all([
        runtime.db.query('SELECT to_jsonb(a) value FROM attempts a WHERE id=$1', [activity.original]),
        runtime.db.query('SELECT to_jsonb(a) value FROM answers a WHERE attempt_id=$1 ORDER BY id', [activity.original]),
        runtime.db.query('SELECT to_jsonb(a) value FROM attempt_attachments a WHERE attempt_id=$1 ORDER BY file_id', [activity.original]),
        runtime.db.query('SELECT to_jsonb(c) value FROM file_custodies c WHERE file_id IN (SELECT file_id FROM attempt_attachments WHERE attempt_id=$1) ORDER BY file_id', [activity.original]),
      ]).then(results => results.map(r => r.rows))));
      let failed = false; const check = (name, fn) => t.test(name, { skip: failed ? 'Earlier actual history prerequisite failed' : false }, async () => { try { await fn(); } catch (e) { failed = true; console.error('Journey observer diagnostic', JSON.stringify(await journey.snapshot().catch(() => ({ unavailable: true })))); throw e; } });
      const actualActivities = process.env.P7_HISTORY_TARGETED === '1' ? activities.filter(a => a.type !== 'QUESTIONNAIRE') : activities;
      for (const activity of actualActivities) await check(`${activity.type} real teacher reopen confirmation → student history/prefill transfer → revised explicit delivery`, async () => {
        journey.setStage('teacher', activity.type, 'reopen'); journey.setStage('student', activity.type, 'reopen');
        const before = await originalHash(activity);
        await openClassroom(teacher, runtime.origin, 'P7 history classroom'); await teacher.getByRole('button', { name: 'Actividades', exact: true }).click();
        await teacher.getByRole('article', { name: activity.title, exact: true }).getByRole('button', { name: 'Ver entregas recibidas', exact: true }).click();
        await teacher.getByRole('button', { name: 'Habilitar otro intento', exact: true }).click();
        await teacher.getByRole('button', { name: 'Confirmar nuevo intento', exact: true }).click();
        await teacher.getByText('Reentrega pendiente', { exact: false }).waitFor();
        assert.equal(await originalHash(activity), before);
        await openClassroom(student, runtime.origin, 'P7 history classroom');
        await student.getByRole('button', { name: 'Actividades', exact: true }).click();
        await student.getByRole('article', { name: activity.title, exact: true }).getByRole('button', { name: 'Ver mis intentos', exact: true }).click();
        await student.getByText('Reentrega pendiente: todavía no es una nueva entrega recibida.', { exact: true }).waitFor();
        await student.getByRole('button', { name: 'Consultar intento 1', exact: true }).click();
        if (activity.type !== 'ASSIGNMENT') await student.getByRole('region', { name: 'Intento histórico confirmado' }).getByText('Original answer', { exact: false }).waitFor();
        await student.getByRole('region', { name: 'Intento histórico confirmado' }).getByRole('button', { name: 'Volver a mis intentos', exact: true }).click();
        journey.setStage('student', activity.type, 'transfer');
        try {
        const sessionWatch = watchResponse(student, response => response.request().method() === 'GET' && new URL(response.url()).pathname === `/api/v1/classrooms/${room.id}/activities/${activity.id}/session`, 30000);
        let continued;
        try { await student.getByRole('button', { name: 'Continuar borrador', exact: true }).click();
          const response = await sessionWatch.value(); assert.equal(response.status(), 200); continued = await response.json();
        } finally { sessionWatch.dispose(); }
        assert.equal(continued.attempt.status, 'DRAFT'); assert.equal(continued.canTransfer, true);
        const attemptPath = `/api/v1/classrooms/${room.id}/attempts/${continued.attempt.id}`;
        await student.getByRole('button', { name: 'Continuar en esta pestaña', exact: true }).click();
        const transferOutcome = () => watchResponse(student, response => {
          const path = new URL(response.url()).pathname, method = response.request().method();
          return (path === '/api/v1/auth/csrf' && method === 'GET' && response.status() !== 200) || (path === `${attemptPath}/transfer` && method === 'POST');
        }, 30000);
        let transferWatch = transferOutcome(), transfer; const transferRequests = [];
        const trackTransfer = request => { if (request.method() === 'POST' && new URL(request.url()).pathname === `${attemptPath}/transfer`) transferRequests.push(request); };
        student.on('request', trackTransfer);
        try {
          await student.getByRole('button', { name: 'Confirmar transferencia', exact: true }).click();
          transfer = await transferWatch.value();
          if (transfer.status() === 429) {
            assert.equal((await transfer.json()).error.code, 'RATE_LIMITED');
            const retry = transfer.headers()['retry-after']; assert.match(retry ?? '', /^\d+$/);
            const seconds = Number(retry); assert.ok(Number.isInteger(seconds) && seconds >= 1 && seconds <= 60);
            if (new URL(transfer.url()).pathname === '/api/v1/auth/csrf') assert.equal(transferRequests.length, 0);
            await student.getByRole('alert').filter({ hasText: /límite de intentos/i }).waitFor();
            transferWatch.dispose(); await delay(seconds * 1000); transferWatch = transferOutcome();
            await student.getByRole('button', { name: 'Confirmar transferencia', exact: true }).click();
            transfer = await transferWatch.value();
          }
          assert.equal(transfer.status(), 200); assert.equal(new URL(transfer.url()).pathname, `${attemptPath}/transfer`);
          const transferred = await transfer.json();
          assert.equal(transferred.attempt.id, continued.attempt.id); assert.equal(transferred.attempt.status, 'DRAFT');
          assert.equal(transferred.canTransfer, true); assert.ok(transferred.editor); assert.equal(transferred.editor.epoch, transferred.attempt.epoch);
        } finally { transferWatch.dispose(); student.off('request', trackTransfer); }
        if (activity.type === 'ASSIGNMENT') {
          await student.getByRole('button', { name: 'Quitar retained-original.pdf', exact: true }).click();
          const bytes = await planPdf('Revised second delivery');
          await student.getByLabel('Seleccionar archivo del trabajo', { exact: true }).setInputFiles({ name: 'revised-work.pdf', mimeType: 'application/pdf', buffer: bytes });
          const allocate = watchResponse(student, response => {
            if (new URL(response.url()).pathname !== '/api/v1/files' || response.request().method() !== 'POST') return false;
            const body = response.request().postDataJSON();
            return body?.scope?.id === room.id && body?.purpose === 'attachment' && body?.targetId === continued.attempt.id;
          }, 30000);
          const uploaded = watchResponse(student, response => /^\/api\/v1\/files\/[0-9a-f-]+\/content$/i.test(new URL(response.url()).pathname)
            && response.request().method() === 'PUT', 30000);
          try {
            await student.getByRole('button', { name: 'Subir archivo privado', exact: true }).click();
            const allocation = await allocate.value(); assert.equal(allocation.status(), 201);
            const file = await allocation.json(), content = await uploaded.value(); assert.equal(content.status(), 200);
            assert.equal(new URL(content.url()).pathname, `/api/v1/files/${file.id}/content`);
          } finally { allocate.dispose(); uploaded.dispose(); }
          await student.getByRole('button', { name: 'Quitar revised-work.pdf', exact: true }).waitFor();
          await student.getByRole('button', { name: 'Enviar trabajo práctico', exact: true }).click();
          await student.getByRole('button', { name: 'Confirmar envío del trabajo', exact: true }).click();
        } else {
          const input = student.getByRole('textbox', { name: 'Respuesta a la pregunta 1', exact: true });
          await expect(input).toBeEnabled({ timeout: 30000 });
          journey.setStage('student', activity.type, 'answer');
          const watches = [];
          const answerResponses = [];
          const observe = response => {
            const path = new URL(response.url()).pathname, method = response.request().method();
            const operation = path === '/api/v1/auth/csrf' && method === 'GET' ? 'csrf'
              : path === `${attemptPath}/answer` && method === 'POST' ? 'answer' : null;
            if (!operation) return;
            const revision = operation === 'answer' ? response.request().postDataJSON()?.revision : undefined;
            answerResponses.push((async () => {
              const rawCode = response.ok() ? null : (await response.json().catch(() => null))?.error?.code;
              const allowed = ['AUTH_REQUIRED', 'CSRF_INVALID', 'RATE_LIMITED', 'CONFLICT', 'FORBIDDEN', 'SERVICE_UNAVAILABLE', 'INVALID_INPUT'];
              const retry = response.headers()['retry-after'];
              return { operation, status: response.status(), revision: /^\d+$/.test(String(revision)) ? String(revision) : null,
                code: allowed.includes(rawCode) ? rawCode : null,
                retryAfter: /^\d{1,4}$/.test(retry ?? '') ? Number(retry) : null };
            })());
          };
          const answerRequests = [];
          const observeRequest = request => { if (request.method() === 'POST' && new URL(request.url()).pathname === `${attemptPath}/answer`) answerRequests.push(request); };
          student.on('response', observe);
          student.on('request', observeRequest);
          try {
            const outcome = () => { const watch = watchResponse(student, response => {
              const path = new URL(response.url()).pathname, method = response.request().method();
              return (path === '/api/v1/auth/csrf' && method === 'GET' && response.status() !== 200)
                || (path === `${attemptPath}/answer` && method === 'POST');
            }, 30000); watches.push(watch); return watch; };
            let observed = outcome();
            assert.equal(await input.inputValue(), 'Original answer\n😀'); await input.fill('Revised answer with preserved original');
            await student.getByRole('button', { name: 'Enviar respuestas', exact: true }).click();
            let result = await observed.value();
            if (result.status() === 429) {
              assert.equal((await result.json()).error.code, 'RATE_LIMITED');
              const retry = result.headers()['retry-after']; assert.match(retry ?? '', /^\d+$/);
              const seconds = Number(retry); assert.ok(Number.isInteger(seconds) && seconds >= 1 && seconds <= 60);
              if (new URL(result.url()).pathname === '/api/v1/auth/csrf') assert.equal(answerRequests.length, 0);
              await student.getByRole('alert').filter({ hasText: /límite de intentos/i }).waitFor();
              assert.equal(await input.inputValue(), 'Revised answer with preserved original');
              await expect(input).toBeEnabled({ timeout: 30000 });
              assert.equal(await student.getByRole('region', { name: 'Confirmar entrega de respuestas', exact: true }).count(), 0);
              await delay(seconds * 1000);
              observed = outcome();
              await student.getByRole('button', { name: 'Enviar respuestas', exact: true }).click();
              result = await observed.value();
            }
            assert.equal(result.status(), 200); assert.equal(result.request().method(), 'POST');
            assert.equal(new URL(result.url()).pathname, `${attemptPath}/answer`);
            const sentAnswer = result.request().postDataJSON(), ack = await result.json();
            assert.equal(sentAnswer.questionId === activity.questionId && ack.answer.questionId === activity.questionId, true);
            assert.ok(BigInt(ack.revision) > BigInt(sentAnswer.revision));
            const submitted = watchResponse(student, response => response.request().method() === 'POST' && new URL(response.url()).pathname === `${attemptPath}/submit-answers`, 30000); watches.push(submitted);
            await student.getByRole('button', { name: 'Confirmar envío de respuestas', exact: true }).click();
            const receipt = await submitted.value(); assert.equal(receipt.status(), 200);
            const sent = receipt.request().postDataJSON();
            assert.equal(sent.confirm, true); assert.equal(sent.confirmIncomplete, false); assert.equal(sent.revision, ack.revision);
          } catch (error) {
            const confirmation = student.getByRole('region', { name: 'Confirmar entrega de respuestas', exact: true });
            const buttons = await confirmation.getByRole('button').allTextContents();
            const errorFlags = await student.getByRole('alert').evaluateAll(elements => {
              const visible = elements.filter(element => element.getClientRects().length).map(element => element.textContent ?? '');
              return { rateLimit: visible.some(text => /límite|espera antes/i.test(text)),
                editorControl: visible.some(text => /control de edición|sesión cambió/i.test(text)),
                connection: visible.some(text => /conexión|no se pudo conectar|no disponible/i.test(text)) };
            });
            console.error('P7 history answer diagnostic', JSON.stringify({ type: activity.type,
              alerts: await student.getByRole('alert').count(), confirmationVisible: await confirmation.isVisible(),
              buttons: buttons.filter(label => ['Confirmar envío de respuestas', 'Confirmar entrega incompleta', 'Cancelar entrega'].includes(label)),
              errorFlags, responses: await Promise.all(answerResponses) }));
            throw error;
          } finally { for (const watch of watches) watch.dispose(); student.off('response', observe); student.off('request', observeRequest); }
        }
        await student.getByText('Entregado · solo consulta', { exact: false }).waitFor();
        assert.equal(await originalHash(activity), before);
        assert.equal((await runtime.db.query('SELECT effective_grade_id FROM student_activities WHERE id=$1', [activity.obligation])).rows[0].effective_grade_id, activity.grade);
        const history = await ok(student, 'GET', `/classrooms/${room.id}/activities/${activity.id}/history`); assert.deepEqual(history.attempts.map(a => [a.number, a.status]), [[2, 'SUBMITTED'], [1, 'SUBMITTED']]);
        await student.screenshot({ path: join(scratch, `${activity.type.toLowerCase()}-submitted-mobile.png`), fullPage: true });
        } catch (error) {
          const field = student.getByRole('textbox', { name: 'Respuesta a la pregunta 1', exact: true });
          const disabled = await field.count() === 1 ? await field.isDisabled().catch(() => null) : null;
          const diagnostic = await journey.snapshot().catch(() => ({ unavailable: true }));
          console.error('P7 prior stages diagnostic', JSON.stringify({ fieldDisabled: disabled, ...diagnostic }));
          throw error;
        }
      });
      await check('real restart preserves new and original history and effective pointers without issuing editor capabilities', async () => {
        await runtime.restartApi();
        for (const activity of actualActivities) { const result = await ok(student, 'GET', `/classrooms/${room.id}/activities/${activity.id}/history`); assert.equal(result.attempts.length, 2); }
        assert.deepEqual(errors, []);
      });
    } catch (error) {
      if (journey) console.error('Journey observer diagnostic', JSON.stringify(await journey.snapshot().catch(() => ({ unavailable: true }))));
      throw error;
    } finally { await journey?.close(); await browser.close(); }
  }, { classrooms: true });
});
