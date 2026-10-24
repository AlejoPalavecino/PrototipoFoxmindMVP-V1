import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { proxyClassroomRequest } from '../apps/web/src/lib/classroom-proxy.ts';

const id = '11111111-1111-4111-8111-111111111111';
const job = '22222222-2222-4222-8222-222222222222';
const requestId = '33333333-3333-4333-8333-333333333333';
const base = `/api/v1/classrooms/drafts/${id}/curriculum-extractions`;
const units = [{ name: 'Luz', topics: [{ name: 'Exposición' }] }];
async function fixture(run) {
  const calls = [];
  const api = createServer(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    calls.push({ path: req.url, method: req.method, headers: req.headers, body: Buffer.concat(chunks).toString() });
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"forwarded":true}');
  });
  await new Promise(resolve => api.listen(0, '127.0.0.1', resolve));
  const web = createServer((req, res) => void proxyClassroomRequest(req, res, `http://127.0.0.1:${api.address().port}`));
  await new Promise(resolve => web.listen(0, '127.0.0.1', resolve));
  const send = (path, method, body) => fetch(`http://127.0.0.1:${web.address().port}${path}`, { method,
    headers: { 'Content-Type': 'application/json', cookie: 'foxmind_session=synthetic', origin: 'http://web.test', 'x-csrf-token': 'synthetic-csrf' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  try { await run({ send, calls }); }
  finally { for (const server of [web, api]) await new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }); }
}

test('C4 Next proxy forwards start/get/retry/apply with exact paths, reviewed objects and session guards', async () => fixture(async ({ send, calls }) => {
  for (const [path, method, body] of [[base, 'POST', { revision: '1', planFileId: id }],
    [`${base}/${job}`, 'GET'], [`${base}/${job}/retry`, 'POST', { revision: '1', requestId }],
    [`${base}/${job}/apply`, 'POST', { revision: '1', requestId, units }]]) {
    const response = await send(path, method, body);
    assert.equal(response.status, 200, `${method} ${path}`);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const call = calls.at(-1); assert.equal(call.path, path); assert.equal(call.method, method);
    assert.equal(call.headers.cookie, 'foxmind_session=synthetic'); assert.equal(call.headers['x-csrf-token'], 'synthetic-csrf');
    if (body) assert.deepEqual(JSON.parse(call.body), body);
  }
  assert.equal(calls.length, 4);
}));

test('C4 extraction proxy rejects extra authority, coerced scalars and malformed curriculum before forwarding', async () => fixture(async ({ send, calls }) => {
  for (const [path, body] of [[base, { revision: '1', planFileId: id, ownerId: id }],
    [base, { revision: 1, planFileId: id }], [base, { revision: '1', planFileId: false }],
    [`${base}/${job}/retry`, { revision: '1', requestId: true }],
    [`${base}/${job}/apply`, { revision: '1', requestId, units, confirm: true }],
    [`${base}/${job}/apply`, { revision: '1', requestId, units: {} }],
    [`${base}/${job}/apply`, { revision: '1', requestId, units: [{ name: 'U', topics: [{ name: true }] }] }],
    [`${base}/${job}/apply`, { revision: '1', requestId, units: [{ name: 'U', topics: [], action: 'publish' }] }]]) {
    assert.equal((await send(path, 'POST', body)).status, 400);
  }
  assert.equal(calls.length, 0);
}));

test('C4 extraction proxy keeps allowed methods/query boundaries and existing strict boolean operations', async () => fixture(async ({ send, calls }) => {
  assert.equal((await send(base, 'DELETE')).status, 405);
  assert.equal((await send(`${base}/${job}?actor=${id}`, 'GET')).status, 400);
  const archive = `/api/v1/classrooms/${id}/archive`;
  assert.equal((await send(archive, 'POST', { revision: '1', archived: true })).status, 200);
  assert.equal((await send(archive, 'POST', { revision: '1', archived: 'true' })).status, 400);
  assert.equal((await send(archive, 'POST', { revision: '1', archived: true, ownerId: id })).status, 400);
  assert.equal(calls.length, 1);
}));
