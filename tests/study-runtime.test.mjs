import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';

const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const flush = () => new Promise(setImmediate);

function fixture(t) {
  const timers = [], runtimes = [], calls = [], captures = {};
  t.mock.method(globalThis, 'setInterval', (callback, delay) => {
    const timer = { callback, delay, active: true, unreferenced: false, unref() { this.unreferenced = true; }, fire() { if (this.active) this.callback(); } };
    timers.push(timer); return timer;
  });
  t.mock.method(globalThis, 'clearInterval', timer => { timer.active = false; calls.push('clear'); });
  const database = {}, security = {}, actor = { sessionId: 'synthetic-session' }, authenticate = async () => 'synthetic-owner';
  const files = { storage: {}, scanner: { async scan(bytes) { captures.scan = bytes; return 'CLEAN'; } } };
  const identity = { configuration: { security }, store: { async authenticate(verifier) { calls.push(['authenticate', verifier]); return actor; } },
    async generalAdmission(ip, context) { calls.push(['admit', ip, context]); } };
  const bridge = { port: {}, uploads: {} }, agenda = {}, attachments = { async cleanup() { calls.push('cleanup'); } };
  const reminders = { async close() { calls.push('reminders.close'); } };
  const { createStudyRuntime, STUDY_RUNTIME } = loadTsModule('apps/api/src/bootstrap/study-runtime.ts', { stubs: {
    './study-composition.ts': { createStudyService(options) { captures.service = options; return options; } },
    './study-transport.ts': { createStudyAuthentication(value) { assert.equal(value, security); return authenticate; } },
    './study-file-integration.ts': { createStudyFileIntegration(value, options) { assert.equal(value, files); captures.files = options; return bridge; } },
    './foxy-host.ts': { createFoxyAuthentication(value) { assert.equal(value, security); return 'teacher-authenticate'; } },
    '../modules/files/custody/infrastructure/content.ts': { inspectContent: 'inspect-content' },
    '../modules/files/custody/infrastructure/chat-attachment-service.ts': { createChatAttachmentService(options) { captures.attachments = options; return attachments; } },
    './study-agenda-integration.ts': { createStudyAgendaIntegration() { return agenda; } },
    '../modules/study/reviews/infrastructure/runtime.ts': { createStudyReminderRuntime(options) { captures.reminders = options; return reminders; } },
    '../../../../src/core/domain/study/engine.ts': {
      executeStudy(input, provider) { return provider.generate(input); },
      generateDevelopmentFeedback(practice, answers, sources, provider) { return provider.generate({ practice, answers, sources }); },
    },
    '../modules/study/generation/infrastructure/providers/study-adapter.ts': { createGeminiStudyProvider(...args) { captures.gemini = args; return { async generate(input) { return { synthetic: input }; } }; } },
    '../modules/identity/accounts/presentation/transport.ts': { readSessionCookie(cookie) { calls.push(['cookie', cookie]); return cookie ? { verifier: 'synthetic-verifier' } : {}; } },
  } });
  t.after(async () => { for (const runtime of runtimes) await runtime.close(); });
  return { timers, calls, captures, database, identity, files, authenticate, actor, bridge, agenda, attachments, reminders,
    create(configuration = {}, options = {}) { assert.equal(STUDY_RUNTIME, 'StudyRuntime'); const runtime = createStudyRuntime(database, identity, files, configuration, options); runtimes.push(runtime); return runtime; },
    close(runtime) { runtimes.splice(runtimes.indexOf(runtime), 1); return runtime.close(); } };
}

