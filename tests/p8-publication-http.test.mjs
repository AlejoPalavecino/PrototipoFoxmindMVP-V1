import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createClassroomsHandler } from '../.build/api/apps/api/src/classrooms/http.js';
const id = 'a1111111-1111-4111-8111-111111111111';

test('publication ingress accepts only explicit revision confirmation and result reads without editor authority', async () => {
  const calls = [], service = Object.fromEntries(['publishAttemptGrade', 'getAttemptResult', 'getAttemptGrading'].map(name => [name, async (...args) => { calls.push([name, ...args.slice(1)]); return {}; }]));
  const handler = createClassroomsHandler(service, { admit: async (req, write) => { if (write && req.headers['x-fixture-csrf'] !== 'valid') throw Error('deny'); } });
  const server = createServer((req, res) => handler(req, res, () => { res.statusCode = 404; res.end(); }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const root = `http://127.0.0.1:${server.address().port}/classrooms/${id}/attempts/${id}`;
  const post = (body, headers = {}) => fetch(root + '/publish-grade', { method: 'POST', headers: { 'content-type': 'application/json', 'x-fixture-csrf': 'valid', ...headers }, body: JSON.stringify(body) });
  try {
    assert.equal((await fetch(root + '/result')).status, 200); assert.deepEqual(calls.at(-1), ['getAttemptResult', id, id]);
    assert.equal((await post({ revision: '1', confirm: true })).status, 200); assert.deepEqual(calls.at(-1), ['publishAttemptGrade', id, id, { revision: '1', confirm: true }]);
    const n = calls.length;
    for (const invalid of [{ revision: '1', confirm: false }, { revision: '1' }, { revision: '1', confirm: true, grade: '10' }, { revision: 1, confirm: true }]) assert.equal((await post(invalid)).status, 400);
    assert.equal((await post({ revision: '1', confirm: true }, { 'x-attempt-epoch': '1' })).status, 400);
    assert.equal((await post({ revision: '1', confirm: true }, { 'x-fixture-csrf': 'bad' })).status, 403);
    assert.equal((await fetch(root + '/result', { headers: { 'x-attempt-editor': 'x' } })).status, 400);
    assert.equal((await fetch(root + '/result?grade=other')).status, 400); assert.equal(calls.length, n);
    assert.equal((await fetch(root + '/grading')).status, 200);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
