import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createClassroomsHandler } from '../.build/api/apps/api/src/classrooms/http.js';
const id = 'a1111111-1111-4111-8111-111111111111';

test('history/reopening public ingress uses existing admission and exact bodies, preserving legacy TP routes', async () => {
  const calls = [];
  const service = Object.fromEntries(['activityHistory', 'activitySubmissions', 'activityAttempt', 'reopenActivity', 'assignmentSubmissions', 'assignmentSubmission'].map(name =>
    [name, async (...args) => { calls.push([name, ...args.slice(1)]); return { ok: true }; }]));
  const handler = createClassroomsHandler(service, { admit: async (req, write) => { if (write && req.headers['x-fixture-csrf'] !== 'valid') throw Error('deny'); } });
  const server = createServer((req, res) => handler(req, res, () => { res.statusCode = 404; res.end(); }));
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const root = `http://127.0.0.1:${server.address().port}/classrooms/${id}`;
  const body = { revision: '1', studentId: id, deadline: null, confirm: true };
  const post = (data, extra = {}) => fetch(`${root}/activities/${id}/reopen`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-fixture-csrf': 'valid', ...extra }, body: JSON.stringify(data) });
  try {
    for (const [path, name] of [[`activities/${id}/history`, 'activityHistory'], [`activities/${id}/history-submissions`, 'activitySubmissions'],
      [`attempts/${id}/history`, 'activityAttempt'], [`activities/${id}/submissions`, 'assignmentSubmissions'], [`attempts/${id}/receipt`, 'assignmentSubmission']]) {
      assert.equal((await fetch(`${root}/${path}`)).status, 200); assert.deepEqual(calls.at(-1), [name, id, id]);
    }
    assert.equal((await post(body)).status, 200); assert.deepEqual(calls.at(-1), ['reopenActivity', id, id, body]);
    const n = calls.length;
    assert.equal((await post({ ...body, ownerId: id })).status, 400);
    assert.equal((await post(body, { 'x-attempt-editor': 'a'.repeat(43), 'x-attempt-epoch': '1' })).status, 400);
    assert.equal((await post(body, { 'x-fixture-csrf': 'invalid' })).status, 403);
    assert.equal((await fetch(`${root}/activities/${id}/history?owner=other`)).status, 400); assert.equal(calls.length, n);
  } finally { server.closeAllConnections(); await new Promise(r => server.close(r)); }
});
