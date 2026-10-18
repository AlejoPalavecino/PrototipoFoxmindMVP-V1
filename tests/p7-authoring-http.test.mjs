import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

test('authoring HTTP routes preserve ingress admission and strict mutation discriminator', async () => {
  const { createClassroomsHandler } = await import('../.build/api/apps/api/src/classrooms/http.js');
  const calls = [], admitted = [];
  const service = Object.fromEntries(['listActivities', 'activityDetail', 'activityDeadlineChoices', 'changeActivities', 'listMaterials', 'changePlan'].map(name => [name, async (...args) => {
    calls.push([name, ...args.slice(1)]); return { ok: true };
  }]));
  const handler = createClassroomsHandler(service, { admit: async (req, write) => { admitted.push(write); if (write && req.headers['x-fixture-csrf'] !== 'valid') throw new Error('denied'); } });
  const server = createServer((req, res) => void handler(req, res, () => { res.statusCode = 404; res.end(); }));
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body, csrf = true) => fetch(origin + path, { method: 'POST', headers: { 'content-type': 'application/json', ...(csrf ? { 'x-fixture-csrf': 'valid' } : {}) }, body: JSON.stringify(body) });
  try {
    const list = await fetch(origin + '/classrooms/room/activities');
    assert.equal(list.status, 200); assert.equal(list.headers.get('cache-control'), 'no-store');
    await fetch(origin + '/classrooms/room/activities/activity/preview');
    assert.deepEqual(calls.at(-1), ['activityDetail', 'room', 'activity', true]);
    assert.equal((await post('/classrooms/room/activities/deadline', { local: '2026-11-01T01:30' })).status, 200);
    const valid = { revision: '1', operation: { action: 'create', type: 'ASSIGNMENT' } };
    assert.equal((await post('/classrooms/room/activities', valid)).status, 200);
    const count = calls.length;
    for (const body of [{ ...valid, owner: 'forged' }, { revision: '1', operation: { action: 'create', type: 'ASSIGNMENT', owner: 'forged' } },
      { revision: '1', operation: { action: 'unknown' } }, { revision: '1', operation: { action: 'publish' } }])
      assert.equal((await post('/classrooms/room/activities', body)).status, 400);
    assert.equal((await post('/classrooms/room/activities', valid, false)).status, 403);
    assert.equal(calls.length, count);
    assert.ok(admitted.includes(true)); assert.ok(admitted.includes(false));
    // Existing route remains usable through the shared handler.
    assert.equal((await post('/classrooms/room/plan', { revision: '1', operation: { action: 'addUnit', name: 'Prior behavior' } })).status, 200);
  } finally { server.closeAllConnections(); await new Promise(r => server.close(r)); }
});
