import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { startBrowserAttempt, saveGradingWithReadRecovery } from './p8-current-ui-helpers.mjs';

const root = '/api/v1/classrooms/synthetic-room';
const startPath = `${root}/activities/synthetic-activity/start`;
const gradePath = `${root}/attempts/synthetic-attempt/grading`;
const context = { roomId: 'synthetic-room', roomName: 'Synthetic classroom',
  activityTitle: 'Synthetic activity', attemptId: 'synthetic-attempt' };
const grade = { grade: { id: 'synthetic-grade', finalGrade: '6.00' }, revision: '3' };

function request(path, method) {
  return { url: () => `http://synthetic.test${path}`, method: () => method };
}
function response(actualRequest, status, body = {}) {
  return { request: () => actualRequest, url: actualRequest.url, status: () => status,
    json: async () => body, headers: () => ({}) };
}
function exchange(page, path, method, status, body) {
  const actualRequest = request(path, method);
  page.emit('request', actualRequest);
  const actualResponse = response(actualRequest, status, body);
  page.emit('response', actualResponse);
  return actualResponse;
}
function clean(page) {
  assert.equal(page.listenerCount('request'), 0, 'Request observers must be removed');
  assert.equal(page.listenerCount('response'), 0, 'Response observers must be removed');
}
function startFixture(automaticBeforeGesture = false) {
  const page = new EventEmitter(), writes = [];
  let gestures = 0, automatic = false;
  const emitStart = status => {
    writes.push(status);
    return exchange(page, startPath, 'POST', status,
      status === 429 ? { error: { code: 'RATE_LIMITED' } } : {});
  };
  page.getByRole = (role, options) => {
    assert.equal(role, 'button');
    assert.equal(options.name, 'Empezar actividad');
    if (automaticBeforeGesture && !automatic) {
      automatic = true;
      emitStart(429);
    }
    return { async click() { gestures++; emitStart(200); } };
  };
  return { page, writes, gestures: () => gestures };
}

test('explicit response gesture observes exactly one successful start and cleans observers', async () => {
  const fixture = startFixture();
  try {
    const actual = await startBrowserAttempt(fixture.page, context.roomId, 'synthetic-activity', 1000);
    assert.equal(actual.status(), 200);
    assert.equal(fixture.gestures(), 1);
    assert.deepEqual(fixture.writes, [200]);
  } finally { clean(fixture.page); }
});

test('a start request before the explicit gesture is rejected even when its response is 429', async () => {
  const fixture = startFixture(true);
  try {
    await assert.rejects(startBrowserAttempt(fixture.page, context.roomId, 'synthetic-activity', 1000));
    assert.equal(fixture.writes[0], 429);
    assert.ok(fixture.gestures() <= 1, 'A rejected observation must not cause extra response gestures');
  } finally { clean(fixture.page); }
});

function gradingFixture() {
  const page = new EventEmitter(), writes = [];
  const capture = actualRequest => { if (actualRequest.method() !== 'GET') writes.push(actualRequest); };
  const save = () => exchange(page, gradePath, 'POST', 200, grade);
  return { page, writes, save, capture };
}
async function runGrading(fixture, action) {
  fixture.page.on('request', fixture.capture);
  try { return await saveGradingWithReadRecovery(fixture.page, context, action); }
  finally { fixture.page.off('request', fixture.capture); clean(fixture.page); }
}
function oneSave(fixture) {
  assert.equal(fixture.writes.length, 1, 'Read observation must not repeat the saved mutation');
  assert.equal(new URL(fixture.writes[0].url()).pathname, gradePath);
}

test('successful reads initiated after the confirmed save preserve the real response without another write', async () => {
  const fixture = gradingFixture();
  const result = await runGrading(fixture, async () => {
    fixture.save();
    exchange(fixture.page, root, 'GET', 200);
    exchange(fixture.page, `${root}/activities`, 'GET', 200);
  });
  assert.equal(result.response.status(), 200);
  assert.deepEqual(await result.response.json(), grade);
  assert.equal(result.recovered, false);
  oneSave(fixture);
});

test('earlier GET successes cannot hide failed reads initiated after a confirmed save', async () => {
  const fixture = gradingFixture();
  await assert.rejects(runGrading(fixture, async () => {
    exchange(fixture.page, root, 'GET', 200);
    exchange(fixture.page, `${root}/activities`, 'GET', 200);
    fixture.save();
    exchange(fixture.page, root, 'GET', 500, { error: { code: 'SERVICE_UNAVAILABLE' } });
    exchange(fixture.page, `${root}/activities`, 'GET', 500, { error: { code: 'SERVICE_UNAVAILABLE' } });
  }));
  oneSave(fixture);
});

