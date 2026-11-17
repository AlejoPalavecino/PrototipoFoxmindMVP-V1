import { startBrowserAttempt } from './helpers/browser-admission-step.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, expect } from '@playwright/test';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';
import { account, api, digest } from './p4-integration-helpers.mjs';
import { classroom, openClassroom, domainSnapshot } from './p6-integration-helpers.mjs';

async function request(page, method, path, body, headers = {}) {
  let result = await api(page, method, path, body, headers);
  if (result.status === 429) {
    const seconds = Number(result.headers['retry-after']); assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60);
    console.log(`Questionnaire fixture honors actual Retry-After=${seconds}s once`);
    await delay(seconds * 1000); result = await api(page, method, path, body, headers);
  }
  return result;
}
const headers = editor => ({ 'x-attempt-editor': editor.token, 'x-attempt-epoch': editor.epoch });

test('P7 actual questionnaire/evaluation UI, confirmed drafts, editor transfer and receipt timing', { timeout: 330000 }, async t => {
  await withP4IntegrationRuntime(async runtime => {
    const owner = spawnSync('docker', ['ps', '--filter', `publish=${runtime.db.connectionParameters.port}`, '--format', '{{.Label "foxmind.p4.owner"}}'], { encoding: 'utf8', windowsHide: true, timeout: 5000 });
    assert.equal(owner.status, 0); assert.match(owner.stdout.trim(), /^[a-f0-9]{16}$/); console.log(`Questionnaire actual disposable owner: ${owner.stdout.trim()}`);
    const browser = await chromium.launch({ headless: true }), scratch = await mkdtemp(join(tmpdir(), 'foxmind-p7-questionnaire-'));
    console.log(`Questionnaire retained browser evidence: ${scratch}`);
    try {
      const teacher = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
      const student = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
      const device = await student.context().newPage(), errors = [], suffix = Date.now();
      for (const page of [teacher, student, device]) page.on('pageerror', error => errors.push(error.message));
      await account(teacher, runtime.origin, runtime.inbox, `p7-answer-teacher-${suffix}@example.test`, undefined, "teacher");
      await account(student, runtime.origin, runtime.inbox, `p7-answer-student-${suffix}@example.test`, undefined, "student");
      const room = await classroom(teacher, student, 'P7 answers classroom');
      const ok = async (...args) => { const result = await request(...args); assert.equal(result.status, 200, `${args[1]} ${args[2]} prerequisite`); return result.body; };
      const detail = await ok(teacher, 'GET', `/classrooms/${room.id}`), unit = detail.units[0].id, topic = detail.units[0].topics[0].id;
      const change = async operation => ok(teacher, 'POST', `/classrooms/${room.id}/activities`, { revision: (await ok(teacher, 'GET', `/classrooms/${room.id}`)).revision, operation });
      const create = async (type, title, short = false) => {
        const { id } = await change({ action: 'create', type });
        const questions = [{ type: 'DEVELOPMENT', prompt: 'Explain your answer', points: '2', scoringRule: null, options: [] }];
        if (!short) questions.push(
          { type: 'SINGLE_CHOICE', prompt: 'Choose one answer', points: '3', scoringRule: 'EXACT', options: [{ text: 'Single first', correct: true }, { text: 'Single second', correct: false }] },
          { type: 'MULTIPLE_CHOICE', prompt: 'Choose several answers', points: '5', scoringRule: 'PARTIAL', options: [{ text: 'Multiple first', correct: true }, { text: 'Multiple second', correct: true }, { text: 'Multiple third', correct: false }] });
        await change({ action: 'save', id, payload: { title, unitId: unit, topicId: topic, instructions: 'Immutable instructions', attachmentRequired: false, instructionFileIds: [], materialIds: [], questions, deadline: null, allowLate: false } });
        await change({ action: 'publish', id }); return id;
      };
      const quiz = await create('QUESTIONNAIRE', 'Real questionnaire'), evaluation = await create('EVALUATION', 'Real evaluation');
      const session = (id = quiz, page = student) => ok(page, 'GET', `/classrooms/${room.id}/activities/${id}/session`);
      const open = async (page, title = 'Real questionnaire', resume = false) => {
        let requests = new WeakSet(), limited = [], phase;
        const setPhase = (path, error, expected) => { requests = new WeakSet(); limited = []; phase = { path, error, expected }; };
        const rateError = () => page.getByRole('alert').filter({ hasText: /Se alcanzó el límite de intentos/ });
        const observeRequest = request => { if (request.method() === 'GET' && new URL(request.url()).pathname === phase?.path) requests.add(request); };
        const observeResponse = response => {
          if (requests.has(response.request()) && response.status() === 429) limited.push(response.json()
            .then(body => ({ code: body.error?.code, retry: response.headers()['retry-after'] })).catch(error => ({ error })));
        };
        const navigate = async () => {
          setPhase('/api/v1/auth/session', rateError().filter({ has: page.getByRole('button', { name: 'Volver a intentar', exact: true }) }),
            page.getByRole('link', { name: new RegExp('^Entrar al aula P7 answers classroom') }));
          await openClassroom(page, runtime.origin, 'P7 answers classroom');
          const article = page.getByRole('article', { name: title, exact: true });
          const activityError = page.getByRole('region', { name: 'Actividades del aula', exact: true })
            .getByRole('alert').filter({ hasText: /Se alcanzó el límite de intentos.*Los cambios no confirmados/s });
          setPhase(`/api/v1/classrooms/${room.id}/activities`, activityError, article);
          await page.getByRole('button', { name: 'Actividades', exact: true }).click();
          await article.waitFor();
          const activityId = title === 'Real evaluation' ? evaluation : quiz;
          setPhase(`/api/v1/classrooms/${room.id}/activities/${activityId}/session`, activityError,
            page.getByRole('region', { name: 'Consulta de actividad', exact: true }));
          await article.getByRole('button', { name: `Abrir ${title}`, exact: true }).click();
          if (resume) await page.locator('.brujula-activity-options').getByRole('button', { name: 'Continuar borrador', exact: true }).click();
        };
        page.on('request', observeRequest); page.on('response', observeResponse);
        try {
          try { await navigate(); } catch (error) {
            if (!limited.length || error.name !== 'TimeoutError' || !await phase.error.isVisible() || await phase.expected.isVisible()) throw error;
            const responses = await Promise.all(limited);
            for (const response of responses) {
              assert.equal(response.error, undefined); assert.equal(response.code, 'RATE_LIMITED');
              assert.match(response.retry ?? '', /^\d+$/);
              const seconds = Number(response.retry); assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60);
            }
            const seconds = Math.max(...responses.map(response => Number(response.retry)));
            console.log(`Questionnaire visible navigation honors actual Retry-After=${seconds}s once`);
            await delay(seconds * 1000); await navigate();
          }
        } finally { page.off('request', observeRequest); page.off('response', observeResponse); }
      };
      const focusAndSaveQuestion = async (page, n) => {
        // The current solver pages questions; reviewing flushes the real draft before navigation.
        let submissions = 0;
        const observe = request => { if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/submit-answers')) submissions++; };
        page.on('request', observe);
        try {
          await page.getByRole('button', { name: 'Revisar entrega', exact: true }).click();
          await page.getByRole('button', { name: 'Cancelar entrega', exact: true }).click();
          assert.equal(submissions, 0, 'Reviewing and cancelling flushes drafts without submitting');
        } finally { page.off('request', observe); }
        await page.getByRole('navigation', { name: 'Preguntas', exact: true })
          .getByRole('button', { name: new RegExp(`^Pregunta ${n},`) }).click();
        const question = page.getByRole('article', { name: `Pregunta ${n}`, exact: true });
        await question.scrollIntoViewIfNeeded();
        await question.locator('textarea, input').first().focus();
      };
      const input = page => page.getByRole('textbox', { name: 'Respuesta a la pregunta 1', exact: true });
      const answerResponse = page => page.waitForResponse(r => r.url().endsWith('/answer') && r.request().method() === 'POST');
      const saved = page => page.getByRole('status').filter({ hasText: /^Borrador guardado$/ }).waitFor();
      const fullSnapshot = async () => {
        const rows = [await domainSnapshot(runtime.db)];
        for (const [table, key] of [['answers','id'], ['answer_selections','answer_id,option_id'], ['attempt_grades','id'], ['question_grades','id'], ['grade_corrections','id']])
          rows.push((await runtime.db.query(`SELECT row_to_json(t)::text value FROM ${table} t ORDER BY ${key}`)).rows);
        return digest(JSON.stringify(rows));
      };
      let failed = false, attempt, editor, movedEditor;
      const check = (name, action) => t.test(name, { skip: failed ? 'Prior actual questionnaire prerequisite failed' : false }, async () => { try { await action(); } catch (e) { failed = true; throw e; } });
      await check('actual start, two-second idle and explicit review flush persist multiline and choices; navigation retains pending text without submission', async () => {
        assert.equal((await session()).attempt, null); await open(student);
        const result = await startBrowserAttempt(student, room.id, quiz, 30000, 'Empezar actividad'); assert.equal(result.status(), 200); const state = await result.json(); attempt = state.attempt; editor = state.editor;
        const pending = answerResponse(student), began = Date.now(); await input(student).fill('  Confirmed first line\nSecond line 😀  ');
        const response = await pending; assert.equal(response.status(), 200); assert.ok(Date.now() - began >= 1900); await saved(student);
        assert.equal((await session()).attempt.answers[0].text, '  Confirmed first line\nSecond line 😀  ');
        const navigationSave = answerResponse(student); await input(student).fill('Navigation saves this\nexact answer');
        await student.getByRole('button', { name: 'Siguiente', exact: true }).click();
        await student.getByRole('article', { name: 'Pregunta 2', exact: true }).waitFor();
        await student.getByRole('button', { name: 'Anterior', exact: true }).click();
        assert.equal(await input(student).inputValue(), 'Navigation saves this\nexact answer');
        await focusAndSaveQuestion(student, 2);
        assert.equal((await navigationSave).status(), 200);
        await student.getByRole('radio', { name: 'Single second', exact: true }).check();
        const selected = answerResponse(student); await focusAndSaveQuestion(student, 3); assert.equal((await selected).status(), 200);
        const current = await session(); assert.equal(current.unansweredCount, 1); assert.equal(current.attempt.status, 'DRAFT');
        assert.ok(!/"(?:correct|scoringRule|is_correct|editor_token_hash|final_grade)"/.test(JSON.stringify(current)));
        await focusAndSaveQuestion(student, 1);
      });
      await check('network-controlled delayed acknowledgement over real persistence cannot mark a newer edit saved or clobber it on focus', async () => {
        let release, entered; const enteredPromise = new Promise(r => entered = r), gate = new Promise(r => release = r); let intercepted = false;
        await student.route('**/attempts/*/answer', async route => {
          if (intercepted) return route.continue(); intercepted = true;
          const response = await route.fetch(); assert.equal(response.status(), 200); entered(); await gate; await route.fulfill({ response });
        });
        try {
          await input(student).fill('First generation awaiting acknowledgement'); await enteredPromise;
          await input(student).fill('Newer generation must remain unsaved until acknowledged');
          await student.evaluate(() => window.dispatchEvent(new Event('focus')));
          assert.equal(await input(student).inputValue(), 'Newer generation must remain unsaved until acknowledged');
          assert.equal(await student.getByRole('status').filter({ hasText: /^Borrador guardado$/ }).count(), 0);
          const next = student.waitForResponse(r => r.url().endsWith('/answer') && r.request().postDataJSON().text === 'Newer generation must remain unsaved until acknowledged');
          release(); assert.equal((await next).status(), 200); await saved(student);
          assert.equal((await session()).attempt.answers.find(a => a.text !== null).text, 'Newer generation must remain unsaved until acknowledged');
        } finally { release?.(); await student.unroute('**/attempts/*/answer'); }
      });
      await check('network-controlled failure retains editable on-screen text, blocks send, retries actual persistence and survives API restart', async () => {
        await student.route('**/attempts/*/answer', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":{"code":"SERVICE_UNAVAILABLE"}}' }));
        await input(student).fill('Failure must stay on screen'); await student.getByRole('button', { name: 'Revisar entrega', exact: true }).click();
        await student.getByText('Tus respuestas siguen en pantalla. Podés reintentar el guardado.', { exact: false }).waitFor();
        assert.equal(await input(student).inputValue(), 'Failure must stay on screen'); await expect(input(student)).toBeEnabled({ timeout: 30000 });
        assert.equal(await student.getByRole('region', { name: 'Confirmar entrega de respuestas' }).count(), 0);
        assert.notEqual((await session()).attempt.answers.find(a => a.text !== null).text, 'Failure must stay on screen');
        await student.unroute('**/attempts/*/answer');
        const retried = answerResponse(student); await student.getByRole('button', { name: 'Reintentar guardado', exact: true }).click(); assert.equal((await retried).status(), 200);
        await expect(input(student)).toHaveCount(0); // Successful current retry saves and exits the solver.
        assert.equal((await session()).attempt.answers.find(a => a.text !== null).text, 'Failure must stay on screen');
        await runtime.restartApi(); assert.equal((await session()).attempt.answers.find(a => a.text !== null).text, 'Failure must stay on screen');
        let starts = 0;
        const observe = request => { if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/start')) starts++; };
        student.on('request', observe);
        try {
          await open(student, 'Real questionnaire', true);
          assert.equal(await input(student).isDisabled(), true);
          assert.equal(await input(student).inputValue(), 'Failure must stay on screen');
          assert.equal((await session()).attempt.id, attempt.id);
          await student.getByRole('button', { name: 'Continuar en esta pestaña', exact: true }).click();
          const transfer = student.waitForResponse(r => r.url().endsWith(`/attempts/${attempt.id}/transfer`));
          await student.getByRole('button', { name: 'Confirmar transferencia', exact: true }).click();
          const response = await transfer; assert.equal(response.status(), 200);
          const state = await response.json(); assert.equal(state.attempt.id, attempt.id);
          assert.ok(BigInt(state.editor.epoch) > BigInt(editor.epoch)); editor = state.editor;
          assert.equal(await input(student).inputValue(), 'Failure must stay on screen');
          assert.equal(await input(student).isEnabled(), true);
          assert.equal(starts, 0, 'Reopening and explicit transfer preserve the same attempt without starting another');
        } finally { student.off('request', observe); }
      });
      await check('second tab starts read-only; transfer reloads confirmed answers, warns and denies the previous editor without state mutation', async () => {
        await open(device, 'Real questionnaire', true); assert.equal(await input(device).isDisabled(), true); assert.equal(await input(device).inputValue(), 'Failure must stay on screen');
        await input(student).fill('Unconfirmed previous session must not transfer');
        await device.getByRole('button', { name: 'Continuar en esta pestaña', exact: true }).click();
        await device.getByRole('region', { name: 'Confirmar transferencia de edición', exact: true })
          .getByText('La otra pestaña o dispositivo dejará de poder guardar y entregar. Recuperarás el último borrador guardado; los cambios sin guardar de la otra sesión no se transfieren.', { exact: true }).waitFor();
        const transfer = device.waitForResponse(r => r.url().endsWith(`/attempts/${attempt.id}/transfer`)); await device.getByRole('button', { name: 'Confirmar transferencia', exact: true }).click();
        const response = await transfer; assert.equal(response.status(), 200); const state = await response.json(); movedEditor = state.editor;
        assert.equal(await input(device).inputValue(), 'Failure must stay on screen'); assert.equal(await input(device).isEnabled(), true);
        const before = await fullSnapshot(), current = await session();
        const denied = await request(student, 'POST', `/classrooms/${room.id}/attempts/${attempt.id}/answer`, { revision: current.attempt.revision, questionId: current.activity.questions[0].id, text: 'stale overwrite', optionIds: [] }, headers(editor));
        assert.equal(denied.status, 403); assert.equal(await fullSnapshot(), before);
        const focus = student.waitForResponse(r => r.url().endsWith(`/activities/${quiz}/session`)); await student.evaluate(() => window.dispatchEvent(new Event('focus'))); assert.equal((await focus).status(), 200);
        await input(student).waitFor(); assert.equal(await input(student).isDisabled(), true);
        await open(device, 'Real questionnaire', true); assert.equal(await input(device).isDisabled(), true); assert.equal(await input(device).inputValue(), 'Failure must stay on screen');
        await device.getByRole('button', { name: 'Continuar en esta pestaña', exact: true }).click();
        const again = device.waitForResponse(r => r.url().endsWith('/transfer')); await device.getByRole('button', { name: 'Confirmar transferencia', exact: true }).click();
        const taken = await again; assert.equal(taken.status(), 200); movedEditor = (await taken.json()).editor;
      });
      await check('incomplete count/zero warning/cancel preserve draft; explicit confirmation creates a frozen receipt and no grade', async () => {
        const before = await fullSnapshot(); await device.getByRole('button', { name: 'Revisar entrega', exact: true }).click();
        await device.getByRole('region', { name: 'Confirmar entrega de respuestas', exact: true }).getByText('Quedan 1 pregunta sin responder. Las respuestas vacías recibirán cero puntos.', { exact: false }).waitFor();
        await device.getByRole('button', { name: 'Cancelar entrega', exact: true }).click(); assert.equal(await fullSnapshot(), before); assert.equal(await input(device).isEnabled(), true);
        const current = await session(), deniedBefore = await fullSnapshot();
        const denied = await request(device, 'POST', `/classrooms/${room.id}/attempts/${attempt.id}/submit-answers`, { revision: current.attempt.revision, confirm: true, confirmIncomplete: false }, headers(movedEditor));
        assert.equal(denied.status, 409); assert.equal(await fullSnapshot(), deniedBefore);
        await device.getByRole('button', { name: 'Revisar entrega', exact: true }).click();
        const submitted = device.waitForResponse(r => r.url().endsWith('/submit-answers')); await device.getByRole('button', { name: 'Confirmar entrega incompleta', exact: true }).click();
        assert.equal((await submitted).status(), 200);
        await device.getByRole('region', { name: 'Comprobante de entrega', exact: true }).getByText('Entrega confirmada', { exact: true }).waitFor();
        for (const role of ['textbox', 'radio', 'checkbox']) assert.equal(await device.getByRole(role).count(), 0, 'Confirmed receipt has no editable answers');
        assert.equal((await session()).attempt.status, 'SUBMITTED');
        await device.screenshot({ path: join(scratch, 'questionnaire-submitted.png'), fullPage: true });
      });
      await check('actual evaluation uses all three controls, complete confirmation and confirmed-only reload without result publication', async () => {
        await open(student, 'Real evaluation'); const started = await startBrowserAttempt(student, room.id, evaluation, 30000, 'Empezar actividad');
        assert.equal(started.status(), 200);
        await input(student).fill('Evaluation multiline\nanswer'); const first = answerResponse(student); await focusAndSaveQuestion(student, 2); assert.equal((await first).status(), 200);
        await student.getByRole('radio', { name: 'Single first', exact: true }).check(); const second = answerResponse(student); await focusAndSaveQuestion(student, 3); assert.equal((await second).status(), 200);
        await student.getByRole('checkbox', { name: 'Multiple first', exact: true }).check(); await student.getByRole('checkbox', { name: 'Multiple second', exact: true }).check();
        const third = answerResponse(student); await focusAndSaveQuestion(student, 1); assert.equal((await third).status(), 200);
        await student.getByRole('button', { name: 'Revisar entrega', exact: true }).click();
        const completeConfirmation = student.getByRole('region', { name: 'Confirmar entrega de respuestas', exact: true });
        await completeConfirmation.getByRole('heading', { name: '3 de 3 preguntas respondidas', exact: true }).waitFor();
        assert.equal(await completeConfirmation.getByRole('button', { name: 'Confirmar entrega incompleta', exact: true }).count(), 0);
        await completeConfirmation.getByRole('button', { name: 'Confirmar envío de respuestas', exact: true }).waitFor();
        const response = student.waitForResponse(r => r.url().endsWith('/submit-answers')); await student.getByRole('button', { name: 'Confirmar envío de respuestas', exact: true }).click();
        const sent = await response; assert.equal(sent.status(), 200); assert.equal((await sent.json()).unansweredCount, 0);
        const attemptsBeforeReload = (await runtime.db.query('SELECT count(*)::int n FROM attempts')).rows[0].n;
        let startsAfterSubmission = 0;
        const observeStart = request => { if (request.method() === 'POST' && /\/activities\/[^/]+\/start$/.test(new URL(request.url()).pathname)) startsAfterSubmission++; };
        student.on('request', observeStart);
        try {
          await open(student, 'Real evaluation');
          await student.getByRole('group', { name: 'Vista de la actividad', exact: true })
            .getByRole('button', { name: /^Mis intentos/ }).click();
          await student.getByRole('button', { name: 'Consultar intento 1', exact: true }).click();
          const history = student.getByRole('region', { name: 'Intento histórico confirmado', exact: true });
          await history.getByRole('button', { name: 'Ver lo que entregué', exact: true }).click();
          const answers = student.getByRole('dialog', { name: 'Tu entrega', exact: true });
          await answers.getByText('Evaluation multiline\nanswer', { exact: true }).waitFor();
          for (const role of ['textbox', 'radio', 'checkbox']) assert.equal(await answers.getByRole(role).count(), 0);
          const confirmed = await session(evaluation);
          assert.equal(confirmed.canTransfer, false); assert.equal(confirmed.attempt.status, 'SUBMITTED');
          assert.ok(!/"(?:correct|scoringRule|is_correct|editor_token_hash|final_grade)"/.test(JSON.stringify(confirmed)));
          assert.equal(startsAfterSubmission, 0);
          assert.equal((await runtime.db.query('SELECT count(*)::int n FROM attempts')).rows[0].n, attemptsBeforeReload);
        } finally { student.off('request', observeStart); }
        for (const table of ['attempt_grades','question_grades','grade_corrections']) assert.equal((await runtime.db.query(`SELECT count(*)::int n FROM ${table}`)).rows[0].n, 0);
        assert.equal(await student.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)].some(key => /attempt|editor|answer/i.test(key))), false);
        await student.setViewportSize({ width: 375, height: 900 }); assert.equal(await student.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await student.screenshot({ path: join(scratch, 'evaluation-confirmed-375.png'), fullPage: true });
      });
      await check('real complete-body receipt remains on time across bounded lock wait; incomplete early request completed late rejects unchanged', async () => {
        const credentials = async editor => {
          const token = await student.evaluate(async () => { const r = await fetch('/api/v1/auth/csrf'); if (!r.ok) throw Error('CSRF prerequisite'); return (await r.json()).csrfToken; });
          return { 'content-type': 'application/json', origin: runtime.origin, cookie: (await student.context().cookies()).map(c => c.name + '=' + c.value).join('; '), 'x-csrf-token': token, ...headers(editor) };
        };
        const wire = (state, h, wait = 0) => new Promise((resolve, reject) => {
          const body = JSON.stringify({ revision: state.attempt.revision, confirm: true, confirmIncomplete: true });
          const req = httpRequest(runtime.origin + `/api/v1/classrooms/${room.id}/attempts/${state.attempt.id}/submit-answers`, { method: 'POST', headers: { ...h, 'content-length': String(Buffer.byteLength(body)) } }, res => {
            const parts = []; res.on('data', c => parts.push(c)); res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(parts)) }));
          }); req.on('error', reject);
          if (wait) { req.write(body.slice(0, 10)); setTimeout(() => req.end(body.slice(10)), wait); } else req.end(body);
        });
        const timing = async name => { const id = await create('EVALUATION', name, true); return ok(student, 'POST', `/classrooms/${room.id}/activities/${id}/start`, {}); };
        const state = await timing('Questionnaire timing wait'), h = await credentials(state.editor);
        await runtime.db.query("UPDATE attempts SET individual_deadline_at=clock_timestamp()+interval '400 milliseconds' WHERE id=$1", [state.attempt.id]);
        const deadline = (await runtime.db.query('SELECT individual_deadline_at d FROM attempts WHERE id=$1', [state.attempt.id])).rows[0].d;
        let pending; await runtime.db.query('BEGIN');
        try {
          await runtime.db.query('SELECT id FROM classrooms WHERE id=$1 FOR UPDATE', [room.id]); pending = wire(state, h);
          let waiting = false;
          for (let i = 0; i < 20; i++) { if ((await runtime.db.query("SELECT count(*)::int n FROM pg_stat_activity WHERE wait_event_type='Lock' AND datname=current_database() AND pid<>pg_backend_pid()")).rows[0].n > 0) { waiting = true; break; } await delay(15); }
          assert.equal(waiting, true); await delay(Math.max(0, +deadline - Date.now() + 100));
        } finally { await runtime.db.query('COMMIT'); }
        const onTime = await pending; assert.equal(onTime.status, 200); assert.equal(onTime.body.submittedLate, false); assert.ok(new Date(onTime.body.submittedAt) < deadline); assert.ok(Date.now() > +deadline);
        const late = await timing('Questionnaire delayed body'), lateHeaders = await credentials(late.editor);
        await runtime.db.query("UPDATE attempts SET individual_deadline_at=clock_timestamp()+interval '400 milliseconds' WHERE id=$1", [late.attempt.id]);
        const before = await fullSnapshot(), rejected = await wire(late, { ...lateHeaders, 'x-submitted-at': '2000-01-01' }, 650);
        assert.equal(rejected.status, 409); assert.equal(await fullSnapshot(), before);
        assert.deepEqual(errors, []);
      });
    } finally { await browser.close(); }
  }, { classrooms: true });
});
