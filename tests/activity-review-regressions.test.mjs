import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAiDatabase, rollbackCase } from './classroom-ai-database.test.mjs';
import { fixture } from './activity-ai-fixture.test.mjs';
const ai = () => import('../apps/api/src/classrooms/activity-ai/index.ts');

test('B1 a failed unapplied generation retains history without preventing deletion of an otherwise unused unit', { timeout: 120000 }, async () => {
  const { ActivityAiService, ActivityAiWorker } = await ai();
  await withAiDatabase(async ({ pool }) => rollbackCase(pool, async local => {
    const f = await fixture(local), service = new ActivityAiService(f.options);
    f.options.provider.generateActivity = async () => ({ json: {}, inputTokens: 20, outputTokens: 30 });
    const { view } = await service.start(f.T, f.room, f.start); await new ActivityAiWorker(f.options).runOnce();
    assert.equal((await service.get(f.T, f.room, view.id)).state, 'FAILED');
    const snapshot = (await local.pool.query('SELECT curriculum_snapshot FROM activity_ai_generations WHERE id=$1', [view.id])).rows[0].curriculum_snapshot;
    for (const id of f.topicIds) await f.seedPlan({ action: 'deleteTopic', id, confirm: true });
    await f.seedPlan({ action: 'deleteUnit', id: f.unitId, confirm: true });
    assert.equal((await f.classrooms.detail(f.T, f.room)).units.length, 0);
    const retained = (await local.pool.query('SELECT curriculum_snapshot FROM activity_ai_generations WHERE id=$1', [view.id])).rows;
    assert.equal(retained.length, 1); assert.deepEqual(retained[0].curriculum_snapshot, snapshot);
    assert.equal((await service.get(f.T, f.room, view.id)).state, 'STALE');
  }));
});

test('B2 idempotent start/regenerate replays invalidate changed snapshots without creating or dispatching another job', { timeout: 120000 }, async t => {
  const { ActivityAiService, ActivityAiWorker } = await ai();
  await withAiDatabase(async ({ pool }) => {
    for (const action of ['start', 'regenerate']) await t.test(action, () => rollbackCase(pool, async local => {
      const f = await fixture(local), service = new ActivityAiService(f.options), first = await service.start(f.T, f.room, f.start);
      await new ActivityAiWorker(f.options).runOnce();
      let original = first, command = f.start;
      if (action === 'regenerate') {
        command = { ...f.start, requestId: randomUUID(), acknowledgePossibleCharge: false };
        original = await service.regenerate(f.T, f.room, first.view.id, command); await new ActivityAiWorker(f.options).runOnce();
      }
      assert.equal((await service.get(f.T, f.room, original.view.id)).state, 'READY');
      const before = await local.pool.query('SELECT count(*)::int n FROM activity_ai_generations');
      const calls = [...f.calls]; await f.seedPlan({ action: 'renameTopic', id: f.topicIds[0], name: 'Changed curriculum after READY' });
      const replay = action === 'start' ? await service.start(f.T, f.room, command)
        : await service.regenerate(f.T, f.room, first.view.id, command);
      assert.equal(replay.created, false); assert.equal(replay.view.id, original.view.id);
      assert.equal(replay.view.state, 'STALE'); assert.equal(replay.view.proposal, null);
      assert.deepEqual(await local.pool.query('SELECT count(*)::int n FROM activity_ai_generations').then(x => x.rows), before.rows);
      assert.deepEqual(f.calls, calls);
    }));
  });
});

test('B3 published multi-topic history and teacher-submission DTOs retain every secondary association', { timeout: 120000 }, async () => {
  await withAiDatabase(async ({ pool }) => rollbackCase(pool, async local => {
    const f = await fixture(local);
    await f.seedPlan({ action: 'addTopic', unitId: f.unitId, name: 'Secondary topic' });
    const topicIds = (await f.classrooms.detail(f.T, f.room)).units[0].topics.map(x => x.id);
    const change = async operation => f.classrooms.changeActivities(f.T, f.room, { revision: await f.revision(), operation });
    const { id } = await change({ action: 'create', type: 'ASSIGNMENT' });
    await change({ action: 'save', id, payload: { title: 'Two topics', unitId: f.unitId, topicIds, instructions: 'Connect concepts.',
      attachmentRequired: false, instructionFileIds: [], materialIds: [], questions: [], deadline: null, allowLate: false } });
    await change({ action: 'publish', id });
    const history = await f.classrooms.activityHistory(f.S, f.room, id), submissions = await f.classrooms.activitySubmissions(f.T, f.room, id);
    assert.deepEqual({ history: history.activity.topicIds, submissions: submissions.activity.topicIds }, { history: topicIds, submissions: topicIds });
  }));
});
