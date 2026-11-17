import test from 'node:test';
import assert from 'node:assert/strict';
import { withGradingFixture } from './p8-grading-helpers.mjs';
import { ClassroomCore } from '../.build/api/apps/api/src/modules/classrooms/access/infrastructure/context.js';

const timeout = (promise, ms, message) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))]);
test('two reads share classroom lock; a writer waits, then membership revocation is enforced', { timeout: 120000 }, async () => {
  await withGradingFixture(async f => {
    const core = new ClassroomCore(f.ports);
    let release; const held = new Promise(resolve => { release = resolve; });
    let entered = 0, bothEntered; const enteredPromise = new Promise(resolve => { bothEntered = resolve; });
    const read = () => core.run(f.T, false, async (tx, actor) => {
      await core.classroom(tx, actor, f.room);
      if (++entered === 2) bothEntered();
      await held;
    });
    const reads = [read(), read()]; let writer;
    try {
      await timeout(enteredPromise, 2500, 'two readers did not acquire shared locks together');
      const revision = (await f.pool.query('SELECT revision::text AS revision FROM classrooms WHERE id=$1', [f.room])).rows[0].revision;
      let finished = false;
      writer = f.service.changeWall(f.T, f.room, { revision, operation: { action: 'publish', body: 'synthetic writer' } }).finally(() => { finished = true; });
      const waitStart = Date.now();
      while (Date.now() - waitStart < 1500) {
        const waiting = await f.pool.query(`SELECT count(*)::int AS n FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE '%FROM classrooms c JOIN users%'`);
        if (waiting.rows[0].n > 0) break;
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      assert.equal(finished, false, 'writer must not commit while readers hold locks');
      const waiting = await f.pool.query(`SELECT count(*)::int AS n FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE '%FROM classrooms c JOIN users%'`);
      assert.ok(waiting.rows[0].n > 0, 'writer must be observed waiting on a database lock');
    } finally { release(); await Promise.allSettled(reads); }
    await timeout(writer, 2500, 'writer did not complete after reader release');
    await f.pool.query(`UPDATE membership_periods SET ended_at=now(),end_reason='REMOVED',ended_by_id=$2,updated_at=now()
      WHERE enrollment_id IN (SELECT id FROM enrollments WHERE classroom_id=$1 AND student_id=$3)`, [f.room, f.teacher, f.student]);
    await assert.rejects(() => f.service.getProgress(f.S, f.room), { code: 'FORBIDDEN' });
  });
});
