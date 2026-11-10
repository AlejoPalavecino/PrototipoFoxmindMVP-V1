import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { runInNewContext } from 'node:vm';
import { api } from './p4-integration-helpers.mjs';

function fakeApiPage(csrfStatus) {
  const calls = [];
  const headers = entries => ({ *[Symbol.iterator]() { yield* Object.entries(entries); }, get(name) { return entries[name.toLowerCase()] ?? null; } });
  const response = (status, body, extra = {}) => ({ ok: status >= 200 && status < 300, status,
    headers: headers({ 'content-type': 'application/json', ...extra }), async json() { return body; } });
  const page = { evaluate(fn, arg) {
    const fetch = async (path, options = {}) => {
      calls.push({ path, options });
      return path === '/api/v1/auth/csrf'
        ? response(csrfStatus, csrfStatus === 200 ? { csrfToken: 'fresh-fixture-token' } : { error: { code: csrfStatus === 429 ? 'RATE_LIMITED' : 'AUTH_REQUIRED' } }, { 'retry-after': '12' })
        : response(200, { mutation: 'accepted' });
    };
    return runInNewContext(`(${fn.toString()})(arg)`, { arg, fetch, Uint8Array, Object, JSON });
  } };
  return { page, calls };
}
function plain(value) { return JSON.parse(JSON.stringify(value)); }

test('P4 API legacy mode retains mutation behavior after failed CSRF', async () => {
  const f = fakeApiPage(429);
  const result = await api(f.page, 'POST', '/classrooms/fixture', { value: 1 });
  assert.equal(result.status, 200); assert.equal(f.calls.length, 2); assert.equal(f.calls[1].path, '/api/v1/classrooms/fixture');
});
for (const status of [429, 401]) test(`P4 opt-in preflight returns CSRF ${status} without mutation`, async () => {
  const f = fakeApiPage(status);
  const result = await api(f.page, 'POST', '/classrooms/fixture', { value: 1 }, {}, { stopOnCsrfFailure: true });
  assert.equal(result.status, status); assert.equal(result.body.error.code, status === 429 ? 'RATE_LIMITED' : 'AUTH_REQUIRED');
  assert.equal(f.calls.length, 1); assert.equal(f.calls[0].path, '/api/v1/auth/csrf');
});
test('P4 opt-in obtains fresh CSRF for every mutation and preserves payload and headers', async () => {
  const f = fakeApiPage(200);
  for (let i = 0; i < 2; i++) {
    const result = await api(f.page, 'POST', '/classrooms/fixture', { value: i }, { 'x-custom': 'preserved' }, { stopOnCsrfFailure: true });
    assert.equal(result.status, 200);
  }
  assert.deepEqual(f.calls.map(call => call.path), ['/api/v1/auth/csrf', '/api/v1/classrooms/fixture', '/api/v1/auth/csrf', '/api/v1/classrooms/fixture']);
  for (const [index, call] of [f.calls[1], f.calls[3]].entries()) {
    assert.equal(call.options.headers['X-CSRF-Token'] ?? call.options.headers['x-csrf-token'], 'fresh-fixture-token');
    assert.equal(call.options.headers['x-custom'], 'preserved'); assert.equal(call.options.body, JSON.stringify({ value: index }));
  }
});
function timers() {
  let next = 0; const jobs = new Map();
  return { jobs, set(fn, ms) { const id = ++next; jobs.set(id, { fn, ms }); return id; }, clear(id) { jobs.delete(id); } };
}
test('watchResponse matches only the requested response and removes listener and timer', async () => {
  const { watchResponse } = await import('./helpers/browser-action-observer.mjs');
  const page = new EventEmitter(), clock = timers(), watch = watchResponse(page, value => value === 'target', 12000, clock);
  assert.equal(page.listenerCount('response'), 1); assert.equal([...clock.jobs.values()][0].ms, 12000);
  page.emit('response', 'other'); assert.equal(page.listenerCount('response'), 1);
  page.emit('response', 'target'); assert.equal(await watch.value(), 'target');
  assert.equal(page.listenerCount('response'), 0); assert.equal(clock.jobs.size, 0); watch.dispose();
});
test('watchResponse timeout, disposal and predicate errors settle without orphaned rejections', async () => {
  const { watchResponse } = await import('./helpers/browser-action-observer.mjs');
  for (const mode of ['timeout', 'dispose', 'predicate']) {
    const page = new EventEmitter(), clock = timers();
    const watch = watchResponse(page, () => { if (mode === 'predicate') throw new Error('predicate fixture'); return false; }, 30000, clock);
    assert.equal([...clock.jobs.values()][0].ms, 30000);
    if (mode === 'timeout') [...clock.jobs.values()][0].fn();
    if (mode === 'dispose') watch.dispose();
    if (mode === 'predicate') page.emit('response', 'fixture');
    assert.equal(page.listenerCount('response'), 0); assert.equal(clock.jobs.size, 0);
    await assert.rejects(watch.value());
  }
});
function fakeRequest(path, method = 'GET') { return { url: () => `http://127.0.0.1${path}?token=CANARY_SECRET`, method: () => method }; }
function fakeResponse(request, status, body = {}) { return { request: () => request, status: () => status,
  headers: () => status === 429 ? { 'retry-after': '12' } : {}, json: async () => body }; }
