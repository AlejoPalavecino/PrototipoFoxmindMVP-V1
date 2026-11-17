import assert from 'node:assert/strict';
import { startBrowserAttempt as admittedStart } from './helpers/browser-admission-step.mjs';
import { watchResponse } from './helpers/browser-action-observer.mjs';
import { selectClassroomSection } from './p9-journey-helpers-current.mjs';
export { selectClassroomSection } from './p9-journey-helpers-current.mjs';

const ERROR_CODES = new Set(['RATE_LIMITED', 'AUTH_REQUIRED', 'CSRF_INVALID', 'CONFLICT', 'FORBIDDEN', 'SERVICE_UNAVAILABLE', 'INVALID_INPUT']);
const pathOf = response => new URL(response.url()).pathname;
const csrfFailure = response => pathOf(response) === '/api/v1/auth/csrf'
  && response.request().method() === 'GET' && response.status() !== 200;

/** Retain only public routing/admission diagnostics; never record headers, bodies or query strings. */
export function recordSafeUiResponses(page) {
  const rows = [], pending = new Set();
  const capture = response => {
    const path = pathOf(response);
    if (!/^\/api\/v1\/(?:auth\/csrf|files(?:\/[^/]+(?:\/content)?)?|classrooms(?:\/[^?]*)?)$/.test(path)) return;
    const row = { method: response.request().method(), path, status: response.status(), retryAfter: response.headers()['retry-after'] ?? null, code: null };
    rows.push(row);
    if (row.status >= 400) {
      const task = response.json().then(body => { if (ERROR_CODES.has(body?.error?.code)) row.code = body.error.code; }).catch(() => {});
      pending.add(task); void task.finally(() => pending.delete(task));
    }
  };
  page.on('response', capture);
  return { async close() { page.off('response', capture); await Promise.all([...pending]); return rows; } };
}

/** Observe only requests initiated in this action phase, and release both observers together. */
export function watchActionResponse(page, predicate, timeoutMs = 12000) {
  const eligible = new WeakSet();
  const capture = request => eligible.add(request);
  page.on('request', capture);
  const watcher = watchResponse(page, response => eligible.has(response.request()) && predicate(response), timeoutMs);
  return { value: () => watcher.value(), dispose() { page.off('request', capture); watcher.dispose(); } };
}

/** Cancel unused expectations when an earlier phase fails, including CSRF before a mutation exists. */
export async function observedUiAction(page, action, predicate, timeoutMs = 12000) {
  const watcher = watchActionResponse(page, predicate, timeoutMs);
  const pending = watcher.value().then(response => ({ response }), error => ({ error }));
  try {
    await action();
    const result = await pending;
    if (result.error) throw result.error;
    return result.response;
  } finally { watcher.dispose(); await pending; }
}

export async function observeAttachmentUpload(page, action) {
  let fileMutations = 0;
  const capture = request => {
    const path = new URL(request.url()).pathname, method = request.method();
    if ((path === '/api/v1/files' && method === 'POST')
      || (/^\/api\/v1\/files\/[^/]+\/content$/.test(path) && method === 'PUT')) fileMutations++;
  };
  const observe = () => observedUiAction(page, action, response => csrfFailure(response)
    || (pathOf(response) === '/api/v1/files' && response.request().method() === 'POST' && response.status() !== 201)
    || (/^\/api\/v1\/files\/[^/]+\/content$/.test(pathOf(response)) && response.request().method() === 'PUT'));
  page.on('request', capture);
  try {
    let response = await observe();
    if (csrfFailure(response) && response.status() === 429 && fileMutations === 0) {
      const seconds = await rateLimitSeconds(response);
      await page.waitForTimeout(seconds * 1000);
      assert.equal(fileMutations, 0, 'CSRF admission recovery must precede every file allocation and content mutation');
      // PracticalAttempt retains the same selected File after this failure. Repeat its visible action once.
      response = await observe();
    }
    assert.match(pathOf(response), /^\/api\/v1\/files\/[^/]+\/content$/);
    assert.equal(response.request().method(), 'PUT');
    assert.equal(response.status(), 200);
    return response;
  } finally { page.off('request', capture); }
}