test('S1 existing factories receive the same database, authentication, file ports and quotas', async t => {
  const f = fixture(t), runtime = f.create({ studyQuotaBytes: 456n });
  assert.equal(runtime.service, f.captures.service);
  assert.equal(runtime.uploads, f.bridge.uploads);
  assert.equal(runtime.attachments, f.attachments);
  assert.equal(runtime.reminders, f.reminders);
  assert.deepEqual(f.captures.files, { database: f.database, authenticate: f.authenticate, quotaBytes: 456n });
  assert.deepEqual(f.captures.reminders, { database: f.database, authenticate: f.authenticate });
  assert.equal(f.captures.service.database, f.database);
  assert.equal(f.captures.service.authenticate, f.authenticate);
  assert.equal(f.captures.service.files, f.bridge.port);
  assert.equal(f.captures.service.agenda, f.agenda);
  assert.equal(f.captures.attachments.database, f.database);
  assert.equal(f.captures.attachments.storage, f.files.storage);
  assert.equal(f.captures.attachments.student, f.authenticate);
  assert.equal(f.captures.attachments.teacher, 'teacher-authenticate');
  assert.equal(f.captures.attachments.folderQuota, 456n);
  assert.equal(f.captures.attachments.inspect, 'inspect-content');
  const bytes = Buffer.from('synthetic');
  assert.equal(await f.captures.attachments.scan(bytes), 'CLEAN');
  assert.equal(f.captures.scan, bytes);
});

test('S1 admission preserves cookie lookup, authenticated/anonymous context, IP guard and errors', async t => {
  const f = fixture(t), runtime = f.create(), response = {};
  await runtime.admit({ headers: { cookie: 'synthetic-cookie' }, socket: { remoteAddress: '127.0.0.1' } }, response);
  assert.deepEqual(f.calls, [['cookie', 'synthetic-cookie'], ['authenticate', 'synthetic-verifier'], ['admit', '127.0.0.1', f.actor]]);
  f.calls.length = 0;
  await runtime.admit({ headers: {}, socket: { remoteAddress: '127.0.0.2' } }, response);
  assert.deepEqual(f.calls, [['cookie', undefined], ['admit', '127.0.0.2', null]]);
  f.calls.length = 0;
  await assert.rejects(runtime.admit({ headers: {}, socket: {} }, response), { code: 'SERVICE_UNAVAILABLE', message: 'SERVICE_UNAVAILABLE' });
  assert.deepEqual(f.calls, [['cookie', undefined]]);
  const failure = Object.assign(new Error('RATE_LIMITED'), { code: 'RATE_LIMITED' });
  f.identity.generalAdmission = async () => { throw failure; };
  await assert.rejects(runtime.admit({ headers: {}, socket: { remoteAddress: '127.0.0.1' } }, response), error => error === failure);
});

test('S1 Study override wins over absent AI and generic AI override, with authorization before generate/feedback', async t => {
  const f = fixture(t), events = [], input = { prompt: 'synthetic' }, answers = { one: 'answer' }, practice = {}, sources = [];
  const provider = { async generate(value) { events.push(['generate', value]); return 'synthetic-result'; } };
  const runtime = f.create({}, { study: { provider }, ai: {} });
  const context = { ownerId: 'owner', requestId: 'request', async authorize() { events.push('authorize'); } };
  assert.equal(await runtime.service.generate(input, context), 'synthetic-result');
  assert.equal(await runtime.service.feedback({ practice, answers, sources }, context), 'synthetic-result');
  assert.deepEqual(events, ['authorize', ['generate', input], 'authorize', ['generate', { practice, answers, sources }]]);
  events.length = 0;
  const forbidden = Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' });
  await assert.rejects(runtime.service.generate(input, { ...context, async authorize() { throw forbidden; } }), error => error === forbidden);
  assert.deepEqual(events, []);
  assert.equal(f.captures.gemini, undefined);
  // Existing synthetic override accepts absent context; extraction must not add an authorization promise.
  assert.equal(await runtime.service.generate(input), 'synthetic-result');
});

