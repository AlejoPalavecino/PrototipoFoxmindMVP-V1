import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { createClassroomsHandler } from '../.build/api/apps/api/src/bootstrap/academic-http.js';

const room = 'a1111111-1111-4111-8111-111111111111';
const student = 'b2222222-2222-4222-8222-222222222222';
const attempt = 'c3333333-3333-4333-8333-333333333333';
const list = '/teacher-support';
const record = `/${room}/members/${student}/support`;
const evidence = `${record}/evidence/${attempt}`;

test('teacher support transport applies read admission, exact query parameters and no-store', async () => {
  const calls = [];
  const operations = Object.fromEntries(['listTeacherSupport', 'getTeacherSupport', 'getTeacherSupportEvidence'].map(name =>
    [name, async (_, ...input) => { calls.push([name, ...input]); return { name }; }]));
  const handler = createClassroomsHandler(operations, { admit: async req => {
    if (req.headers['x-forbidden']) throw Error('deny');
  } });
  const server = createServer((req, res) => handler(req, res, () => { res.statusCode = 404; res.end(); }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}/classrooms`;
  try {
    for (const [suffix, expected] of [
      [list, ['listTeacherSupport', { classroomId: null, page: 1, roster: false }]],
      [`${list}?classroomId=${room}&page=2&roster=true`, ['listTeacherSupport', { classroomId: room, page: 2, roster: true }]],
      [record, ['getTeacherSupport', room, student]],
      [evidence, ['getTeacherSupportEvidence', room, student, attempt]],
    ]) {
      const response = await fetch(base + suffix);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.deepEqual(calls.at(-1), expected);
    }
    for (const suffix of [`${list}?roster=true`, `${list}?page=0`, `${list}?page=1&page=2`,
      `${list}?sort=bogus`, `${record}?page=2`, `${record}/evidence/bogus`]) {
      assert.equal((await fetch(base + suffix)).status, 400, suffix);
    }
    assert.equal((await fetch(base + evidence, { headers: { 'x-attempt-editor': 'x' } })).status, 400);
    assert.equal((await fetch(base + evidence, { headers: { 'x-forbidden': '1' } })).status, 403);
    assert.equal((await fetch(base + record, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 400);
    assert.equal(calls.length, 4);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
