import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { proxyClassroomRequest } from '../apps/web/src/application/server/classroom-proxy.ts';
const id = 'a1111111-1111-4111-8111-111111111111';

test('progress proxy forwards cookies/read-only paths, rejects injected selection/body/editor and preserves prior summary', async () => {
  const calls = [], upstream = createServer((req, res) => { calls.push({ path: req.url, method: req.method, cookie: req.headers.cookie });
    res.setHeader('content-type', 'application/json'); res.end('{}'); });
  await new Promise(resolve => upstream.listen(0, '127.0.0.1', resolve));
  const server = createServer((req, res) => void proxyClassroomRequest(req, res, `http://127.0.0.1:${upstream.address().port}`));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const root = `http://127.0.0.1:${server.address().port}/api/v1/classrooms/${id}`;
  try {
    for (const suffix of ['/progress', `/members/${id}/progress`]) {
      assert.equal((await fetch(root + suffix, { headers: { cookie: 'fixture=session' } })).status, 200);
      assert.deepEqual(calls.at(-1), { path: `/api/v1/classrooms/${id}${suffix}`, method: 'GET', cookie: 'fixture=session' });
      const count = calls.length;
      assert.equal((await fetch(root + suffix + '?studentId=' + id)).status, 400);
      assert.equal((await fetch(root + suffix, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 405);
      assert.equal((await fetch(root + suffix, { headers: { 'x-attempt-editor': 'a'.repeat(43) } })).status, 400);
      assert.equal(calls.length, count);
    }
    assert.equal((await fetch(root + `/members/${id}`)).status, 200); assert.equal(calls.at(-1).path, `/api/v1/classrooms/${id}/members/${id}`);
  } finally { server.closeAllConnections(); upstream.closeAllConnections(); await Promise.all([
    new Promise(resolve => server.close(resolve)), new Promise(resolve => upstream.close(resolve))]); }
});
