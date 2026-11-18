import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { createAiQuotaHandler } from '../apps/api/src/bootstrap/ai-quota-http.ts';
import { proxyAiQuotaRequest } from '../apps/web/src/application/server/ai-quota-proxy.ts';
import { IdentityHttpError } from '../apps/api/src/modules/identity/domain/errors.ts';

async function listen(t, handler) {
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => {
    server.closeAllConnections();
    return new Promise(resolve => server.close(resolve));
  });
  return `http://127.0.0.1:${server.address().port}`;
}

const path = '/api/v1/ai-quota';
const base = { subjectId: 'a', version: 0, limitMicrousd: 3_000_000, consumedMicrousd: 0, reservedMicrousd: 0, remainingMicrousd: 3_000_000,
  periodStart: '2026-11-01T03:00:00.000Z', renewsAt: '2026-12-01T03:00:00.000Z', tools: [] };

async function fixture(t) {
  const snapshot = { a: base, b: { ...base, subjectId: 'b', limitMicrousd: 5_000_000, remainingMicrousd: 5_000_000 } };
  let revoked = false;
  const auth = request => {
    if (revoked || !request.headers.cookie) throw new IdentityHttpError('AUTH_REQUIRED');
    if (request.headers.cookie === 'foxmind_session=unverified') throw new IdentityHttpError('EMAIL_VERIFICATION_REQUIRED');
    const id = request.headers.cookie.at(-1);
    assert.ok(Object.hasOwn(snapshot, id));
    return id;
  };
  const handler = createAiQuotaHandler({ async admit(request) { return auth(request); }, async read(request, id) {
    assert.equal(auth(request), id);
    return snapshot[id];
  } });
  const api = await listen(t, handler);
  const web = await listen(t, (req, res) => void proxyAiQuotaRequest(req, res, api));
  return { snapshot, revoke: () => { revoked = true; }, web };
}

const cookies = id => ({ cookie: `foxmind_session=${id}` });

test('snapshot is private, requires verification, and derives its owner from the session', async t => {
  const { web } = await fixture(t);
  assert.equal((await fetch(web + path)).status, 401);
  assert.equal((await fetch(web + path, { headers: cookies('unverified') })).status, 403);
  assert.equal((await fetch(web + path + '?ownerId=b', { headers: cookies('a') })).status, 400);
  assert.equal((await fetch(web + path + '/events', { headers: { ...cookies('a'), 'sec-fetch-site': 'cross-site' } })).status, 403);
  const student = await fetch(web + path, { headers: cookies('a') });
  assert.equal(student.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await student.json(), base);
  assert.deepEqual(await (await fetch(web + path, { headers: cookies('b') })).json(),
    { ...base, subjectId: 'b', limitMicrousd: 5_000_000, remainingMicrousd: 5_000_000 });
});

async function readEvent(reader) {
  let pending = '';
  while (true) {
    const { value, done } = await reader.read();
    assert.equal(done, false);
    pending += new TextDecoder().decode(value);
    const match = /^id: (\d+)\ndata: (.+)\n/m.exec(pending);
    if (match) return { id: Number(match[1]), snapshot: JSON.parse(match[2]) };
  }
}

test('same-origin stream delivers a committed balance within two seconds and resyncs on reconnect', { timeout: 8000 }, async t => {
  const { web, snapshot, revoke } = await fixture(t);
  const open = () => fetch(web + path + '/events', { headers: cookies('a') });
  const response = await open();
  assert.match(response.headers.get('content-type'), /text\/event-stream/);
  const reader = response.body.getReader();
  const other = (await open()).body.getReader();
  assert.deepEqual(await readEvent(reader), { id: 0, snapshot: base });
  assert.deepEqual(await readEvent(other), { id: 0, snapshot: base });
  const start = performance.now();
  snapshot.a = { ...base, version: 1, reservedMicrousd: 320_000, remainingMicrousd: 2_680_000,
    tools: [{ capability: 'foxy', consumedMicrousd: 0, reservedMicrousd: 320_000, chargedOperations: 0, reservedOperations: 1 }] };
  assert.deepEqual(await Promise.all([readEvent(reader), readEvent(other)]), Array(2).fill({ id: 1, snapshot: snapshot.a }));
  assert.ok(performance.now() - start < 2000);
  snapshot.a = { ...base, version: 1, periodStart: base.renewsAt, renewsAt: '2027-01-01T03:00:00.000Z' };
  assert.deepEqual(await Promise.all([readEvent(reader), readEvent(other)]), Array(2).fill({ id: 1, snapshot: snapshot.a }));
  await reader.cancel();
  await other.cancel();
  snapshot.a = { ...snapshot.a, version: 2, consumedMicrousd: 320_000, remainingMicrousd: 2_680_000 };
  const reconnected = (await open()).body.getReader();
  assert.deepEqual(await readEvent(reconnected), { id: 2, snapshot: snapshot.a });
  revoke();
  assert.deepEqual(await Promise.race([reconnected.read(), delay(2000, 'did not terminate', { ref: false })]), { value: undefined, done: true });
});
