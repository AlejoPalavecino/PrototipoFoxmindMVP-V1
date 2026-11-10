import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createClassroomsHandler } from '../.build/api/apps/api/src/bootstrap/academic-http.js';
const id = 'a1111111-1111-4111-8111-111111111111';
test('grading ingress admits exact teacher operations without student capabilities or forged scores', async () => {
  const calls = [], service = Object.fromEntries(['getAttemptGrading', 'saveAttemptGrading', 'activityAttempt'].map(name => [name, async (...args) => { calls.push([name, ...args.slice(1)]); return {}; }]));
  const handler = createClassroomsHandler(service, { admit: async (req, write) => { if (write && req.headers['x-fixture-csrf'] !== 'valid') throw Error('deny'); } });
  const server = createServer((req, res) => handler(req, res, () => { res.statusCode = 404; res.end(); }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const root = `http://127.0.0.1:${server.address().port}/classrooms/${id}/attempts/${id}`;
  const body = { revision: '1', overallGrade: null, overallFeedback: null, questions: [{ questionId: id, points: '0', feedback: 'Private' }] };
  const post = (data, headers = {}) => fetch(root + '/grading', { method: 'POST', headers: { 'content-type': 'application/json', 'x-fixture-csrf': 'valid', ...headers }, body: JSON.stringify(data) });
  try {
    assert.equal((await fetch(root + '/grading')).status, 200); assert.deepEqual(calls.at(-1), ['getAttemptGrading', id, id]);
    assert.equal((await post(body)).status, 200); assert.deepEqual(calls.at(-1), ['saveAttemptGrading', id, id, body]);
    const n = calls.length;
    for (const invalid of [{ ...body, publish: true }, { ...body, overallGrade: '8.345' }, { ...body, questions: [{ ...body.questions[0], earned: '6' }] }])
      assert.equal((await post(invalid)).status, 400);
    assert.equal((await post(body, { 'x-attempt-editor': 'a'.repeat(43) })).status, 400);
    assert.equal((await post(body, { 'x-fixture-csrf': 'invalid' })).status, 403);
    assert.equal((await fetch(root + '/grading?student=other')).status, 400); assert.equal(calls.length, n);
    assert.equal((await fetch(root + '/history')).status, 200); assert.deepEqual(calls.at(-1), ['activityAttempt', id, id]);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
