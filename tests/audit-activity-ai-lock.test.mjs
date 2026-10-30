import test from 'node:test';
import assert from 'node:assert/strict';
import { withAiDatabase } from './classroom-ai-database.test.mjs';
import { fixture } from './activity-ai-fixture.test.mjs';
import { ActivityAiService, ActivityAiWorker } from '../.build/api/apps/api/src/classrooms/activity-ai/index.js';

test('two authenticated READY generation list reads complete concurrently without lock upgrade deadlock', { timeout: 120000 }, async () => {
  await withAiDatabase(async local => {
    const f = await fixture(local), service = new ActivityAiService(f.options);
    const { view } = await service.start(f.T, f.room, f.start);
    assert.equal(await new ActivityAiWorker(f.options).runOnce(), true);
    assert.equal((await service.get(f.T, f.room, view.id)).state, 'READY');
    const original = f.classrooms.ports.database, authenticate = f.classrooms.ports.authenticate; let entered = 0, release;
    const authModes = []; f.classrooms.ports.authenticate = async (tx, req, write) => { authModes.push(write); return authenticate(tx, req, write); };
    const both = new Promise(resolve => { release = resolve; });
    f.classrooms.ports.database = { $transaction: (operation, options) => original.$transaction(raw => { let sawRoom = false; return operation({
      $queryRawUnsafe: async (sql, ...args) => {
        const rows = await raw.$queryRawUnsafe(sql, ...args);
        if (!sawRoom && /FROM classrooms c JOIN users u ON u.id=c.teacher_id WHERE c.id=\$1::uuid FOR (?:SHARE|UPDATE) OF c/i.test(sql)) {
          sawRoom = true; entered++;
          if (/FOR SHARE OF c/i.test(sql)) { if (entered === 2) release(); await Promise.race([both, new Promise((_, reject) => setTimeout(() => reject(new Error('read barrier timeout')), 3000))]); }
        }
        return rows;
      },
    }); }, options) };
    try {
      const results = await Promise.allSettled([service.list(f.T, f.room), service.list(f.T, f.room)]);
      assert.equal(entered, 2, 'both transactions reached classroom authorization');
      assert.ok(authModes.length >= 4 && authModes.every(write => write === false), 'GET remains read-authenticated');
      for (const result of results) {
        assert.equal(result.status, 'fulfilled', String(result.reason));
        assert.equal(result.value.jobs[0].state, 'READY');
        assert.deepEqual(result.value.jobs[0].proposal, f.proposal);
      }
    } finally { f.classrooms.ports.database = original; f.classrooms.ports.authenticate = authenticate; }
  });
});