test('journey observer binds stage at request, reports bounded counts and omits private values', async () => {
  const { createJourneyObserver } = await import('./helpers/browser-action-observer.mjs');
  const teacher = new EventEmitter(), student = new EventEmitter(); let now = 100000;
  const observer = createJourneyObserver({ teacher, student }, { now: () => now });
  observer.setStage('student', 'EVALUATION', 'transfer');
  const old = fakeRequest('/api/v1/classrooms/PRIVATE_ID/attempts/PRIVATE_ATTEMPT/transfer', 'POST'); student.emit('request', old);
  observer.setStage('student', 'EVALUATION', 'save'); now += 15;
  student.emit('response', fakeResponse(old, 429, { error: { code: 'RATE_LIMITED', extra: 'CANARY_SECRET' } }));
  const csrf = fakeRequest('/api/v1/auth/csrf'); teacher.emit('request', csrf); now += 20;
  teacher.emit('response', fakeResponse(csrf, 401, { error: { code: 'CANARY_SECRET' } }));
  const snapshot = await observer.snapshot();
  assert.deepEqual(plain(snapshot.counts), { total: 2, byActor: { teacher: 1, student: 1 }, last60s: { total: 2, byActor: { teacher: 1, student: 1 } } });
  assert.equal(snapshot.rows.length, 2);
  const transfer = snapshot.rows.find(row => row.operation === 'transfer');
  assert.deepEqual(plain(transfer), { actor: 'student', type: 'EVALUATION', stage: 'transfer', operation: 'transfer', method: 'POST', status: 429, code: 'RATE_LIMITED', retryAfter: 12, elapsedMs: 15 });
  const token = snapshot.rows.find(row => row.operation === 'csrf'); assert.equal(token.code, null);
  assert.doesNotMatch(JSON.stringify(snapshot), /PRIVATE_ID|PRIVATE_ATTEMPT|CANARY_SECRET|127\.0\.0\.1|\?token/);
  now = 160000;
  assert.deepEqual(plain((await observer.snapshot()).counts.last60s), { total: 1, byActor: { teacher: 1, student: 0 } }, 'window uses request time > now - 60000');
  now += 60001; assert.deepEqual(plain((await observer.snapshot()).counts.last60s), { total: 0, byActor: { teacher: 0, student: 0 } });
  const pending = fakeRequest('/api/v1/auth/session'); student.emit('request', pending);
  const afterPending = await observer.snapshot();
  assert.equal(afterPending.counts.total, 3); assert.equal(afterPending.counts.byActor.student, 2);
  assert.deepEqual(plain(afterPending.counts.last60s), { total: 1, byActor: { teacher: 0, student: 1 } });
  await observer.close();
  for (const page of [teacher, student]) { assert.equal(page.listenerCount('request'), 0); assert.equal(page.listenerCount('response'), 0); }
});
test('journey observer classifies only public operation names and close drains response projection', async () => {
  const { createJourneyObserver } = await import('./helpers/browser-action-observer.mjs');
  const teacher = new EventEmitter(), student = new EventEmitter(), observer = createJourneyObserver({ teacher, student }, { now: () => 5000 });
  observer.setStage('teacher', 'ASSIGNMENT', 'fixture');
  const operations = [
    ['/api/v1/auth/csrf', 'GET', 'csrf'], ['/api/v1/classrooms/ID/activities/ID/session', 'GET', 'session'],
    ['/api/v1/classrooms/ID/attempts/ID/transfer', 'POST', 'transfer'], ['/api/v1/classrooms/ID/attempts/ID/answer', 'POST', 'answer'],
    ['/api/v1/classrooms/ID/attempts/ID/submit-answers', 'POST', 'submit-answers'], ['/api/v1/classrooms/ID/attempts/ID/submit-practical', 'POST', 'submit-practical'],
    ['/api/v1/files', 'POST', 'allocate'], ['/api/v1/files/ID/content', 'PUT', 'content'],
    ['/api/v1/classrooms/ID', 'GET', 'classroom'], ['/api/v1/classrooms/ID/activities', 'GET', 'activities'],
    ['/api/v1/auth/login', 'POST', 'identity'], ['/api/v1/unknown/PRIVATE_ID', 'GET', 'other-api'],
  ];
  let release;
  for (const [path, method] of operations) {
    const request = fakeRequest(path, method); teacher.emit('request', request);
    const response = fakeResponse(request, path.endsWith('/content') ? 429 : 200);
    if (path.endsWith('/content')) response.json = () => new Promise(resolve => { release = () => resolve({ token: 'CANARY_SECRET' }); });
    teacher.emit('response', response);
  }
  const closing = observer.close(); await Promise.resolve(); assert.equal(typeof release, 'function'); release(); await closing;
  const snapshot = await observer.snapshot();
  assert.deepEqual(snapshot.rows.map(row => row.operation).sort(), operations.map(([, , operation]) => operation).sort());
  assert.doesNotMatch(JSON.stringify(snapshot), /PRIVATE_ID|CANARY_SECRET|\?token/);
  assert.equal(teacher.listenerCount('request'), 0); assert.equal(teacher.listenerCount('response'), 0);
});