test('S2 absent AI, generic AI overrides and missing context never fall through to the real provider', async t => {
  const f = fixture(t), context = { ownerId: 'owner', requestId: 'request' }, configuredAi = { model: 'synthetic' };
  for (const [configuration, options, requestContext] of [[{}, {}, context], [{ ai: configuredAi }, { ai: {} }, context],
    [{ ai: configuredAi }, { ai: null }, context], [{ ai: configuredAi }, {}, undefined]]) {
    const runtime = f.create(configuration, options);
    assert.throws(() => runtime.service.generate({}, requestContext), { code: 'AI_UNAVAILABLE', message: 'AI_UNAVAILABLE' });
    assert.throws(() => runtime.service.feedback({ practice: {}, answers: {}, sources: [] }, requestContext), { code: 'AI_UNAVAILABLE', message: 'AI_UNAVAILABLE' });
    assert.equal(f.captures.gemini, undefined);
  }
});

test('S1 configured provider receives authority and the metric flow, with admission waiting only for feedback', async t => {
  const f = fixture(t), ai = { model: 'synthetic' }, authorize = async () => {}, input = { action: 'CHAT', prompt: 'fixture' };
  const runtime = f.create({ ai });
  assert.deepEqual(await runtime.service.generate(input, { ownerId: 'owner', requestId: 'request', authorize }), { synthetic: input });
  assert.deepEqual(f.captures.gemini, [ai, f.database, 'owner', 'request', authorize, undefined, { flow: 'chat', waitForAdmission: false }]);
  const tool = { ...input, action: 'NOTE' };
  assert.deepEqual(await runtime.service.generate(tool, { ownerId: 'owner', requestId: 'tool', authorize }), { synthetic: tool });
  assert.deepEqual(f.captures.gemini, [ai, f.database, 'owner', 'tool', authorize, undefined, { flow: 'tool', waitForAdmission: false }]);
  const feedback = { practice: {}, answers: {}, sources: [] };
  assert.deepEqual(await runtime.service.feedback(feedback, { ownerId: 'owner', requestId: 'feedback', authorize }), { synthetic: feedback });
  assert.deepEqual(f.captures.gemini, [ai, f.database, 'owner', 'feedback', authorize, undefined, { flow: 'feedback', waitForAdmission: true }]);
});

test('S1 cleanup timer is unreferenced, non-overlapping, retries sanitized failures and stops on close', async t => {
  const f = fixture(t), first = deferred(), warnings = [];
  t.mock.method(console, 'warn', message => warnings.push(message));
  let attempts = 0;
  f.attachments.cleanup = () => { attempts++; return attempts === 1 ? first.promise : Promise.resolve(); };
  const runtime = f.create(), timer = f.timers[0];
  assert.equal(timer.delay, 60000);
  assert.equal(timer.unreferenced, true);
  assert.equal(attempts, 0);
  timer.fire(); timer.fire();
  assert.equal(attempts, 1);
  first.reject(new Error('private driver detail must not escape'));
  await flush();
  assert.deepEqual(warnings, ['Chat attachment cleanup unavailable']);
  timer.fire(); await flush();
  assert.equal(attempts, 2);
  await f.close(runtime);
  assert.equal(timer.active, false);
  timer.fire();
  assert.equal(attempts, 2);
});

for (const first of ['cleanup', 'reminders']) {
  test(`S1 close clears scheduling and waits for both drains when ${first} finishes first`, async t => {
    const f = fixture(t), pending = { cleanup: deferred(), reminders: deferred() };
    f.attachments.cleanup = () => { f.calls.push('cleanup'); return pending.cleanup.promise; };
    f.reminders.close = () => { f.calls.push('reminders.close'); return pending.reminders.promise; };
    const runtime = f.create(); f.timers[0].fire();
    let closed = false;
    const closing = f.close(runtime).then(() => { closed = true; });
    assert.deepEqual(f.calls, ['cleanup', 'clear', 'reminders.close']);
    assert.equal(f.timers[0].active, false);
    pending[first].resolve(); await flush(); assert.equal(closed, false);
    pending[first === 'cleanup' ? 'reminders' : 'cleanup'].resolve();
    await closing; assert.equal(closed, true);
  });
}
