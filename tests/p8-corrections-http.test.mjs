import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createClassroomsHandler } from '../.build/api/apps/api/src/classrooms/http.js';
const id = 'a1111111-1111-4111-8111-111111111111';

test('correction ingress permits only exact confirmed final/reason/revision with admitted CSRF; historical audit is GET', async () => {
  const calls = [], service = Object.fromEntries(['correctPublishedGrade', 'getGradeCorrections', 'publishAttemptGrade', 'getAttemptGrading'].map(name => [name, async (...args) => { calls.push([name, ...args.slice(1)]); return {}; }]));
  const handler = createClassroomsHandler(service, { admit: async (req, write) => { if (write && req.headers['x-fixture-csrf'] !== 'valid') throw Error('deny'); } });
  const server = createServer((req, res) => handler(req, res, () => { res.statusCode = 404; res.end(); }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const root = `http://127.0.0.1:${server.address().port}/classrooms/${id}/attempts/${id}`;
  const body = { revision: '1', newGrade: '0', reason: '  Reason  ', confirm: true };
  const post = (data, headers = {}) => fetch(root + '/grade-corrections', { method: 'POST', headers: { 'content-type': 'application/json', 'x-fixture-csrf': 'valid', ...headers }, body: JSON.stringify(data) });
  try {
    assert.equal((await fetch(root + '/grade-corrections')).status, 200); assert.deepEqual(calls.at(-1), ['getGradeCorrections', id, id]);
    assert.equal((await post(body)).status, 200); assert.deepEqual(calls.at(-1), ['correctPublishedGrade', id, id, { ...body, newGrade: '0.00', reason: 'Reason' }]);
    const count = calls.length;
    for (const delta of [{ reason: ' ' }, { reason: 'x'.repeat(5001) }, { newGrade: '10.01' }, { newGrade: '8.345' }, { newGrade: 8 },
      { confirm: false }, { revision: 1 }, { actorId: id }, { previousGrade: '1' }, { correctedAt: 'now' }]) assert.equal((await post({ ...body, ...delta })).status, 400);
    assert.equal((await post(body, { 'x-attempt-epoch': '1' })).status, 400);
    assert.equal((await post(body, { 'x-fixture-csrf': 'bad' })).status, 403);
    assert.equal((await fetch(root + '/grade-corrections?actor=other')).status, 400); assert.equal(calls.length, count);
    assert.equal((await fetch(root + '/grading')).status, 200);
    assert.equal((await fetch(root + '/publish-grade', { method: 'POST', headers: { 'content-type': 'application/json', 'x-fixture-csrf': 'valid' }, body: JSON.stringify({ revision: '1', confirm: true }) })).status, 200);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
