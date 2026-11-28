import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { proxyClassroomRequest } from '../apps/web/src/application/server/classroom-proxy.ts';
const id = 'a1111111-1111-4111-8111-111111111111';

test('history proxy admits exact new routes, forwards reopen bodies to the API and preserves existing WALL/TP contract', async () => {
  const calls = [], upstream = createServer(async (req, res) => {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    calls.push({ path: req.url, body: Buffer.concat(chunks).toString(), headers: req.headers }); res.setHeader('content-type', 'application/json'); res.end('{}');
  });
  await new Promise(r => upstream.listen(0, '127.0.0.1', r));
  const web = createServer((req, res) => void proxyClassroomRequest(req, res, `http://127.0.0.1:${upstream.address().port}`));
  await new Promise(r => web.listen(0, '127.0.0.1', r));
  const root = `http://127.0.0.1:${web.address().port}/api/v1/classrooms/${id}`;
  const body = { revision: '1', studentId: id, deadline: null, confirm: true };
  const post = (path, data, h = {}) => fetch(root + path, { method: 'POST', headers: { 'content-type': 'application/json', ...h }, body: JSON.stringify(data) });
  try {
    for (const path of [`/activities/${id}/history`, `/activities/${id}/history-submissions`, `/attempts/${id}/history`, `/activities/${id}/submissions`, `/attempts/${id}/receipt`])
      assert.equal((await fetch(root + path)).status, 200);
    assert.equal((await post(`/activities/${id}/reopen`, body)).status, 200); assert.equal(calls.at(-1).body, JSON.stringify(body));
    const n = calls.length;
    for (const data of [{ ...body, confirm: false }, { ...body, studentId: 'bad' }, { ...body, deadline: { local: '2030-01-01T18:00', offsetMinutes: 'bad' } }, { ...body, count: 4 }])
      assert.equal((await post(`/activities/${id}/reopen`, data)).status, 200);
    // Reopening never carries attempt headers, so the proxy still rejects them.
    assert.equal((await post(`/activities/${id}/reopen`, body, { 'x-attempt-editor': 'a'.repeat(43) })).status, 400); assert.equal(calls.length, n + 4);
    const wall = { revision: '1', operation: { action: 'publish', body: 'Existing notice' } };
    assert.equal((await post('/wall', wall)).status, 200); assert.equal(calls.at(-1).body, JSON.stringify(wall));
    assert.equal((await fetch(`${root}/history`, { headers: { 'x-attempt-editor': 'a'.repeat(43), 'x-attempt-epoch': '2' } })).status, 200);
    assert.equal(calls.at(-1).headers['x-attempt-editor'], undefined);
  } finally { web.closeAllConnections(); upstream.closeAllConnections(); await Promise.all([new Promise(r => web.close(r)), new Promise(r => upstream.close(r))]); }
});
