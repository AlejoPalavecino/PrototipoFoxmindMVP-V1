import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createClassroomsHandler } from '../.build/api/apps/api/src/bootstrap/academic-http.js';
const id = 'a1111111-1111-4111-8111-111111111111';

test('progress ingress has only admitted, exact read-only routes and preserves existing summary/grading reads', async () => {
  const calls = [], service = Object.fromEntries(['getProgress', 'getStudentProgress', 'studentSummary', 'getAttemptGrading'].map(name => [name,
    async (...args) => { calls.push([name, ...args.slice(1)]); return {}; }]));
  const handler = createClassroomsHandler(service, { admit: async req => { if (req.headers['x-fixture-deny']) throw Error('deny'); } });
  const server = createServer((req, res) => handler(req, res, () => { res.statusCode = 404; res.end(); }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const root = `http://127.0.0.1:${server.address().port}/classrooms/${id}`;
  try {
    for (const suffix of ['/progress', `/members/${id}/progress`]) {
      const response = await fetch(root + suffix); assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.deepEqual(calls.at(-1), suffix === '/progress' ? ['getProgress', id] : ['getStudentProgress', id, id]);
      const count = calls.length;
      assert.equal((await fetch(root + suffix, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 400);
      assert.equal((await fetch(root + suffix + '?studentId=' + id)).status, 400);
      assert.equal((await fetch(root + suffix, { headers: { 'x-attempt-editor': 'x' } })).status, 400);
      assert.equal((await fetch(root + suffix, { headers: { 'x-fixture-deny': '1' } })).status, 403);
      assert.equal(calls.length, count);
    }
    assert.equal((await fetch(root + `/members/${id}`)).status, 200); assert.deepEqual(calls.at(-1), ['studentSummary', id, id]);
    assert.equal((await fetch(root + `/attempts/${id}/grading`)).status, 200); assert.deepEqual(calls.at(-1), ['getAttemptGrading', id, id]);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
