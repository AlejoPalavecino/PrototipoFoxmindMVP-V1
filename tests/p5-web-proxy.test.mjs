import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request as httpRequest } from 'node:http';
import { proxyClassroomRequest } from '../apps/web/src/application/server/classroom-proxy.ts';

const id = 'a1111111-1111-4111-8111-111111111111';
async function server(handler) {
  const value = createServer(handler);
  await new Promise(resolve => value.listen(0, '127.0.0.1', resolve));
  return { value, origin: `http://127.0.0.1:${value.address().port}`, close: () => new Promise(resolve => { value.closeAllConnections(); value.close(resolve); }) };
}
async function fixture(run, handler = async (req, res) => {
  const chunks = []; for await (const chunk of req) chunks.push(chunk);
  res.writeHead(200, { 'Content-Type': 'application/json', 'Set-Cookie': 'foxmind_session=rotated; HttpOnly', 'Retry-After': '8', 'X-Request-Id': 'upstream-request' });
  res.end(JSON.stringify({ url: req.url, headers: req.headers, body: Buffer.concat(chunks).toString() }));
}) {
  const api = await server(handler);
  const web = await server((req, res) => void proxyClassroomRequest(req, res, api.origin));
  try { await run(web.origin); } finally { await web.close(); await api.close(); }
}

test('classroom proxy forwards exact routes/security headers and legitimate large draft JSON', async () => fixture(async origin => {
  const payload = { revision: '0', payload: { units: Array.from({ length: 80 }, () => ({ name: 'Unidad'.repeat(18), topics: [{ name: 'Tema'.repeat(25) }] })) } };
  const body = JSON.stringify(payload);
  assert.ok(Buffer.byteLength(body) > 16384);
  const response = await fetch(`${origin}/api/v1/classrooms/drafts/${id}`, { method: 'PATCH', body, headers: { 'Content-Type': 'application/json', Cookie: 'foxmind_session=original', Origin: 'http://web.test', 'X-CSRF-Token': 'binding', Authorization: 'ignored', 'X-Forwarded-Host': 'evil' } });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.url, `/api/v1/classrooms/drafts/${id}`);
  assert.equal(result.headers.cookie, 'foxmind_session=original');
  assert.equal(result.headers.origin, 'http://web.test');
  assert.equal(result.headers['x-csrf-token'], 'binding');
  assert.equal(result.headers.authorization, undefined);
  assert.equal(result.headers['x-forwarded-host'], undefined);
  assert.equal(result.body, body);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('retry-after'), '8');
  assert.match(response.headers.get('set-cookie'), /rotated/);
}));

test('unknown paths/queries/methods/schema/encoding and excessive JSON never reach upstream', async () => {
  let calls = 0;
  await fixture(async origin => {
    for (const [path, method, status, body, headers] of [
      ['/api/v1/classrooms/other', 'GET', 404],
      ['/api/v1/classrooms?actor=other', 'GET', 400],
      [`/api/v1/classrooms/${id}/archive`, 'PATCH', 405, '{}'],
      [`/api/v1/classrooms/drafts/${id}`, 'PATCH', 400, '{"revision":"0","payload":{"owner":"other"}}'],
      ['/api/v1/classrooms/drafts', 'POST', 400, '{"owner":"other"}'],
      ['/api/v1/classrooms/drafts', 'POST', 400, '{}', { 'Content-Encoding': 'gzip' }],
      ['/api/v1/classrooms/drafts', 'POST', 413, 'x'.repeat(512 * 1024 + 1)],
    ]) {
      const result = await fetch(`${origin}${path}`, { method, body, headers: body ? { 'Content-Type': 'application/json', ...headers } : headers });
      assert.equal(result.status, status, `${method} ${path}`);
      const data = await result.json();
      assert.equal(result.headers.get('x-request-id'), data.error.requestId);
    }
  }, (_req, res) => { calls++; res.end('{}'); });
  assert.equal(calls, 0);
});

