import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { proxyClassroomRequest } from '../apps/web/src/application/server/classroom-proxy.ts';

const room = randomUUID(), job = randomUUID(), base = `/api/v1/classrooms/${room}/activity-generations`;
const start = () => ({ revision: '1', requestId: randomUUID(), type: 'ASSIGNMENT', unitId: randomUUID(), topicIds: [randomUUID()], sourceIds: [],
  objective: 'Comparar conceptos enseñados', groupLevel: '', difficulty: 'BASIC', durationMinutes: 40,
  context: 'La exposición es luz acumulada durante un intervalo.', counts: { assignment: 1, development: 0, singleChoice: 0, multipleChoice: 0 }, acknowledgedWarnings: [] });
const proposal = { schemaVersion: 'activity-proposal-v1', type: 'ASSIGNMENT', title: 'Actividad', objective: 'Comparar', instructions: 'Resolver.',
  assignmentPrompts: ['Explicar.'], questions: [], evidence: [{ item: 'assignment', index: 0, references: [{ sourceId: 'teacher-context', page: null }] }], warnings: [] };
async function fixture(run) {
  const calls = [], api = createServer(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    calls.push({ path: req.url, method: req.method, headers: req.headers, body: Buffer.concat(chunks).toString() });
    res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":true}');
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

test('A4 proxy forwards all generation routes with same-origin session/CSRF and private no-store response', async () => fixture(async ({ send, calls }) => {
  for (const [path, method, body] of [[base, 'GET'], [`${base}/sources`, 'GET'], [base, 'POST', start()],
    [`${base}/${job}`, 'GET'], [`${base}/${job}/apply`, 'POST', { revision: '1', requestId: randomUUID(), proposal }],
    [`${base}/${job}/regenerate`, 'POST', { ...start(), acknowledgePossibleCharge: true }]]) {
    const response = await send(path, method, body); assert.equal(response.status, 200, `${method} ${path}`);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const call = calls.at(-1); assert.equal(call.path, path); assert.equal(call.method, method);
    assert.equal(call.headers.cookie, 'foxmind_session=synthetic'); assert.equal(call.headers['x-csrf-token'], 'synthetic-csrf');
    if (body) assert.deepEqual(JSON.parse(call.body), body);
  }
  assert.equal(calls.length, 6);
}));

test('A4 invalid generation authority/scalars/counts/apply reaches the API, which owns the rejection (F2)', async () => fixture(async ({ send, calls }) => {
  const valid = start();
  for (const [path, body] of [[base, { ...valid, ownerId: room }], [base, { ...valid, revision: 1 }],
    [base, { ...valid, topicIds: valid.topicIds[0] }], [base, { ...valid, counts: { ...valid.counts, assignment: '1' } }],
    [`${base}/${job}/apply`, { revision: '1', requestId: randomUUID(), proposal, publish: true }],
    [`${base}/${job}/apply`, { revision: '1', requestId: randomUUID(), proposal: null }],
    [`${base}/${job}/regenerate`, { ...valid, acknowledgePossibleCharge: 'true' }]])
    assert.equal((await send(path, 'POST', body)).status, 200);
  assert.equal(calls.length, 7);
}));

test('A4 generation routes reject unsupported methods (query strings are the API\'s, see classroom-query-forwarding)', async () => fixture(async ({ send, calls }) => {
  assert.equal((await send(base, 'DELETE')).status, 405);
  assert.equal(calls.length, 0);
}));
