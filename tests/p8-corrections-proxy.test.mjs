import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { proxyClassroomRequest } from '../apps/web/src/application/server/classroom-proxy.ts';
const id = 'a1111111-1111-4111-8111-111111111111';

test('correction proxy forwards grade/reason/consent to the API without altering old grading/publication transport', async () => {
  const calls = [], upstream = createServer(async (req, res) => { const chunks = []; for await (const chunk of req) chunks.push(chunk);
    calls.push({ path: req.url, headers: req.headers, body: Buffer.concat(chunks).toString() }); res.setHeader('content-type', 'application/json'); res.end('{}'); });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const web = createServer((req, res) => void proxyClassroomRequest(req, res, `http://127.0.0.1:${upstream.address().port}`));
  await new Promise(resolve => web.listen(0, '127.0.0.1', resolve));
  const root = `http://127.0.0.1:${web.address().port}/api/v1/classrooms/${id}/attempts/${id}`;
  const body = { revision: '1', newGrade: '8.35', reason: 'Reason', confirm: true };
  const post = (data, headers = {}, suffix = '/grade-corrections') => fetch(root + suffix, { method: 'POST', headers: { 'content-type': 'application/json', cookie: 'fixture=session', 'x-csrf-token': 'fixture', ...headers }, body: JSON.stringify(data) });
  try {
    assert.equal((await post(body)).status, 200); assert.equal(calls.at(-1).body, JSON.stringify(body));
    assert.equal(calls.at(-1).headers.cookie, 'fixture=session'); assert.equal(calls.at(-1).headers['x-csrf-token'], 'fixture');
    assert.equal((await fetch(root + '/grade-corrections')).status, 200); const count = calls.length;
    for (const delta of [{ reason: ' ' }, { reason: 'x'.repeat(5001) }, { newGrade: '10.01' }, { newGrade: '8.345' }, { newGrade: 8 },
      { confirm: false }, { revision: '1e0' }, { actorId: id }, { previousGrade: '1' }]) assert.equal((await post({ ...body, ...delta })).status, 200);
    assert.equal((await post(body, { 'x-attempt-editor': 'a'.repeat(43) })).status, 400);
    assert.equal(calls.length, count + 9);
    assert.equal((await fetch(root + '/grading')).status, 200);
    assert.equal((await post({ revision: '1', confirm: true }, {}, '/publish-grade')).status, 200);
  } finally { web.closeAllConnections(); upstream.closeAllConnections(); await Promise.all([new Promise(resolve => web.close(resolve)), new Promise(resolve => upstream.close(resolve))]); }
});