test('all declared P5 operations retain their original path/method/body contracts', async () => fixture(async origin => {
  const operations = [
    ['', 'GET'], ['/drafts', 'GET'], ['/drafts', 'POST', {}], [`/drafts/${id}`, 'GET'],
    [`/drafts/${id}/publish`, 'POST', { revision: '0' }], ['/codes/preview', 'POST', { code: 'code' }], ['/codes/confirm', 'POST', { confirmation: 'preview' }],
    ['/invitations', 'GET'], [`/invitations/${id}/accept`, 'POST', {}], [`/${id}`, 'GET'],
    [`/${id}/settings`, 'PATCH', { revision: '0', name: 'Aula', subject: 'Materia', division: 'A', academicYear: 2026 }], [`/${id}/archive`, 'POST', { archived: true, revision: '0' }],
    [`/${id}/code`, 'POST', {}], [`/${id}/members`, 'GET'], [`/${id}/history`, 'GET'], [`/${id}/members/${id}`, 'GET'],
    [`/${id}/invitations`, 'GET'], [`/${id}/invitations`, 'POST', { email: '"Alumno ejemplo"@mañana.test' }], [`/${id}/invitations/${id}/revoke`, 'POST', {}], [`/${id}/leave`, 'POST', {}], [`/${id}/members/${id}/remove`, 'POST', {}],
  ];
  for (const [path, method, body] of operations) {
    const response = await fetch(`${origin}/api/v1/classrooms${path}`, { method, ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}) });
    assert.equal(response.status, 200, path);
    assert.equal((await response.json()).url, `/api/v1/classrooms${path}`);
  }
}));

test('unsafe configuration, redirects, truncated and oversized upstream responses are sanitized', async () => {
  for (const configured of [undefined, 'http://remote.test', 'https://user:password@remote.test', 'https://remote.test/path']) {
    const web = await server((req, res) => void proxyClassroomRequest(req, res, configured));
    try { const response = await fetch(`${web.origin}/api/v1/classrooms`); assert.equal(response.status, 503); assert.doesNotMatch(await response.text(), /password|remote\.test/); }
    finally { await web.close(); }
  }
  for (const handler of [
    (_req, res) => { res.writeHead(302, { Location: 'https://evil.test' }); res.end(); },
    (_req, res) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('x'.repeat(2 * 1024 * 1024 + 1)); },
    (_req, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('private upstream'); },
    (_req, res) => { res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': '100' }); res.write('{}'); res.destroy(); },
  ]) await fixture(async origin => { const response = await fetch(`${origin}/api/v1/classrooms`); assert.equal(response.status, 503); assert.doesNotMatch(await response.text(), /evil|private/); }, handler);
});