test('GETs initiated before the save remain ineligible even when their successful responses arrive afterward', async () => {
  const fixture = gradingFixture();
  await assert.rejects(runGrading(fixture, async () => {
    const earlier = [request(root, 'GET'), request(`${root}/activities`, 'GET')];
    for (const actualRequest of earlier) fixture.page.emit('request', actualRequest);
    fixture.save();
    for (const actualRequest of earlier) fixture.page.emit('response', response(actualRequest, 200));
    exchange(fixture.page, root, 'GET', 500, { error: { code: 'SERVICE_UNAVAILABLE' } });
    exchange(fixture.page, `${root}/activities`, 'GET', 500, { error: { code: 'SERVICE_UNAVAILABLE' } });
  }));
  oneSave(fixture);
});

import { observeAttachmentUpload } from './p8-current-ui-helpers.mjs';

function uploadFixture(onGesture) {
  const page = new EventEmitter(), waits = [], requests = [];
  const selected = Buffer.from('synthetic retained upload bytes'), original = Buffer.from(selected);
  let calls = 0;
  page.waitForTimeout = async milliseconds => { waits.push(milliseconds); };
  const capture = actualRequest => { requests.push(actualRequest); };
  const emit = (path, method, status, body = {}, headers = {}) => {
    const actualRequest = request(path, method);
    page.emit('request', actualRequest);
    const actualResponse = { ...response(actualRequest, status, body), headers: () => headers };
    page.emit('response', actualResponse);
    return actualResponse;
  };
  const action = async () => {
    calls++;
    assert.deepEqual(selected, original, 'The repeated gesture retains the selected payload');
    await onGesture({ call: calls, emit, selected });
  };
  const run = async () => {
    page.on('request', capture);
    try { return await observeAttachmentUpload(page, action); }
    finally { page.off('request', capture); clean(page); }
  };
  const mutations = method => requests.filter(actualRequest => actualRequest.method() === method
    && /^\/api\/v1\/files(?:\/[^/]+\/content)?$/.test(new URL(actualRequest.url()).pathname));
  return { run, waits, mutations, calls: () => calls };
}
const csrfPath = '/api/v1/auth/csrf';
const uploadContentPath = '/api/v1/files/synthetic-file/content';
const csrfLimited = (emit, seconds = '43', code = 'RATE_LIMITED') =>
  emit(csrfPath, 'GET', 429, { error: { code } }, { 'retry-after': seconds });

test('upload retries the same UI gesture once after initial CSRF admission without any file mutation', async () => {
  let firstPayload;
  const fixture = uploadFixture(({ call, emit, selected }) => {
    if (call === 1) { firstPayload = selected; csrfLimited(emit); return; }
    assert.equal(call, 2, 'Only one repeated upload gesture is allowed');
    assert.equal(selected, firstPayload, 'The repeated gesture uses the same selected payload');
    emit(csrfPath, 'GET', 200);
    emit('/api/v1/files', 'POST', 201);
    emit(uploadContentPath, 'PUT', 200);
  });
  const actual = await fixture.run();
  assert.equal(actual.status(), 200);
  assert.equal(new URL(actual.url()).pathname, uploadContentPath);
  assert.equal(fixture.calls(), 2);
  assert.deepEqual(fixture.waits, [43_000], 'Honor the observed admission interval exactly');
  assert.equal(fixture.mutations('POST').length, 1, 'Allocate quota only once after admission');
  assert.equal(fixture.mutations('PUT').length, 1, 'Upload content only once after admission');
});

test('upload does not retry a later CSRF failure after allocation has already mutated files', async () => {
  const fixture = uploadFixture(({ emit }) => {
    emit('/api/v1/files', 'POST', 201);
    csrfLimited(emit);
  });
  await assert.rejects(fixture.run());
  assert.equal(fixture.calls(), 1);
  assert.deepEqual(fixture.waits, []);
  assert.equal(fixture.mutations('POST').length, 1);
  assert.equal(fixture.mutations('PUT').length, 0);
});

