import { visibleNavigation } from './entry-glass-browser-helpers.mjs';
import { startBrowserAttempt, openActivityOverview, openPracticalActivity, openTeacherActivity, selectClassroomSection, watchActionResponse } from './p8-current-ui-helpers.mjs';
import { readdirSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { setTimeout as delay } from 'node:timers/promises';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';
import { account, api, digest } from './p4-integration-helpers.mjs';
import { classroom, openClassroom, planPdf } from './p6-integration-helpers.mjs';
import { watchResponse, createJourneyObserver } from './helpers/browser-action-observer.mjs';
import { runAdmittedAction } from './helpers/browser-admission-step.mjs';
import { openPublicationPractical } from './p8-publication-browser-helpers.mjs';

async function request(page, method, path, body, headers) {
  let result = await api(page, method, path, body, headers, { stopOnCsrfFailure: true });
  if (result.status === 429) {
    assert.equal(result.body?.error?.code, 'RATE_LIMITED');
    const retry = result.headers['retry-after']; assert.match(retry ?? '', /^\d+$/);
    const seconds = Number(retry); assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60);
    console.log(`P8 fixture honors actual Retry-After=${seconds}s once`); await delay(seconds * 1000); result = await api(page, method, path, body, headers, { stopOnCsrfFailure: true });
  }
  return result;
}
async function ok(...args) { const result = await request(...args); assert.equal(result.status, 200, `${args[1]} ${args[2]}`); return result.body; }

/** Retry only a visible read journey, never an action that can transmit a mutation. */
async function navigateWithReadRecovery(page, navigate) {
  let requests = new WeakSet(), limited = [], phase;
  const setPhase = (path, error, expected) => { requests = new WeakSet(); limited = []; phase = { path, error, expected }; };
  const observeRequest = request => { if (request.method() === 'GET' && new URL(request.url()).pathname === phase?.path) requests.add(request); };
  const observeResponse = response => {
    if (requests.has(response.request()) && response.status() === 429) limited.push(response.json()
      .then(body => ({ code: body.error?.code, retry: response.headers()['retry-after'] })).catch(error => ({ error })));
  };
  page.on('request', observeRequest); page.on('response', observeResponse);
  try {
    try { await navigate(setPhase); } catch (error) {
      if (!limited.length || error.name !== 'TimeoutError' || !await phase.error.isVisible() || await phase.expected.isVisible()) throw error;
      const responses = await Promise.all(limited);
      for (const response of responses) {
        assert.equal(response.error, undefined); assert.equal(response.code, 'RATE_LIMITED');
        assert.match(response.retry ?? '', /^\d+$/);
        const seconds = Number(response.retry); assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60);
      }
      const seconds = Math.max(...responses.map(response => Number(response.retry)));
      console.log(`P8 publication visible navigation honors actual Retry-After=${seconds}s once`);
      await delay(seconds * 1000); await navigate(setPhase);
    }
  } finally { page.off('request', observeRequest); page.off('response', observeResponse); }
}