const admissionPath = '/api/v1/classrooms/test/attempts/test/submit-practical';
function admissionResponse(phase, status = 200, retry = '3', code = 'RATE_LIMITED') {
  const url = phase === 'csrf' ? '/api/v1/auth/csrf' : admissionPath;
  return { status: () => status, url: () => `http://localhost${url}`, request: () => ({ method: () => phase === 'csrf' ? 'GET' : 'POST' }), headers: () => ({ 'retry-after': retry }), json: async () => ({ error: { code } }) };
}
function admissionFixture(responses, overrides = {}) {
  let actions = 0, disposed = 0, observed = 0;
  const waits = [], limited = [];
  const options = { mutationPath: admissionPath,
    observe() { const response = responses[observed++]; return { value: async () => { if (response instanceof Error) throw response; return response; }, dispose() { disposed++; } }; },
    async action() { actions++; if (overrides.actionError) throw overrides.actionError; },
    async wait(ms) { waits.push(ms); }, async onLimited(response, phase) { limited.push(phase); }, ...overrides };
  return { options, state: () => ({ actions, disposed, observed, waits, limited }) };
}

test('admission accepts only successful mutation and disposes its observer', async () => {
  const { runAdmittedAction } = await import('./helpers/browser-admission-step.mjs');
  const response = admissionResponse('mutation'), f = admissionFixture([response]);
  assert.equal(await runAdmittedAction(f.options), response);
  assert.deepEqual(f.state(), { actions: 1, disposed: 1, observed: 1, waits: [], limited: [] });
});
for (const phases of [['csrf', 'mutation'], ['mutation', 'csrf']]) test(`admission retries independently in order ${phases.join(' then ')}`, async () => {
  const { runAdmittedAction } = await import('./helpers/browser-admission-step.mjs');
  const success = admissionResponse('mutation'), f = admissionFixture([admissionResponse(phases[0], 429, '37'), admissionResponse(phases[1], 429, '3'), success]);
  assert.equal(await runAdmittedAction(f.options), success);
  assert.deepEqual(f.state(), { actions: 3, disposed: 3, observed: 3, waits: [37000, 3000], limited: phases });
});
for (const phase of ['csrf', 'mutation']) test(`admission rejects repeated ${phase} limit before another wait`, async () => {
  const { runAdmittedAction } = await import('./helpers/browser-admission-step.mjs');
  const f = admissionFixture([admissionResponse(phase, 429, '3'), admissionResponse(phase, 429, '3')]);
  await assert.rejects(runAdmittedAction(f.options));
  assert.deepEqual(f.state(), { actions: 2, disposed: 2, observed: 2, waits: [3000], limited: [phase] });
});
for (const [name, response] of [
  ['wrong code', admissionResponse('csrf', 429, '3', 'AUTH_REQUIRED')],
  ['nondecimal header', admissionResponse('csrf', 429, '3.0')],
  ['zero header', admissionResponse('csrf', 429, '0')],
  ['large header', admissionResponse('mutation', 429, '61')],
  ...[401, 403, 409, 503].map(status => [`status ${status}`, admissionResponse('mutation', status)]),
  ['csrf 200 is intermediate', admissionResponse('csrf', 200)],
  ['wrong path', { ...admissionResponse('mutation'), url: () => 'http://localhost/api/v1/other' }],
  ['wrong method', { ...admissionResponse('mutation'), request: () => ({ method: () => 'GET' }) }],
]) test(`admission rejects ${name}`, async () => {
  const { runAdmittedAction } = await import('./helpers/browser-admission-step.mjs');
  const f = admissionFixture([response]); await assert.rejects(runAdmittedAction(f.options));
  assert.deepEqual(f.state(), { actions: 1, disposed: 1, observed: 1, waits: [], limited: [] });
});
for (const phase of ['action', 'value']) test(`admission cleans up after ${phase} failure`, async () => {
  const { runAdmittedAction } = await import('./helpers/browser-admission-step.mjs');
  const error = new Error('fixture failure'), f = admissionFixture([phase === 'value' ? error : admissionResponse('mutation')], phase === 'action' ? { actionError: error } : {});
  await assert.rejects(runAdmittedAction(f.options), error);
  assert.equal(f.state().disposed, 1); assert.equal(f.state().actions, 1); assert.deepEqual(f.state().waits, []);
});


