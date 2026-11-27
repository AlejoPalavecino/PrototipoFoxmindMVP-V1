import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { loadTsModule } from './helpers/load-ts-module.mjs';

async function serve(handler) {
  const server = createServer(handler); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { origin: `http://127.0.0.1:${server.address().port}`,
    async close() { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } };
}
async function fixture(run) {
  const { proxyAgendaRequest } = loadTsModule('apps/web/src/application/server/agenda-proxy.ts');
  const calls = [];
  const upstream = await serve(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    calls.push({ path: req.url, headers: req.headers, body: Buffer.concat(chunks).toString() });
    res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ ok: true }));
  });
  const web = await serve((req, res) => void proxyAgendaRequest(req, res, upstream.origin));
  try { await run(web.origin, calls); } finally { await web.close(); await upstream.close(); }
}

test('agenda proxy forwards only security headers and exact supported private routes', async () => fixture(async (origin, calls) => {
  const id = randomUUID(), body = { title: 'Clase', description: '', category: 'CLASS',
    schedule: { kind: 'ALL_DAY', startDate: '2026-11-02', endDateExclusive: '2026-11-03' }, repeat: { kind: 'NONE' } };
  const response = await fetch(`${origin}/api/v1/agenda/events/${id}`, { method: 'PUT', body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', cookie: 'foxmind_session=fixture', origin: 'http://web.test',
      'x-csrf-token': 'fixture-csrf', authorization: 'do-not-forward', 'x-forwarded-host': 'evil.test' } });
  assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(calls.length, 1); assert.equal(calls[0].path, `/api/v1/agenda/events/${id}`);
  assert.equal(calls[0].headers.cookie, 'foxmind_session=fixture'); assert.equal(calls[0].headers['x-csrf-token'], 'fixture-csrf');
  assert.equal(calls[0].headers.origin, 'http://web.test'); assert.equal(calls[0].headers.authorization, undefined);
  assert.equal(calls[0].headers['x-forwarded-host'], undefined); assert.deepEqual(JSON.parse(calls[0].body), body);
}));

test('agenda proxy rejects unsupported routes, methods, encodings and excessive bytes before upstream', async () => fixture(async (origin, calls) => {
  const id = randomUUID();
  for (const [path, method, body, type] of [
    ['/api/v1/agenda/unknown', 'GET'], [`/api/v1/agenda/events/${id}`, 'POST', '{}'],
    [`/api/v1/agenda/events/${id}`, 'PATCH', '{}', 'text/plain'],
    [`/api/v1/agenda/events/${id}`, 'PUT', 'x'.repeat(32769)],
    [`/api/v1/agenda/events/not-uuid`, 'GET'],
  ]) {
    const response = await fetch(origin + path, { method, body, headers: body ? { 'content-type': type ?? 'application/json' } : {} });
    assert.ok(response.status >= 400 && response.status < 500, `${method} ${path}: ${response.status}`);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  assert.equal(calls.length, 0);
}));

// F2: domain shape (query keys, ranges, limits, event and revision bodies) belongs to the API; the proxy forwards it unchanged.
test('agenda proxy forwards queries and bodies without checking their domain shape', async () => fixture(async (origin, calls) => {
  const id = randomUUID();
  const cases = [
    ['/api/v1/agenda?ownerId=foreign', 'GET'], ['/api/v1/agenda/upcoming?limit=21', 'GET'],
    ['/api/v1/agenda/upcoming?limit=1&limit=2', 'GET'], [`/api/v1/agenda/events/${id}?x=1`, 'GET'],
    [`/api/v1/agenda/events/${id}`, 'DELETE', '{"revision":"0","ownerId":"foreign"}'],
    [`/api/v1/agenda/events/${id}`, 'PUT', '{"title":7}'],
    ['/api/v1/agenda/open', 'POST', '{"classroomId":"not-uuid","activityId":null}'],
  ];
  for (const [path, method, body] of cases) {
    const response = await fetch(origin + path, { method, body, headers: body ? { 'content-type': 'application/json' } : {} });
    assert.equal(response.status, 200, `${method} ${path}`);
  }
  assert.deepEqual(calls.map(call => call.path), cases.map(([path]) => path));
  assert.deepEqual(calls.filter(call => call.body).map(call => call.body), cases.filter(([, , body]) => body).map(([, , body]) => body));
}));