for (const [label, emitFailure] of [
  ['wrong CSRF error code', emit => csrfLimited(emit, '43', 'SERVICE_UNAVAILABLE')],
  ['missing Retry-After', emit => emit(csrfPath, 'GET', 429, { error: { code: 'RATE_LIMITED' } })],
  ['zero Retry-After', emit => csrfLimited(emit, '0')],
  ['Retry-After above sixty seconds', emit => csrfLimited(emit, '61')],
  ['fractional Retry-After', emit => csrfLimited(emit, '1.5')],
  ['non-CSRF allocation admission', emit => emit('/api/v1/files', 'POST', 429,
    { error: { code: 'RATE_LIMITED' } }, { 'retry-after': '43' })],
  ['non-CSRF content admission', emit => emit(uploadContentPath, 'PUT', 429,
    { error: { code: 'RATE_LIMITED' } }, { 'retry-after': '43' })],
]) test(`upload does not retry ${label}`, async () => {
  const fixture = uploadFixture(({ emit }) => { emitFailure(emit); });
  await assert.rejects(fixture.run());
  assert.equal(fixture.calls(), 1);
  assert.deepEqual(fixture.waits, []);
});

test('a second CSRF admission failure never causes a third upload gesture or another delay', async () => {
  const fixture = uploadFixture(({ call, emit }) => { csrfLimited(emit, call === 1 ? '43' : '45'); });
  await assert.rejects(fixture.run());
  assert.ok(fixture.calls() >= 1 && fixture.calls() <= 2, 'Never issue a third gesture');
  assert.equal(fixture.waits.length, fixture.calls() - 1, 'At most one wait precedes one retry');
  assert.ok(fixture.waits.every(milliseconds => milliseconds === 43_000), 'Do not wait again after the second rejection');
  assert.equal(fixture.mutations('POST').length, 0);
  assert.equal(fixture.mutations('PUT').length, 0);
});

test('a non-GET CSRF 429 cannot authorize another upload gesture', async () => {
  const fixture = uploadFixture(({ call, emit }) => {
    if (call === 1) {
      emit(csrfPath, 'POST', 429, { error: { code: 'RATE_LIMITED' } }, { 'retry-after': '43' });
      emit(csrfPath, 'GET', 503, { error: { code: 'SERVICE_UNAVAILABLE' } });
      return;
    }
    emit('/api/v1/files', 'POST', 201);
    emit(uploadContentPath, 'PUT', 200);
  });
  await assert.rejects(fixture.run());
  assert.equal(fixture.calls(), 1);
  assert.deepEqual(fixture.waits, []);
  assert.equal(fixture.mutations('POST').length, 0);
  assert.equal(fixture.mutations('PUT').length, 0);
});

test('a CSRF request initiated before the upload phase cannot authorize a retry when its response arrives later', async () => {
  const page = new EventEmitter(), waits = [], mutations = [];
  let calls = 0;
  page.waitForTimeout = async milliseconds => { waits.push(milliseconds); };
  const earlier = request(csrfPath, 'GET');
  page.emit('request', earlier);
  const capture = actualRequest => {
    if (new URL(actualRequest.url()).pathname.startsWith('/api/v1/files')
      && ['POST', 'PUT'].includes(actualRequest.method())) mutations.push(actualRequest);
  };
  const emit = (path, method, status, body = {}) => {
    const actualRequest = request(path, method);
    page.emit('request', actualRequest);
    page.emit('response', response(actualRequest, status, body));
  };
  page.on('request', capture);
  try {
    await assert.rejects(observeAttachmentUpload(page, async () => {
      calls++;
      if (calls === 1) {
        page.emit('response', { ...response(earlier, 429, { error: { code: 'RATE_LIMITED' } }),
          headers: () => ({ 'retry-after': '43' }) });
        emit(csrfPath, 'GET', 503, { error: { code: 'SERVICE_UNAVAILABLE' } });
        return;
      }
      emit('/api/v1/files', 'POST', 201);
      emit(uploadContentPath, 'PUT', 200);
    }));
    assert.equal(calls, 1);
    assert.deepEqual(waits, []);
    assert.deepEqual(mutations, []);
  } finally { page.off('request', capture); clean(page); }
});

