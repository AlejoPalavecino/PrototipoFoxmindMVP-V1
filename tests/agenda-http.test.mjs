import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { loadTsModule } from './helpers/load-ts-module.mjs';

const payload = { title: 'Clase', description: '', category: 'CLASS',
  schedule: { kind: 'ALL_DAY', startDate: '2026-11-02', endDateExclusive: '2026-11-03' }, repeat: { kind: 'NONE' } };
async function fixture(run) {
  const { createAgendaHandler } = loadTsModule("apps/api/src/modules/agenda/events/presentation/http.ts");
  const calls = [], admissions = [], event = { ...payload, id: randomUUID(), revision: '0' };
  let created = true;
  const service = Object.fromEntries(['put', 'get', 'replace', 'remove', 'list', 'upcoming', 'open'].map(name => [name, async (...args) => {
    calls.push([name, ...args.slice(1)]);
    if (name === 'put') { const result = { event, created }; created = false; return result; }
    if (name === 'remove') return;
    return event;
  }]));
  const handler = createAgendaHandler(service, { async admit(req, write) {
    admissions.push(write);
    if (write && (req.headers.origin !== 'http://web.test' || req.headers['x-csrf-token'] !== 'bound'))
      throw Object.assign(new Error('denied'), { code: 'FORBIDDEN' });
  } });
  const server = createServer((req, res) => void handler(req, res, () => { res.statusCode = 404; res.end(); }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const send = (path, method = 'GET', body, headers = {}) => fetch(`http://127.0.0.1:${server.address().port}${path}`, {
    method, headers: { 'content-type': 'application/json', origin: 'http://web.test', 'x-csrf-token': 'bound', ...headers },
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  });
  try { await run({ send, calls, admissions, event }); }
  finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

test('agenda HTTP maps exact CRUD, series revisions, idempotent status and no-store', async () => fixture(async ({ send, calls, admissions, event }) => {
  const base = `/agenda/events/${event.id}`;
  const first = await send(base, 'PUT', payload); assert.equal(first.status, 201);
  assert.deepEqual(await first.json(), event); assert.equal(first.headers.get('cache-control'), 'no-store');
  assert.equal((await send(base, 'PUT', payload)).status, 200);
  assert.equal((await send(base)).status, 200);
  assert.equal((await send(base, 'PATCH', { revision: '0', event: payload })).status, 200);
  const removed = await send(base, 'DELETE', { revision: '1' });
  assert.equal(removed.status, 204); assert.equal(await removed.text(), '');
  assert.deepEqual(calls.map(x => x[0]), ['put', 'put', 'get', 'replace', 'remove']);
  assert.deepEqual(calls[3].slice(1), [event.id, { revision: '0', event: payload }]);
  assert.deepEqual(admissions, [true, true, false, true, true]);
}));

test('agenda HTTP requires admission for PUT PATCH DELETE and academic open', async () => fixture(async ({ send, calls, event }) => {
  for (const [path, method, body] of [[`/agenda/events/${event.id}`, 'PUT', payload],
    [`/agenda/events/${event.id}`, 'PATCH', { revision: '0', event: payload }],
    [`/agenda/events/${event.id}`, 'DELETE', { revision: '0' }],
    ['/agenda/open', 'POST', { classroomId: randomUUID(), activityId: randomUUID() }]]) {
    for (const headers of [{ origin: 'http://evil.test' }, { 'x-csrf-token': 'wrong' }]) {
      const denied = await send(path, method, body, headers); assert.equal(denied.status, 403);
      assert.equal(denied.headers.get('cache-control'), 'no-store');
    }
  }
  assert.equal(calls.length, 0);
}));

test('agenda HTTP rejects extra query keys, invalid range/cursor/id and invalid mutation JSON', async () => fixture(async ({ send, calls, event }) => {
  for (const [path, method, body] of [
    ['/agenda?startDate=2026-11-01&endDateExclusive=2026-12-01&timeZone=UTC&ownerId=foreign', 'GET'],
    ['/agenda?startDate=2026-02-30&endDateExclusive=2026-03-02&timeZone=UTC', 'GET'],
    ['/agenda?startDate=2026-01-01&endDateExclusive=2027-01-01&timeZone=UTC', 'GET'],
    ['/agenda/upcoming?limit=0', 'GET'], ['/agenda/upcoming?limit=1.5', 'GET'],
    ['/agenda/events/not-uuid', 'GET'], [`/agenda/events/${event.id}`, 'PUT', '{bad-json'],
    [`/agenda/events/${event.id}`, 'DELETE', { revision: '0', ownerId: 'foreign' }],
    [`/agenda/events/${event.id}`, 'PATCH', { revision: '-1', event: payload }],
    [`/agenda/events/${event.id}`, 'PUT', 'x'.repeat(32769)],
  ]) {
    const response = await send(path, method, body);
    assert.ok(response.status >= 400 && response.status < 500, `${method} ${path}: ${response.status}`);
  }
  assert.equal(calls.length, 0);
}));

// F2: the web proxy forwards these without checking their shape, so the API is the only gate and must answer exactly 400 INVALID_INPUT.
test('agenda HTTP answers 400 INVALID_INPUT for every shape the web proxy no longer checks', async () => fixture(async ({ send, calls, event }) => {
  const base = `/agenda/events/${event.id}`;
  for (const [path, method, body] of [
    ['/agenda?startDate=2026-11-01&endDateExclusive=2026-12-01&timeZone=UTC&ownerId=foreign', 'GET'],
    ['/agenda?startDate=2026-11-01&startDate=2026-11-02&endDateExclusive=2026-12-01&timeZone=UTC', 'GET'],
    ['/agenda?startDate=2026-11-01&endDateExclusive=2026-12-01', 'GET'],
    ['/agenda?startDate=2026-11-01&endDateExclusive=2026-12-01&timeZone=UTC&cursor=bad%20cursor', 'GET'],
    ['/agenda/upcoming?limit=21', 'GET'], ['/agenda/upcoming?limit=01', 'GET'], ['/agenda/upcoming?limit=1e1', 'GET'], ['/agenda/upcoming?other=1', 'GET'],
    ['/agenda/upcoming?limit=1d', 'GET'], ['/agenda/upcoming?limit=-1', 'GET'],
    [`${base}?x=1`, 'GET'],
    [base, 'PUT', { ...payload, title: 7 }], [base, 'PUT', { ...payload, ownerId: 'foreign' }],
    [base, 'PATCH', { revision: '0' }], [base, 'PATCH', { revision: 'x', event: payload }],
    [base, 'DELETE', { revision: '0', ownerId: 'foreign' }], [base, 'DELETE', {}],
    ['/agenda/open', 'POST', { classroomId: 'not-uuid', activityId: null }],
    ['/agenda/open', 'POST', { classroomId: randomUUID() }],
  ]) {
    const response = await send(path, method, body);
    assert.equal(response.status, 400, `${method} ${path}`);
    assert.deepEqual(await response.json(), { error: { code: 'INVALID_INPUT' } }, `${method} ${path}`);
  }
  assert.equal(calls.length, 0);
}));

// Regression of F2 cut 5: the canonical-decimal check lost its backslash and rejected 10–20.
test('agenda upcoming accepts every canonical limit from 1 to 20', async () => fixture(async ({ send, calls }) => {
  for (const limit of [1, 5, 9, 10, 15, 20]) {
    const response = await send(`/agenda/upcoming?limit=${limit}`);
    assert.equal(response.status, 200, `limit=${limit}`);
    assert.deepEqual(calls.at(-1), ['upcoming', limit]);
  }
}));