export async function rateLimitSeconds(response) {
  assert.equal(response.status(), 429);
  assert.equal((await response.json()).error?.code, 'RATE_LIMITED');
  const raw = response.headers()['retry-after'];
  assert.match(raw ?? '', /^\d+$/);
  const seconds = Number(raw);
  assert.ok(Number.isSafeInteger(seconds) && seconds >= 1 && seconds <= 60);
  return seconds;
}

export async function observeGradePublication(page, basePath, action) {
  const audit = watchResponse(page, response => pathOf(response) === `${basePath}/grade-corrections`
    && response.request().method() === 'GET', 12000);
  const pending = audit.value().then(response => ({ response }), error => ({ error }));
  try {
    const published = await observedUiAction(page, action, response => csrfFailure(response)
      || (pathOf(response) === `${basePath}/publish-grade` && response.request().method() === 'POST'));
    assert.equal(pathOf(published), `${basePath}/publish-grade`); assert.equal(published.status(), 200);
    const result = await pending;
    if (result.error) throw result.error;
    assert.equal(result.response.status(), 200);
    return { published, audit: result.response };
  } finally { audit.dispose(); await pending; }
}

/** Recover only observed post-save read admission. Never repeat the confirmed save. */
export async function saveGradingWithReadRecovery(page, { roomId, roomName, activityTitle, attemptId }, action) {
  const root = `/api/v1/classrooms/${roomId}`, gradePath = `${root}/attempts/${attemptId}/grading`;
  let savedConfirmed = false;
  const saves = new WeakSet(), eligibleReads = new WeakSet();
  const captureRequest = request => {
    const path = new URL(request.url()).pathname;
    if (path === gradePath && request.method() === 'POST') saves.add(request);
    if (savedConfirmed && request.method() === 'GET' && (path === root || path === `${root}/activities`)) eligibleReads.add(request);
  };
  const confirmSave = response => {
    if (saves.has(response.request()) && pathOf(response) === gradePath && response.status() === 200) savedConfirmed = true;
  };
  page.on('request', captureRequest); page.on('response', confirmSave);
  const reads = [root, `${root}/activities`].map(path => {
    const watcher = watchResponse(page, response => eligibleReads.has(response.request()) && pathOf(response) === path
      && response.request().method() === 'GET', 12000);
    return { path, watcher, pending: watcher.value().then(response => ({ response }), error => ({ error })) };
  });
  try {
    const saved = await observedUiAction(page, action, response => csrfFailure(response)
      || (pathOf(response) === gradePath && response.request().method() === 'POST'));
    assert.equal(pathOf(saved), gradePath); assert.equal(saved.status(), 200);
    const snapshot = await saved.json();
    const results = await Promise.all(reads.map(read => read.pending));
    const limited = [];
    for (const result of results) {
      if (result.error) throw result.error;
      if (result.response.status() === 429) limited.push({ response: result.response, seconds: await rateLimitSeconds(result.response) });
      else assert.equal(result.response.status(), 200);
    }
    if (!limited.length) return { response: saved, recovered: false };
    let writes = 0;
    const capture = request => { if (request.method() !== 'GET' && new URL(request.url()).pathname.startsWith(root)) writes++; };
    page.on('request', capture);
    try {
      const seconds = Math.max(...limited.map(item => item.seconds));
      console.log(`P8 post-save read admission honors observed Retry-After=${seconds}s once; saved mutation is not repeated`);
      await new Promise(resolve => setTimeout(resolve, seconds * 1000));
      if (limited.some(item => pathOf(item.response) === root)) {
        const recovered = await observedUiAction(page, () => page.getByRole('button', { name: 'Actualizar aula', exact: true }).click(),
          response => pathOf(response) === root && response.request().method() === 'GET');
        assert.equal(recovered.status(), 200);
      }
      // The current activities section has no refresh control; leave and reopen the same real classroom.
      await page.getByRole('button', { name: 'Mis aulas', exact: true }).click();
      await page.getByRole('button', { name: `Entrar al aula ${roomName}`, exact: true }).click();
      const activities = await observedUiAction(page, () => selectClassroomSection(page, 'activities', 'Actividades'),
        response => pathOf(response) === `${root}/activities` && response.request().method() === 'GET');
      assert.equal(activities.status(), 200);
      await openTeacherActivity(page, activityTitle);
      const restored = await observedUiAction(page, () => page.getByRole('button', { name: 'Corregir intento 1', exact: true }).click(),
        response => pathOf(response) === gradePath && response.request().method() === 'GET');
      assert.equal(restored.status(), 200);
      const current = await restored.json();
      assert.equal(current.grade.id, snapshot.grade.id); assert.equal(current.revision, snapshot.revision);
      assert.equal(current.grade.finalGrade, snapshot.grade.finalGrade);
      assert.equal(writes, 0, 'Recovering post-save reads must not issue another classroom mutation');
      return { response: saved, recovered: true };
    } finally { page.off('request', capture); }
  } finally {
    page.off('request', captureRequest); page.off('response', confirmSave);
    for (const read of reads) read.watcher.dispose();
    await Promise.all(reads.map(read => read.pending));
  }
}