test('chunked JSON limits, non-JSON schemas and encoded traversal reject before forwarding', async () => {
  let calls = 0;
  await fixture(async origin => {
    const send = (path, chunks, headers = {}) => new Promise((resolve, reject) => {
      const req = httpRequest(`${origin}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers } }, response => {
        response.resume(); response.once('end', () => resolve(response.statusCode));
      });
      req.once('error', reject);
      for (const chunk of chunks) req.write(chunk);
      req.end();
    });
    assert.equal(await send('/api/v1/classrooms/drafts', ['{', 'x'.repeat(512 * 1024), '}']), 413);
    assert.equal(await send('/api/v1/classrooms/drafts', ['[]']), 400);
    assert.equal(await send('/api/v1/classrooms/drafts', ['{}'], { 'Content-Type': 'text/plain' }), 400);
    assert.equal(await send('/api/v1/classrooms/%2e%2e/auth/login', ['{}']), 400);
  }, (_req, res) => { calls++; res.end('{}'); });
  assert.equal(calls, 0);
});

test('downstream cancellation destroys an in-flight upstream request', async () => {
  let upstreamStarted, upstreamClosed;
  const started = new Promise(resolve => { upstreamStarted = resolve; });
  const closed = new Promise(resolve => { upstreamClosed = resolve; });
  await fixture(async origin => {
    const request = httpRequest(`${origin}/api/v1/classrooms`);
    request.on('error', () => {});
    request.end();
    await started;
    request.destroy();
    await Promise.race([closed, new Promise((_, reject) => { const timer = setTimeout(() => reject(new Error('Upstream did not close')), 2000); timer.unref(); })]);
  }, (req, _res) => { req.once('close', upstreamClosed); upstreamStarted(); });
});

test('settings forwards an optional catalog cover through real transport and preserves write guards', async () => {
  const { loadTsModule } = await import('./helpers/load-ts-module.mjs');
  const policy = loadTsModule('apps/api/src/modules/classrooms/access/infrastructure/policy.ts');
  const { createClassroomsHandler } = loadTsModule('apps/api/src/bootstrap/academic-http.ts', { stubs: {
    '../modules/classrooms/access/infrastructure/policy.ts': policy,
  } });
  const { updateSettingsOperation } = loadTsModule('apps/api/src/bootstrap/academic-management-composition.ts', { stubs: {
    '../../domain/policy.ts': policy,
  } });
  const writes = [];
  const capability = {
    ports: {},
    run: async (req, write, operation) => {
      assert.equal(write, true);
      return operation({ query: async (_sql, ...values) => { writes.push(values); return []; } }, { teacher: req.headers.cookie === 'fixture=teacher' });
    },
    classroom: async (_tx, actor, requestedId, lock, teacherOnly) => {
      assert.equal(requestedId, id);
      assert.ok(lock && teacherOnly);
      if (!actor.teacher) policy.fail('FORBIDDEN');
      return { revision: 2n };
    },
  };
  const handler = createClassroomsHandler({
    updateSettings: (req, room, input) => updateSettingsOperation(capability, req, room, input),
  }, { admit: async (req, write) => {
    assert.equal(write, true);
    if (!['fixture=teacher', 'fixture=student'].includes(req.headers.cookie)) throw Error('Synthetic admission denied');
  } });
  const payload = { revision: '2', name: 'Aula', subject: 'Materia', division: 'A', academicYear: 2026 };
  await fixture(async origin => {
    const send = (body, actor = 'teacher') => fetch(`${origin}/api/v1/classrooms/${id}/settings`, {
      method: 'PATCH', body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', ...(actor ? { Cookie: `fixture=${actor}` } : {}) },
    });
    assert.equal((await send({ ...payload, coverKey: 'biology' })).status, 200);
    assert.equal(writes.at(-1)[6], 'biology');
    assert.equal((await send(payload)).status, 200);
    assert.equal(writes.at(-1)[6], null);
    assert.equal((await send({ ...payload, coverKey: 'outside-catalog' })).status, 400);
    assert.equal((await send({ ...payload, ownerId: id, coverKey: 'biology' })).status, 400);
    assert.equal((await send({ ...payload, coverKey: 'biology' }, null)).status, 403);
    assert.equal((await send({ ...payload, coverKey: 'biology' }, 'student')).status, 403);
    assert.equal((await send({ ...payload, revision: '1', coverKey: 'biology' })).status, 409);
    assert.equal(writes.length, 2);
  }, (req, res) => {
    req.url = req.url.replace(/^\/api\/v1/, '');
    handler(req, res, () => res.writeHead(404).end());
  });
});

test('draft proxy forwards bounded optional wizard metadata unchanged with its security headers', async () => fixture(async origin => {
  for (const payload of [{ name: 'Legacy draft' }, ...[0, 1, 2, 3].flatMap(wizardStep => ['ai', 'manual', null].map(wizardMethod => ({ name: 'Draft', wizardStep, wizardMethod })))]) {
    const body = JSON.stringify({ revision: '2', payload });
    const response = await fetch(`${origin}/api/v1/classrooms/drafts/${id}`, { method: 'PATCH', body,
      headers: { 'Content-Type': 'application/json', Cookie: 'foxmind_session=original', Origin: 'http://web.test', 'X-CSRF-Token': 'binding' } });
    assert.equal(response.status, 200);
    const result = await response.json();
    assert.equal(result.body, body);
    assert.equal(result.headers.cookie, 'foxmind_session=original');
    assert.equal(result.headers.origin, 'http://web.test');
    assert.equal(result.headers['x-csrf-token'], 'binding');
  }
}));

test('draft proxy rejects invalid wizard metadata and extra fields before upstream', async () => {
  let calls = 0;
  await fixture(async origin => {
    const invalid = [
      ...[-1, 4, 1.5, '2', null, true].map(wizardStep => ({ wizardStep })),
      ...['AUTO', '', 1, false, {}].map(wizardMethod => ({ wizardMethod })),
      { wizardStep: 1, wizardMethod: 'ai', ownerId: 'foreign' },
      { wizardStep: 1, wizardMethod: 'manual', units: [{ name: 'Unit', topics: [], extra: 'invalid' }] },
    ];
    for (const payload of invalid) {
      const response = await fetch(`${origin}/api/v1/classrooms/drafts/${id}`, { method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision: '2', payload }) });
      assert.equal(response.status, 400);
    }
  }, (_req, res) => { calls++; res.end('{}'); });
  assert.equal(calls, 0);
});