for (const path of ['/api/v1/unrelated-background', '/api/v1/auth/session']) {
  test(`questionnaire navigation rejects ${path} 429 without its visible read error`, async () => {
    const { readFile } = await import('node:fs/promises');
    const source = await readFile(new URL('./p7-questionnaire-integration.test.mjs', import.meta.url), 'utf8');
    const start = source.indexOf('const open = async (page, title');
    const end = source.indexOf('const focusAndSaveQuestion', start);
    assert.ok(start > 0 && end > start);
    const page = new EventEmitter(), waits = []; let visits = 0;
    const locator = new Proxy({}, { get: (_target, key) => key === 'isVisible' ? async () => false
      : ['getByRole', 'locator', 'filter', 'first'].includes(key) ? () => locator : async () => {} });
    page.getByRole = page.locator = () => locator;
    const failure = Object.assign(new Error('Unrelated navigation selector failure'), { name: 'TimeoutError' });
    const openClassroom = async () => {
      if (++visits !== 1) return;
      const req = request(path, 'GET'); page.emit('request', req);
      page.emit('response', { ...response(req, 429, { error: { code: 'RATE_LIMITED' } }), headers: () => ({ 'retry-after': '1' }) });
      throw failure;
    };
    const open = new Function('assert', 'room', 'runtime', 'quiz', 'evaluation', 'openClassroom', 'delay',
      `${source.slice(start, end)} return open;`)(assert, { id: 'synthetic-room' }, { origin: 'http://synthetic.test' }, 'quiz', 'evaluation', openClassroom, async ms => waits.push(ms));
    await assert.rejects(open(page), error => error === failure);
    assert.equal(visits, 1); assert.deepEqual(waits, []); clean(page);
  });
}

for (const scenario of ['previous-phase-response', 'visible-target', 'current-phase-ui-error']) {
  test(`questionnaire navigation admission is bound to phase and UI: ${scenario}`, async () => {
    const { readFile } = await import('node:fs/promises');
    const source = await readFile(new URL('./p7-questionnaire-integration.test.mjs', import.meta.url), 'utf8');
    const start = source.indexOf('const open = async (page, title'), end = source.indexOf('const focusAndSaveQuestion', start);
    const page = new EventEmitter(), waits = []; let visits = 0, previous;
    const failure = Object.assign(new Error('Expected classroom read control did not appear'), { name: 'TimeoutError' });
    const emitLimited = req => page.emit('response', { ...response(req, 429, { error: { code: 'RATE_LIMITED' } }), headers: () => ({ 'retry-after': '1' }) });
    const locator = (role, name) => new Proxy({}, { get: (_target, key) => {
      if (key === 'isVisible') return async () => role === 'alert' || (scenario === 'visible-target' && role === 'link');
      if (key === 'getByRole') return (next, options = {}) => locator(next, options.name);
      if (['filter', 'first', 'locator'].includes(key)) return () => locator(role, name);
      if (key === 'click') return async () => {
        if (scenario === 'previous-phase-response' && name === 'Actividades') { emitLimited(previous); throw failure; }
      };
      return async () => {};
    } });
    page.getByRole = (role, options = {}) => locator(role, options.name); page.locator = () => locator('locator');
    const openClassroom = async () => {
      visits++;
      if (visits !== 1) return;
      previous = request('/api/v1/auth/session', 'GET'); page.emit('request', previous);
      if (scenario !== 'previous-phase-response') { emitLimited(previous); throw failure; }
    };
    const open = new Function('assert', 'room', 'runtime', 'quiz', 'evaluation', 'openClassroom', 'delay',
      `${source.slice(start, end)} return open;`)(assert, { id: 'synthetic-room' }, { origin: 'http://synthetic.test' }, 'quiz', 'evaluation', openClassroom, async ms => waits.push(ms));
    if (scenario === 'current-phase-ui-error') {
      await open(page); assert.equal(visits, 2); assert.deepEqual(waits, [1000]);
    } else {
      await assert.rejects(open(page), error => error === failure); assert.equal(visits, 1); assert.deepEqual(waits, []);
    }
    clean(page);
  });
}

test('destination read watcher ignores a 429 from a GET started before its action phase', async () => {
  const { watchActionResponse } = await import('./p8-current-ui-helpers.mjs');
  const page = new EventEmitter(), path = `${root}/attempts/synthetic-attempt/history`;
  const previous = request(path, 'GET'); page.emit('request', previous);
  const watcher = watchActionResponse(page, r => r.request().method() === 'GET' && new URL(r.url()).pathname === path, 12000);
  try {
    page.emit('response', response(previous, 429, { error: { code: 'RATE_LIMITED' } }));
    const current = exchange(page, path, 'GET', 200, { attempt: { id: 'synthetic-attempt' } });
    assert.equal(await watcher.value(), current);
  } finally { watcher.dispose(); }
  clean(page);
});