test('P8 actual all-type delivery -> saved private correction -> cancel -> explicit publication -> safe own result/notification/restart', { timeout: 330000 }, async t => {
  await withP4IntegrationRuntime(async runtime => {
    assert.deepEqual(runtime.migrations, readdirSync('prisma/migrations').filter(name => /^\d+_/.test(name)).sort());
    assert.deepEqual(runtime.migrations.filter(name => ['202610230001_agenda_events', '202610230001_classroom_ai', '202610240001_agenda_event_color', '202610250001_activity_topics', '202610250002_activity_ai'].includes(name)), [
      '202610230001_agenda_events',
      '202610230001_classroom_ai',
      '202610240001_agenda_event_color',
      '202610250001_activity_topics',
      '202610250002_activity_ai',
    ]);
    const scratch = await mkdtemp(join(tmpdir(), 'foxmind-p8-publication-')); console.log(`P8 retained browser evidence: ${scratch}`);
    const browser = await chromium.launch({ headless: true });
    let journey, originalFailure;
    try {
      const teacher = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
      const student = await (await browser.newContext({ viewport: { width: 375, height: 812 } })).newPage();
      journey = createJourneyObserver({ teacher, student });
      journey.setStage('teacher', 'setup', 'bootstrap'); journey.setStage('student', 'setup', 'bootstrap');
      const errors = []; for (const page of [teacher, student]) { page.setDefaultTimeout(12000); page.on('pageerror', e => errors.push(e.message)); }
      const suffix = Date.now(); await account(teacher, runtime.origin, runtime.inbox, `p8-teacher-${suffix}@example.test`, undefined, "teacher");
      const studentUser = await account(student, runtime.origin, runtime.inbox, `p8-student-${suffix}@example.test`, undefined, "student");
      const name = 'P8 publication classroom', room = await classroom(teacher, student, name), detail = await ok(teacher, 'GET', `/classrooms/${room.id}`);
      const change = async operation => ok(teacher, 'POST', `/classrooms/${room.id}/activities`, { revision: (await ok(teacher, 'GET', `/classrooms/${room.id}`)).revision, operation });
      const activities = [];
      for (const type of ['QUESTIONNAIRE', 'EVALUATION', 'ASSIGNMENT']) {
        journey.setStage('teacher', type, 'setup'); journey.setStage('student', type, 'setup');
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
      const check = (label, fn) => t.test(label, { skip: failed ? 'Earlier actual publication prerequisite failed' : false }, async () => { try { await fn(); } catch (e) { failed = true; console.error('Journey observer partial diagnostic', JSON.stringify(await journey.snapshot({ waitForPending: false }).catch(() => ({ unavailable: true, partial: true })))); throw e; } });
      for (const activity of activities) await check(`${activity.type} real browser saved correction is explicitly published to its own result and notification`, async () => {
        journey.setStage('teacher', activity.type, 'fixture'); journey.setStage('student', activity.type, 'start');
        await navigateWithReadRecovery(student, async setPhase => {
          setPhase('/api/v1/auth/session', student.getByRole('alert').filter({ hasText: /Se alcanzó el límite de intentos/ })
            .filter({ has: student.getByRole('button', { name: 'Volver a intentar', exact: true }) }),
            student.getByRole('link', { name: new RegExp(`^Entrar al aula ${name}`) }));
          await openClassroom(student, runtime.origin, name);
          const article = student.getByRole('article', { name: activity.title, exact: true });
          setPhase(`/api/v1/classrooms/${room.id}/activities`, student.getByRole('region', { name: 'Actividades del aula', exact: true })
            .getByRole('alert').filter({ hasText: /Se alcanzó el límite de intentos.*Los cambios no confirmados/s }), article);
          await selectClassroomSection(student, 'activities', 'Actividades'); await article.waitFor();
        });
        const open = () => activity.type === 'ASSIGNMENT'
          ? openPracticalActivity(student, room.id, activity.id, activity.title) : openActivityOverview(student, activity.title);
        let openingStates = [], actualAttemptId;
        if (activity.type === 'ASSIGNMENT') {
          const sessionPath = `/api/v1/classrooms/${room.id}/activities/${activity.id}/session`;
          const startPath = `/api/v1/classrooms/${room.id}/activities/${activity.id}/start`;
          const captureOpening = response => {
            const path = new URL(response.url()).pathname;
            if (response.status() === 200 && ((path === sessionPath && response.request().method() === 'GET') || (path === startPath && response.request().method() === 'POST')
              || (path.startsWith(`/api/v1/classrooms/${room.id}/attempts/`) && path.endsWith('/transfer') && response.request().method() === 'POST')))
              openingStates.push(response.json().then(value => ({ value }), () => ({ invalid: true })));
          };
          student.on('response', captureOpening);
          try { await openPublicationPractical(student, room.id, activity.id, open); }
          finally { student.off('response', captureOpening); openingStates = await Promise.all(openingStates); }
          assert.ok(openingStates.every(item => !item.invalid), 'Opening responses must have valid JSON');
          openingStates = openingStates.map(item => item.value);
        }
        else await open();
        if (activity.type === 'ASSIGNMENT') {
          journey.setStage('student', activity.type, 'upload');
          try {
          const bytes = await planPdf('P8 immutable submitted file');
          const currentSession = openingStates.findLast(value => value.attempt?.status === 'DRAFT' && value.editor);
          assert.ok(currentSession); assert.equal(currentSession.editor.epoch, currentSession.attempt.epoch);
          assert.ok(openingStates.filter(value => value.attempt?.status === 'DRAFT').every(value => value.attempt.id === currentSession.attempt.id));
          actualAttemptId = currentSession.attempt.id;
          assert.equal(currentSession.attempt.status, 'DRAFT');
          const attemptPath = `/api/v1/classrooms/${room.id}/attempts/${currentSession.attempt.id}`;
          await student.getByLabel('Seleccionar archivo del trabajo', { exact: true }).setInputFiles({ name: 'p8-original.pdf', mimeType: 'application/pdf', buffer: bytes });
          const uploadEvents = [];
          const captureUpload = response => {
            const path = new URL(response.url()).pathname, method = response.request().method();
            if (!(path === '/api/v1/auth/csrf' || path === '/api/v1/files' || (path.startsWith('/api/v1/files/') && path.endsWith('/content')))) return;
            uploadEvents.push((async () => {
              const rawCode = response.ok() ? null : (await response.json().catch(() => null))?.error?.code;
              const allowed = ['AUTH_REQUIRED', 'CSRF_INVALID', 'RATE_LIMITED', 'CONFLICT', 'FORBIDDEN', 'SERVICE_UNAVAILABLE', 'INVALID_INPUT'];
              return { operation: path === '/api/v1/auth/csrf' ? 'csrf' : path === '/api/v1/files' ? 'allocate' : 'content', method,
                status: response.status(), code: allowed.includes(rawCode) ? rawCode : null };
            })());
          };
          student.on('response', captureUpload);
          const allocate = watchResponse(student, response => {
            if (new URL(response.url()).pathname !== '/api/v1/files' || response.request().method() !== 'POST') return false;
            const body = response.request().postDataJSON();
            return body?.scope?.id === room.id && body?.purpose === 'attachment' && body?.targetId === currentSession.attempt.id;
          }, 12000);
          const upload = watchResponse(student, response => /^\/api\/v1\/files\/[0-9a-f-]+\/content$/i.test(new URL(response.url()).pathname)
            && response.request().method() === 'PUT', 12000);
          const makeRefresh = () => {
            const paths = [`/api/v1/classrooms/${room.id}/activities/${activity.id}/session`, `/api/v1/classrooms/${room.id}`, `/api/v1/classrooms/${room.id}/activities`];
            const watches = paths.map(path => watchResponse(student, response => response.request().method() === 'GET' && new URL(response.url()).pathname === path, 12000));
            return { watches, dispose() { watches.forEach(watch => watch.dispose()); } };
          };
          let refresh = makeRefresh(), fileId;
          try {
            await student.getByRole('button', { name: 'Subir archivo privado', exact: true }).click();
            const allocation = await allocate.value(); assert.equal(allocation.status(), 201);
            const allocated = await allocation.json(), uploaded = await upload.value(); assert.equal(uploaded.status(), 200);
            assert.equal(new URL(uploaded.url()).pathname, `/api/v1/files/${allocated.id}/content`);
            fileId = allocated.id; assert.equal((await uploaded.json()).ready, true);
            const inspectRefresh = async group => {
              const sessionResponse = await group.watches[0].value();
              const responses = [sessionResponse];
              if (sessionResponse.status() === 200) responses.push(await group.watches[1].value(), await group.watches[2].value());
              const limited = responses.filter(response => response.status() === 429);
              for (const response of responses.filter(response => response.status() !== 429)) assert.equal(response.status(), 200);
              if (limited.length) {
                const seconds = [];
                for (const response of limited) {
                  assert.equal((await response.json()).error.code, 'RATE_LIMITED');
                  const retry = response.headers()['retry-after']; assert.match(retry ?? '', /^\d+$/);
                  const value = Number(retry); assert.ok(Number.isInteger(value) && value >= 1 && value <= 60); seconds.push(value);
                }
                return { retryAfter: Math.max(...seconds) };
              }
              const state = await sessionResponse.json();
              assert.equal(state.attempt.id, currentSession.attempt.id); assert.equal(state.attempt.status, 'DRAFT');
              assert.ok(state.attempt.attachments.some(item => item.id === fileId && item.selected && item.ready));
              return { retryAfter: null };
            };
            let refreshed = await inspectRefresh(refresh);
            if (refreshed.retryAfter !== null) {
              refresh.dispose(); await delay(refreshed.retryAfter * 1000); journey.setStage('student', activity.type, 'refresh');
              refresh = makeRefresh();
              await student.getByRole('button', { name: 'Actualizar estado confirmado', exact: true }).click();
              refreshed = await inspectRefresh(refresh); assert.equal(refreshed.retryAfter, null, 'second refresh must succeed');
            }
            await expect(student.getByRole('button', { name: 'Revisar entrega', exact: true })).toBeEnabled({ timeout: 12000 });
          } catch (error) {
            console.error('P8 publication upload diagnostic', JSON.stringify({ alerts: await student.getByRole('alert').count(),
              uploadButtonVisible: await student.getByRole('button', { name: 'Subir archivo privado', exact: true }).isVisible(), events: await Promise.all(uploadEvents) }));
            throw error;
          } finally { allocate.dispose(); upload.dispose(); refresh.dispose(); student.off('response', captureUpload); }
          journey.setStage('student', activity.type, 'submit');
          await student.getByRole('button', { name: 'Revisar entrega', exact: true }).click();
          const submitEvents = [];
          const captureSubmit = response => {
            const path = new URL(response.url()).pathname, method = response.request().method();
            const operation = path === '/api/v1/auth/csrf' && method === 'GET' ? 'csrf'
              : path === `${attemptPath}/submit-practical` && method === 'POST' ? 'submit' : null;
            if (!operation) return;
            submitEvents.push((async () => {
              const rawCode = response.ok() ? null : (await response.json().catch(() => null))?.error?.code;
              const allowed = ['AUTH_REQUIRED', 'CSRF_INVALID', 'RATE_LIMITED', 'CONFLICT', 'FORBIDDEN', 'SERVICE_UNAVAILABLE', 'INVALID_INPUT'];
              const retry = response.headers()['retry-after'];
              return { operation, status: response.status(), code: allowed.includes(rawCode) ? rawCode : null,
                retryAfter: /^\d{1,4}$/.test(retry ?? '') ? Number(retry) : null };
            })());
          };
          const submitRequests = [];
          const captureSubmitRequest = request => { if (request.method() === 'POST' && new URL(request.url()).pathname === `${attemptPath}/submit-practical`) submitRequests.push(request); };
          student.on('response', captureSubmit);
          student.on('request', captureSubmitRequest);
          let requestsBeforeGesture = 0;
          try {
            const result = await runAdmittedAction({
              mutationPath: `${attemptPath}/submit-practical`,
              observe: () => watchResponse(student, response => {
                const path = new URL(response.url()).pathname, method = response.request().method();
                return (path === '/api/v1/auth/csrf' && method === 'GET' && response.status() !== 200)
                  || (path === `${attemptPath}/submit-practical` && method === 'POST');
              }, 12000),
              action: async () => {
                requestsBeforeGesture = submitRequests.length;
                await student.getByRole('button', { name: 'Confirmar envío del trabajo', exact: true }).click();
              },
              wait: delay,
              onLimited: async (_response, phase) => {
                if (phase === 'csrf') assert.equal(submitRequests.length, requestsBeforeGesture);
                await student.getByRole('alert').filter({ hasText: /límite de intentos/i }).waitFor();
                const practical = student.getByRole('region', { name: 'Archivos y entrega del trabajo práctico', exact: true });
                await practical.getByText('Borrador confirmado · aprobado', { exact: true }).waitFor();
                await student.getByRole('region', { name: 'Confirmar entrega del trabajo práctico', exact: true }).waitFor();
              },
            });
            assert.equal(result.status(), 200); assert.equal(result.request().method(), 'POST');
            assert.equal(new URL(result.url()).pathname, `${attemptPath}/submit-practical`);
            assert.equal(result.request().postDataJSON().confirm, true);
          } catch (error) {
            const flags = await student.getByRole('alert').evaluateAll(elements => {
              const visible = elements.filter(element => element.getClientRects().length).map(element => element.textContent ?? '');
              return { rateLimit: visible.some(text => /límite|espera antes/i.test(text)),
                editorControl: visible.some(text => /control de edición|sesión cambió/i.test(text)),
                connection: visible.some(text => /conexión|no se pudo conectar|no disponible/i.test(text)) };
            });
            console.error('P8 practical submit diagnostic', JSON.stringify({ flags, events: await Promise.all(submitEvents) }));
            throw error;
          } finally { student.off('response', captureSubmit); student.off('request', captureSubmitRequest); }
          await student.getByRole('region', { name: 'Comprobante de entrega', exact: true }).getByText('Entrega confirmada', { exact: true }).waitFor();
          } catch (error) {
            const button = student.getByRole('button', { name: 'Revisar entrega', exact: true });
            const disabled = await button.count() === 1 ? await button.isDisabled().catch(() => null) : null;
            const diagnostic = await journey.snapshot({ waitForPending: false }).catch(() => ({ unavailable: true, partial: true }));
            console.error('P8 prior stages diagnostic', JSON.stringify({ submitDisabled: disabled, ...diagnostic }));
            throw error;
          }
        } else {
          const response = await startBrowserAttempt(student, room.id, activity.id, 12000); assert.equal(response.status(), 200);
          const state = await response.json(); assert.equal(state.attempt.status, 'DRAFT'); actualAttemptId = state.attempt.id;
          await student.getByRole('textbox', { name: 'Respuesta a la pregunta 1', exact: true }).fill('Actual preserved answer 😀');
          await student.getByRole('button', { name: 'Revisar entrega', exact: true }).click();
          const submitted = student.waitForResponse(r => r.url().endsWith('/submit-answers'));
          await student.getByRole('button', { name: 'Confirmar envío de respuestas', exact: true }).click(); assert.equal((await submitted).status(), 200);
          await student.getByRole('region', { name: 'Comprobante de entrega', exact: true }).getByText('Entrega confirmada', { exact: true }).waitFor();
        }
        activity.attempt = actualAttemptId; assert.ok(activity.attempt);
        journey.setStage('teacher', activity.type, 'grading');
        const path = `/classrooms/${room.id}/attempts/${activity.attempt}/grading`, before = await protectedHash();
        const previewHash = await gradeHash(); await ok(teacher, 'GET', path); assert.equal(await gradeHash(), previewHash);
        await navigateWithReadRecovery(teacher, async setPhase => {
          setPhase('/api/v1/auth/session', teacher.getByRole('alert').filter({ hasText: /Se alcanzó el límite de intentos/ })
            .filter({ has: teacher.getByRole('button', { name: 'Volver a intentar', exact: true }) }),
            teacher.getByRole('link', { name: new RegExp(`^Entrar al aula ${name}`) }));
          await openClassroom(teacher, runtime.origin, name);
          const article = teacher.getByRole('article', { name: activity.title, exact: true });
          const activityError = teacher.getByRole('region', { name: 'Actividades del aula', exact: true })
            .getByRole('alert').filter({ hasText: /Se alcanzó el límite de intentos.*Los cambios no confirmados/s });
          setPhase(`/api/v1/classrooms/${room.id}/activities`, activityError, article);
          await selectClassroomSection(teacher, 'activities', 'Actividades'); await article.waitFor();
          setPhase(`/api/v1/classrooms/${room.id}/activities/${activity.id}`, activityError,
            teacher.getByRole('region', { name: 'Vista previa docente', exact: true }));
          await openTeacherActivity(teacher, activity.title);
        });
        await teacher.getByRole('button', { name: 'Ver entregas', exact: true }).click();
        await teacher.getByRole('button', { name: 'Revisar entrega · Intento 1', exact: true }).click();
        const region = teacher.getByRole('region', { name: 'Corrección privada del intento', exact: true });
        await region.getByText('Corrección privada: el estudiante no ve esta calificación.', { exact: false }).waitFor();
        const entered = activity.type === 'ASSIGNMENT' ? '8,50' : activity.type === 'QUESTIONNAIRE' ? '8,35' : '0';
        await region.getByLabel(activity.type === 'ASSIGNMENT' ? 'Nota final' : 'Puntos de la pregunta 1', { exact: true }).fill(entered);
        await region.getByRole('button', { name: 'Devolución', exact: true }).click();
        await region.getByLabel('Devolución general opcional', { exact: true }).fill('Private general feedback');
        const saved = teacher.waitForResponse(r => r.url().endsWith('/grading') && r.request().method() === 'POST');
        await region.getByRole('button', { name: 'Guardar corrección privada', exact: true }).click(); assert.equal((await saved).status(), 200);
        const expected = activity.type === 'ASSIGNMENT' ? '8.50' : activity.type === 'QUESTIONNAIRE' ? '8.35' : '0.00'; activity.expected = expected;
        await region.getByRole('button', { name: 'Rúbrica y nota', exact: true }).click();
        await region.getByText(`Nota guardada: ${expected.replace('.', ',')}`, { exact: true }).waitFor();
        assert.equal(await protectedHash(), before);
        const persisted = await ok(teacher, 'GET', path); assert.equal(persisted.grade.finalGrade, expected); assert.equal(persisted.grade.isPublished, false);
        assert.equal(persisted.grade.publishedAt, null); assert.equal((await runtime.db.query('SELECT count(*)::int n FROM attempt_grades WHERE attempt_id=$1', [activity.attempt])).rows[0].n, 1);
        const rejectBefore = await gradeHash(); assert.equal((await request(student, 'GET', path)).status, 403); assert.equal(await gradeHash(), rejectBefore);
        const own = await ok(student, 'GET', `/classrooms/${room.id}/attempts/${activity.attempt}/history`);
        assert.ok(!/"(?:finalGrade|overallFeedback|manualPoints|earned|correct|scoringRule)"/.test(JSON.stringify(own)));
        assert.deepEqual(await ok(student, 'GET', `/classrooms/${room.id}/attempts/${activity.attempt}/result`), { status: 'pending', attemptId: activity.attempt });
        await region.getByRole('button', { name: 'Devolución', exact: true }).click();
        await region.getByLabel('Devolución general opcional', { exact: true }).fill('Unsaved local text must not be released');
        assert.equal(await region.getByRole('button', { name: 'Publicar calificación', exact: true }).isDisabled(), true);
        let reload = teacher.waitForResponse(r => r.url().endsWith('/grading') && r.request().method() === 'GET');
        await region.getByRole('button', { name: 'Recargar corrección', exact: true }).click();
        let response = await reload;
        if (response.status() === 429) {
          assert.equal((await response.json()).error.code, 'RATE_LIMITED');
          const retry = response.headers()['retry-after']; assert.match(retry ?? '', /^\d+$/);
          const seconds = Number(retry); assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60);
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
        journey.setStage('teacher', activity.type, 'publication');
        await region.getByRole('button', { name: 'Publicar calificación', exact: true }).click();
        await region.getByRole('button', { name: 'Cancelar publicación', exact: true }).click();
        assert.equal(await sourceState(), cancelBefore);
        await region.getByRole('button', { name: 'Publicar calificación', exact: true }).click();
        let publication = teacher.waitForResponse(r => r.url().endsWith('/publish-grade') && r.request().method() === 'POST');
        await region.getByRole('button', { name: 'Confirmar publicación', exact: true }).click();
        let released = await publication;
        if (released.status() === 429) {
          assert.equal((await released.json()).error.code, 'RATE_LIMITED');
          const retry = released.headers()['retry-after']; assert.match(retry ?? '', /^\d+$/);
          const seconds = Number(retry); assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60);
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
        await navigateWithReadRecovery(student, async setPhase => {
          setPhase('/api/v1/auth/session', student.getByRole('alert').filter({ hasText: /Se alcanzó el límite de intentos/ })
            .filter({ has: student.getByRole('button', { name: 'Volver a intentar', exact: true }) }),
            student.getByRole('link', { name: new RegExp(`^Entrar al aula ${name}`) }));
          await openClassroom(student, runtime.origin, name);
          await visibleNavigation(student);
          const inbox = student.getByRole('region', { name: 'Tu bandeja de notificaciones', exact: true });
          setPhase('/api/v1/classrooms/notifications/page', inbox.getByRole('alert').filter({ hasText: /Se alcanzó el límite de intentos/ })
            .filter({ has: inbox.getByRole('button', { name: 'Actualizar notificaciones', exact: true }) }), inbox.getByRole('article').first());
          await student.locator('a[href="/notificaciones"]:visible').click();
          await student.getByRole('region', { name: 'Tu bandeja de notificaciones', exact: true }).getByRole('article').first().waitFor();
        });
        const eventRows = (await runtime.db.query("SELECT id,recipient_id,read_at FROM notifications WHERE event_type='GRADE_PUBLISHED' AND attempt_id=$1", [activity.attempt])).rows;
        assert.equal(eventRows.length, 1); const event = eventRows[0];
        assert.equal(event.recipient_id, studentUser.id); assert.equal(event.read_at, null);
        const eventHash = async () => digest(JSON.stringify((await runtime.db.query('SELECT to_jsonb(n) value FROM notifications n WHERE id=$1', [event.id])).rows));
        const beforeDeniedOpen = await eventHash();
        assert.equal((await request(teacher, 'POST', `/classrooms/notifications/${event.id}/open`, {})).status, 403);
        assert.equal(await eventHash(), beforeDeniedOpen, 'Another actor cannot read or alter the recipient notification');
        const notification = student.getByRole('region', { name: 'Tu bandeja de notificaciones', exact: true })
          .locator(`article[data-notice-id="${event.id}"]`);
        await notification.getByRole('heading', { name: 'Calificación publicada', exact: true }).waitFor();
        const openPath = `/api/v1/classrooms/notifications/${event.id}/open`, roomPath = `/api/v1/classrooms/${room.id}`;
        let notificationOpens = 0;
        const captureOpen = request => { if (request.method() === 'POST' && new URL(request.url()).pathname === openPath) notificationOpens++; };
        student.on('request', captureOpen);
        const openedNotification = watchActionResponse(student, r => new URL(r.url()).pathname === openPath && r.request().method() === 'POST', 12000);
        let resultResponse = watchActionResponse(student, r => r.request().method() === 'GET' &&
          (r.url().endsWith(`/${activity.attempt}/result`) || (new URL(r.url()).pathname.startsWith(roomPath) && r.status() === 429)), 12000);
        try {
          await notification.getByRole('button', { name: 'Ver devolución', exact: true }).click();
          const authorized = await openedNotification.value(); assert.equal(authorized.status(), 200);
          openedNotification.dispose();
          assert.equal((await authorized.json()).attemptId, activity.attempt);
          let opened = await resultResponse.value();
          if (opened.status() === 429) {
            resultResponse.dispose();
            const blockedPath = new URL(opened.url()).pathname;
            const resultPath = `${roomPath}/attempts/${activity.attempt}/result`;
            assert.ok([roomPath, resultPath, `${roomPath}/activities/${activity.id}/history`,
              `${roomPath}/attempts/${activity.attempt}/history`, `${roomPath}/activities/${activity.id}`].includes(blockedPath), `Unexpected limited destination read: ${blockedPath}`);
            assert.equal((await opened.json()).error.code, 'RATE_LIMITED');
            const rateAlert = student.getByRole('alert').filter({ hasText: /Se alcanzó el límite de intentos/ });
            const readError = blockedPath === roomPath ? rateAlert.filter({ has: student.getByRole('button', { name: 'Actualizar aula', exact: true }) })
              : blockedPath === resultPath ? student.getByRole('region', { name: 'Resultado publicado del intento', exact: true })
                .getByRole('alert').filter({ hasText: /Se alcanzó el límite de intentos.*No se pudo consultar el resultado/s })
              : blockedPath.endsWith('/history') ? student.getByRole('region', { name: 'Mi historial de intentos', exact: true })
                .getByRole('alert').filter({ hasText: /Se alcanzó el límite de intentos.*Actualiza el historial/s })
              : student.getByRole('region', { name: 'Actividades del aula', exact: true })
                .getByRole('alert').filter({ hasText: /Se alcanzó el límite de intentos.*Los cambios no confirmados/s });
            await readError.waitFor(); assert.equal(await readError.isVisible(), true, 'The limited destination read must display its corresponding UI error');
            assert.equal(await student.getByRole('region', { name: 'Resultado publicado del intento', exact: true }).locator('.p8-final-grade').isVisible(), false);
            const retry = opened.headers()['retry-after']; assert.match(retry ?? '', /^\d+$/);
            const seconds = Number(retry); assert.ok(Number.isInteger(seconds) && seconds > 0 && seconds <= 60);
            const beforeReadRecovery = notificationOpens;
            console.log(`P8 published destination ${blockedPath} honors actual Retry-After=${seconds}s once without reopening the notification`);
            await delay(seconds * 1000);
            resultResponse = watchActionResponse(student, r => r.url().endsWith(`/${activity.attempt}/result`) && r.request().method() === 'GET', 12000);
            if (blockedPath === roomPath) await student.getByRole('button', { name: 'Actualizar aula', exact: true }).click();
            else if (blockedPath === resultPath) await student.getByRole('button', { name: 'Actualizar resultado', exact: true }).click();
            else {
              await student.getByRole('button', { name: 'Volver al aula', exact: true }).click();
              await openActivityOverview(student, activity.title);
              await student.getByRole('group', { name: 'Vista de la actividad', exact: true })
                .getByRole('button', { name: /^Mis intentos/ }).click();
              await student.getByRole('button', { name: 'Consultar intento 1', exact: true }).click();
            }
            opened = await resultResponse.value();
            assert.equal(notificationOpens, beforeReadRecovery, 'Read recovery never repeats the authorized notification mutation');
          }
          assert.equal(opened.status(), 200); assert.equal((await opened.json()).attempt.id, activity.attempt);
          assert.ok((await runtime.db.query('SELECT read_at FROM notifications WHERE id=$1', [event.id])).rows[0].read_at instanceof Date);
        } finally { openedNotification.dispose(); resultResponse.dispose(); student.off('request', captureOpen); }
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
        assert.equal((await runtime.db.query('SELECT count(*)::int n FROM student_activities WHERE effective_grade_id IS NOT NULL')).rows[0].n, 3);
        assert.equal((await runtime.db.query("SELECT count(*)::int n FROM notifications WHERE event_type::text IN ('GRADE_PUBLISHED','GRADE_CORRECTED')")).rows[0].n, 3);
        assert.equal((await runtime.db.query('SELECT count(*)::int n FROM grade_corrections')).rows[0].n, 0);
        const session = await ok(student, 'GET', '/auth/session'), studentId = session.user.id;
        await ok(teacher, 'POST', `/classrooms/${room.id}/members/${studentId}/remove`, {});
        const state = digest(JSON.stringify((await runtime.db.query('SELECT to_jsonb(t) value FROM notifications t ORDER BY id')).rows));
        assert.equal((await request(student, 'GET', `/classrooms/${room.id}/attempts/${activities[0].attempt}/result`)).status, 403);
        const event = (await runtime.db.query("SELECT id FROM notifications WHERE event_type='GRADE_PUBLISHED' ORDER BY created_at LIMIT 1")).rows[0];
        assert.equal((await request(student, 'POST', `/classrooms/notifications/${event.id}/open`, {})).status, 403);
        assert.equal(digest(JSON.stringify((await runtime.db.query('SELECT to_jsonb(t) value FROM notifications t ORDER BY id')).rows)), state);
        assert.equal((await ok(teacher, 'GET', `/classrooms/${room.id}/attempts/${activities[0].attempt}/result`)).status, 'published');
        assert.deepEqual(errors, []);
      });
    } catch (error) {
      originalFailure = error;
      if (journey) console.error('Journey observer partial diagnostic', JSON.stringify(await journey.snapshot({ waitForPending: false }).catch(() => ({ unavailable: true, partial: true }))));
      throw error;
    } finally {
      const observerClosing = journey?.close().then(() => null, error => error);
      let browserFailure;
      try { await browser.close(); } catch (error) { browserFailure = error; }
      const observerFailure = await observerClosing;
      const cleanupFailures = [browserFailure, observerFailure].filter(Boolean);
      if (journey && !observerFailure) {
        try { await writeFile(join(scratch, 'safe-observer-final.json'), JSON.stringify(await journey.snapshot(), null, 2)); }
        catch (error) { cleanupFailures.push(error); }
      }
      console.log(`P8 browser/observer cleanup failures: ${cleanupFailures.length}`);
      if (cleanupFailures.length && !originalFailure) throw new AggregateError(cleanupFailures, 'Browser and recorder cleanup failed');
    }
  }, { classrooms: true });
});
