import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';

const subject = '11111111-1111-4111-8111-111111111111';
const empty = () => ({ status: 'ready', items: [], totalItems: 0, nextCursor: null });
const response = () => ({ version: 1, subjectId: subject, generatedAt: '2026-10-25T12:00:00.000Z', timeZone: 'UTC',
  participation: 'mixed', memberships: { study: 1, teach: 1, archived: 0 }, setup: { drafts: 0, invitations: 0 },
  modules: Object.fromEntries(['pending', 'review', 'feedback', 'agenda', 'queries', 'materials', 'classrooms'].map(name => [name, empty()])) });
const factory = () => loadTsModule("apps/web/src/application/academic-home-client.ts").createWebHomeClient;

test('D9 browser makes one aggregate GET with same-origin credentials and no-store, never classroom fan-out', async () => {
  const calls = [], client = factory()(async (...args) => { calls.push(args); return Response.json(response()); });
  const legacy = response();
  assert.deepEqual(await client.read({ timeZone: 'UTC' }), { ...legacy, modules: { ...legacy.modules,
    drafts: { status: 'not-applicable' }, submitted: { status: 'not-applicable' } } });
  assert.equal(calls.length, 1); assert.equal(calls[0][0], '/api/v1/home?timeZone=UTC');
  assert.equal(calls[0][1].method, 'GET'); assert.equal(calls[0][1].credentials, 'same-origin'); assert.equal(calls[0][1].cache, 'no-store');
  assert.ok(calls[0][1].signal instanceof AbortSignal);
});

test('D9 browser encodes module cursor/zone and rejects invented authority before transport', async () => {
  const calls = [], module = { subjectId: subject, generatedAt: response().generatedAt, module: 'materials', page: empty() };
  const client = factory()(async (...args) => { calls.push(args); return Response.json(module); });
  assert.deepEqual(await client.page({ timeZone: 'America/Argentina/Buenos_Aires', module: 'materials', cursor: 'opaque.a_b' }), module);
  const url = new URL(calls[0][0], 'http://local.test');
  assert.equal(url.pathname, '/api/v1/home/modules/materials'); assert.equal(url.searchParams.get('cursor'), 'opaque.a_b');
  assert.equal(url.searchParams.get('timeZone'), 'America/Argentina/Buenos_Aires');
  await assert.rejects(client.read({ timeZone: 'UTC', role: 'teacher' }), { code: 'INVALID_INPUT' });
  assert.equal(calls.length, 1);
});

test('D9 browser preserves identity errors, conceals backend details and never turns invalid/private payload into success', async () => {
  for (const code of ['AUTH_REQUIRED', 'EMAIL_VERIFICATION_REQUIRED']) {
    const notices = [], client = factory()(async () => Response.json({ error: { code, detail: 'private database text' } }, { status: 403 }), value => notices.push(value));
    await assert.rejects(client.read({ timeZone: 'UTC' }), error => error.code === code && !error.message.includes('private database'));
    assert.deepEqual(notices, [code]);
  }
  for (const body of [{}, { ...response(), editorToken: 'private' }, { ...response(), subjectId: 'invalid' }]) {
    const client = factory()(async () => Response.json(body));
    await assert.rejects(client.read({ timeZone: 'UTC' }), { code: 'SERVICE_UNAVAILABLE' });
  }
});

test('D9 browser cancellation reaches transport and is not rewritten as an ordinary widget failure', async () => {
  const controller = new AbortController(); let supplied;
  const client = factory()(async (_url, options) => {
    supplied = options.signal;
    return new Promise((_resolve, reject) => supplied.addEventListener('abort', () => reject(supplied.reason), { once: true }));
  });
  const pending = client.read({ timeZone: 'UTC' }, controller.signal), reason = new DOMException('Account changed', 'AbortError');
  controller.abort(reason); await assert.rejects(pending, error => error === reason); assert.equal(supplied.aborted, true);
});