const startIntents = new WeakMap();
function startIntent(page) {
  let intent = startIntents.get(page);
  if (intent) return intent;
  intent = { before: [], after: [], gesture: false };
  const capture = request => {
    if (request.method() === 'POST' && /\/activities\/[^/]+\/start$/.test(new URL(request.url()).pathname))
      (intent.gesture ? intent.after : intent.before).push(request);
  };
  const dispose = () => {
    page.off('request', capture); page.off('close', dispose); startIntents.delete(page);
  };
  intent.dispose = dispose;
  page.on('request', capture); page.once('close', dispose);
  startIntents.set(page, intent);
  return intent;
}

/** Opening the current activity overview must not start an attempt. */
export async function openActivityOverview(page, title) {
  const intent = startIntent(page);
  try {
    await page.getByRole('article', { name: title, exact: true })
      .getByRole('button', { name: `Abrir ${title}`, exact: true }).click();
    await page.getByRole('region', { name: 'Consulta de actividad', exact: true }).waitFor();
    assert.equal(intent.before.length, 0, 'Consulting the overview must not start an attempt');
    // Keep observing across the caller's gap until the explicit response gesture or page close.
  } catch (error) { intent.dispose(); throw error; }
}

/** The current explicit response action starts directly; admission remains real and bounded. */
export async function startBrowserAttempt(page, roomId, activityId, timeoutMs, buttonName = 'Empezar actividad') {
  const intent = startIntent(page);
  let confirmed = 0;
  const startPath = `/api/v1/classrooms/${roomId}/activities/${activityId}/start`;
  const capture = response => {
    if (response.request().method() === 'POST' && response.status() === 200
      && new URL(response.url()).pathname === startPath && intent.after.includes(response.request())) confirmed++;
  };
  page.on('response', capture);
  try {
    assert.equal(intent.before.length, 0, 'No start request is allowed before the explicit response gesture');
    const guardedPage = new Proxy(page, { get(target, key) {
      if (key === 'getByRole') return (...args) => {
        const locator = target.getByRole(...args);
        return new Proxy(locator, { get(value, property) {
          if (property === 'click') return (...clickArgs) => {
            assert.equal(intent.before.length, 0, 'No start request is allowed before the explicit response gesture');
            intent.gesture = true;
            return value.click(...clickArgs);
          };
          const member = Reflect.get(value, property);
          return typeof member === 'function' ? member.bind(value) : member;
        } });
      };
      const member = Reflect.get(target, key);
      return typeof member === 'function' ? member.bind(target) : member;
    } });
    const response = await admittedStart(guardedPage, roomId, activityId, timeoutMs, buttonName);
    assert.equal(intent.before.length, 0);
    assert.equal(confirmed, 1, 'One explicit response gesture must confirm one start');
    return response;
  } finally { page.off('response', capture); intent.dispose(); }
}

/** Keep the historical readiness observer around the actual overview and explicit preparation gesture. */
export async function openPracticalActivity(page, roomId, activityId, title) {
  await openActivityOverview(page, title);
  return startBrowserAttempt(page, roomId, activityId, 12000, 'Preparar entrega');
}

export async function openTeacherActivity(page, title) {
  await page.getByRole('article', { name: title, exact: true })
    .getByRole('button', { name: `Abrir ${title}`, exact: true }).click();
  await page.getByRole('region', { name: 'Vista previa docente', exact: true }).waitFor();
}