function deferredObserverProjection() {
  const teacher = new EventEmitter(), student = new EventEmitter();
  let release;
  const body = new Promise(resolve => { release = () => resolve({ error: { code: 'RATE_LIMITED', private: 'CANARY_SECRET' } }); });
  const request = fakeRequest('/api/v1/auth/csrf');
  const response = { ...fakeResponse(request, 429), json: () => body };
  return { teacher, student, release, emit() { teacher.emit('request', request); teacher.emit('response', response); } };
}
const observerEventLoopTurn = () => new Promise(resolve => setImmediate(resolve));

test('journey nonblocking snapshot reports pending response projection without waiting or losing its later row', async () => {
  const { createJourneyObserver } = await import('./helpers/browser-action-observer.mjs');
  const fixture = deferredObserverProjection();
  const observer = createJourneyObserver(fixture, { now: () => 5000 });
  fixture.emit();
  let settled = false;
  const pending = observer.snapshot({ waitForPending: false }).then(value => { settled = true; return value; });
  try {
    await observerEventLoopTurn();
    assert.equal(settled, true, 'Failure diagnostics must return within one event-loop turn while response JSON is unresolved');
    const snapshot = await pending;
    assert.deepEqual(plain(snapshot), { rows: [], counts: { total: 1, byActor: { teacher: 1, student: 0 },
      last60s: { total: 1, byActor: { teacher: 1, student: 0 } } }, pendingResponses: 1, partial: true });
    fixture.release(); await observer.drain();
    const completed = await observer.snapshot({ waitForPending: false });
    assert.equal(completed.pendingResponses, 0); assert.equal(completed.partial, false);
    assert.equal(completed.rows.length, 1); assert.equal(completed.rows[0].code, 'RATE_LIMITED');
    assert.deepEqual(plain(completed.counts), plain(snapshot.counts), 'Finishing projection must not count the request twice');
    assert.doesNotMatch(JSON.stringify(completed), /CANARY_SECRET|127\.0\.0\.1|\?token/);
  } finally { fixture.release(); await pending; await observer.close(); }
});

test('journey default snapshot still waits for pending JSON and preserves the exact original result shape', async () => {
  const { createJourneyObserver } = await import('./helpers/browser-action-observer.mjs');
  const fixture = deferredObserverProjection();
  const observer = createJourneyObserver(fixture, { now: () => 5000 });
  fixture.emit();
  let settled = false;
  const pending = observer.snapshot().then(value => { settled = true; return value; });
  try {
    await observerEventLoopTurn();
    assert.equal(settled, false, 'Default snapshots must retain their response-draining contract');
    fixture.release();
    const snapshot = await pending;
    assert.deepEqual(Object.keys(snapshot).sort(), ['counts', 'rows']);
    assert.equal(snapshot.rows.length, 1); assert.equal(snapshot.rows[0].code, 'RATE_LIMITED');
    assert.equal(snapshot.counts.total, 1);
    assert.doesNotMatch(JSON.stringify(snapshot), /CANARY_SECRET|127\.0\.0\.1|\?token/);
  } finally { fixture.release(); await pending; await observer.close(); }
});

test('journey shutdown detaches observers before fake browser closure settles a deferred error body', async () => {
  const { createJourneyObserver } = await import('./helpers/browser-action-observer.mjs');
  const fixture = deferredObserverProjection();
  const observer = createJourneyObserver(fixture, { now: () => 5000 });
  fixture.emit();
  let settled = false, browserClosed = false;
  const closing = observer.close().then(() => { settled = true; });
  const browser = { async close() { browserClosed = true; fixture.release(); } };
  try {
    for (const page of [fixture.teacher, fixture.student]) {
      assert.equal(page.listenerCount('request'), 0); assert.equal(page.listenerCount('response'), 0);
    }
    await observerEventLoopTurn();
    assert.equal(settled, false, 'Do not await the pending observer drain before closing its browser');
    await browser.close(); await closing;
    assert.equal(browserClosed, true); assert.equal(settled, true);
    const snapshot = await observer.snapshot();
    assert.equal(snapshot.rows.length, 1); assert.equal(snapshot.rows[0].code, 'RATE_LIMITED');
    assert.doesNotMatch(JSON.stringify(snapshot), /CANARY_SECRET|127\.0\.0\.1|\?token/);
  } finally { fixture.release(); await closing; }
});
