import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { proxyClassroomRequest } from '../apps/web/src/application/server/classroom-proxy.ts';
const id = 'a1111111-1111-4111-8111-111111111111';

test('publication proxy preserves session CSRF confirmation and rejects grade injection, false consent and capabilities', async () => {
  const calls = [], upstream = createServer(async (req, res) => { const chunks = []; for await (const chunk of req) chunks.push(chunk);
    calls.push({ path: req.url, headers: req.headers, body: Buffer.concat(chunks).toString() }); res.setHeader('content-type', 'application/json'); res.end('{}'); });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const web = createServer((req, res) => void proxyClassroomRequest(req, res, `http://127.0.0.1:${upstream.address().port}`));
  await new Promise(resolve => web.listen(0, '127.0.0.1', resolve));
  const root = `http://127.0.0.1:${web.address().port}/api/v1/classrooms/${id}/attempts/${id}`;
  const body = { revision: '1', confirm: true }, post = (data, headers = {}) => fetch(root + '/publish-grade', { method: 'POST', headers: { 'content-type': 'application/json', cookie: 'fixture=session', 'x-csrf-token': 'fixture', ...headers }, body: JSON.stringify(data) });
  try {
    assert.equal((await post(body)).status, 200); assert.equal(calls.at(-1).body, JSON.stringify(body)); assert.equal(calls.at(-1).headers['x-csrf-token'], 'fixture');
    assert.equal(calls.at(-1).headers.cookie, 'fixture=session'); assert.equal((await fetch(root + '/result')).status, 200);
    const n = calls.length;
    for (const invalid of [{ ...body, confirm: false }, { revision: '1' }, { ...body, finalGrade: '10' }, { ...body, revision: '1e0' }]) assert.equal((await post(invalid)).status, 400);
    assert.equal((await post(body, { 'x-attempt-editor': 'a'.repeat(43) })).status, 400);
    assert.equal((await fetch(root + '/result?private=true')).status, 400); assert.equal(calls.length, n);
  } finally { web.closeAllConnections(); upstream.closeAllConnections(); await Promise.all([new Promise(resolve => web.close(resolve)), new Promise(resolve => upstream.close(resolve))]); }
});
