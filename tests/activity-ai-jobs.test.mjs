import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAiDatabase, rollbackCase, transactionDatabase } from './classroom-ai-database.test.mjs';
import { fixture } from './activity-ai-fixture.test.mjs';
const ai = () => Promise.all([import("../apps/api/src/modules/activities/infrastructure/activity-ai/service.ts"),import("../apps/api/src/modules/activities/infrastructure/activity-ai/worker.ts"),import("../apps/api/src/modules/activities/infrastructure/activity-ai/provenance.ts")]).then(([m0,m1,m2]) => Object.freeze({ActivityAiService: m0.ActivityAiService,ActivityAiWorker: m1.ActivityAiWorker,validateActivityGeneration: m2.validateActivityGeneration}));
const deny = (operation, code) => assert.rejects(operation, { code });

test('A3 durable generation start, recovery, access and idempotency are independent of provider I/O', { timeout: 120000 }, async t => {
  const { ActivityAiService } = await ai();
  await withAiDatabase(async ({ pool }) => {
    const scenario = (name, run) => t.test(name, () => rollbackCase(pool, async local => run(await fixture(local))));
    await scenario('start/replay/reopen/list persist one job without provider calls or draft creation', async f => {
      const service = new ActivityAiService(f.options), first = await service.start(f.T, f.room, f.start);
      assert.equal(first.created, true); assert.equal(first.view.state, 'QUEUED'); assert.equal(first.view.proposal, null);
      const second = await new ActivityAiService(f.options).start(f.T, f.room, f.start);
      assert.equal(second.created, false); assert.equal(second.view.id, first.view.id);
      assert.equal((await service.get(f.T, f.room, first.view.id)).id, first.view.id);
      const list = await service.list(f.T, f.room); assert.equal(list.jobs.length, 1); assert.equal(list.jobs[0].id, first.view.id);
      assert.deepEqual(f.calls, []); assert.equal((await f.classrooms.listActivities(f.T, f.room)).activities.length, 0);
      await deny(service.start(f.T, f.room, { ...f.start, objective: 'Changed request under same key' }), 'CONFLICT');
    });
    await scenario('student/foreign/missing room/job deny equally and archived/stale/unverified cannot enqueue', async f => {
      const service = new ActivityAiService(f.options), { view } = await service.start(f.T, f.room, f.start);
      for (const actor of [f.S, f.O]) {
        await deny(service.start(actor, f.room, { ...f.start, requestId: randomUUID() }), 'FORBIDDEN');
        await deny(service.get(actor, f.room, view.id), 'FORBIDDEN'); await deny(service.list(actor, f.room), 'FORBIDDEN');
        await deny(service.sources(actor, f.room), 'FORBIDDEN');
      }
      await deny(service.get(f.O, randomUUID(), randomUUID()), 'FORBIDDEN');
      await deny(service.start(f.T, f.room, { ...f.start, requestId: randomUUID(), revision: '0' }), 'CONFLICT');
      await f.pool.query('UPDATE users SET email_verified_at=NULL WHERE id=$1', [f.teacher]);
      await deny(service.start(f.T, f.room, { ...f.start, requestId: randomUUID() }), 'FORBIDDEN');
      await f.pool.query('UPDATE users SET email_verified_at=now() WHERE id=$1', [f.teacher]);
      await f.pool.query('UPDATE classrooms SET archived_at=now() WHERE id=$1', [f.room]);
      await deny(service.start(f.T, f.room, { ...f.start, requestId: randomUUID() }), 'CONFLICT');
      assert.deepEqual(f.calls, []);
    });
    await scenario('foreign unit and inaccessible source never enqueue or consume', async f => {
      const service = new ActivityAiService(f.options);
      await deny(service.start(f.T, f.room, { ...f.start, unitId: randomUUID() }), 'FORBIDDEN');
      f.state.available = false; await deny(service.start(f.T, f.room, f.start), 'FILE_NOT_READY');
      assert.deepEqual(f.calls, []); assert.equal((await service.list(f.T, f.room)).jobs.length, 0);
    });
  });
});

test('A3 worker runs outside SQL transactions; application creates exactly one private editable draft', { timeout: 120000 }, async () => {
  const { ActivityAiService, ActivityAiWorker } = await ai();
  await withAiDatabase(async ({ pool }) => {
    const active = { count: 0 }, database = transactionDatabase(pool, active), f = await fixture({ pool, database });
    for (const name of ['countActivityTokens', 'generateActivity']) {
      const original = f.options.provider[name]; f.options.provider[name] = async input => { assert.equal(active.count, 0); return original(input); };
    }
    const original = f.options.reader.read; f.options.reader.read = async (...args) => { assert.equal(active.count, 0); return original(...args); };
    const service = new ActivityAiService(f.options), { view } = await service.start(f.T, f.room, f.start);
    const results = await Promise.all([new ActivityAiWorker(f.options).runOnce(), new ActivityAiWorker(f.options).runOnce()]);
    assert.equal(results.filter(Boolean).length, 1); assert.equal(f.calls.filter(x => x === 'generate').length, 1);
    const ready = await new ActivityAiService(f.options).get(f.T, f.room, view.id);
    assert.equal(ready.state, 'READY'); assert.deepEqual(ready.proposal, f.proposal);
    assert.equal((await f.classrooms.listActivities(f.T, f.room)).activities.length, 0);
    const input = { revision: await f.revision(), requestId: randomUUID(), proposal: { ...f.proposal, title: 'Título revisado' } };
    const applied = await service.apply(f.T, f.room, view.id, input);
    assert.equal(applied.generationId, view.id); assert.ok(applied.activityId);
    const replay = await service.apply(f.T, f.room, view.id, input); assert.equal(replay.activityId, applied.activityId);
    const draft = (await f.classrooms.activityDetail(f.T, f.room, applied.activityId, true)).activity;
    assert.equal(draft.status, 'DRAFT'); assert.equal(draft.title, input.proposal.title); assert.deepEqual(draft.topicIds, f.topicIds);
    assert.ok(draft.instructions.includes('1. Comparar casos.')); assert.ok(draft.instructions.includes('2. Explicar relación.'));
    assert.equal((await f.classrooms.listActivities(f.S, f.room)).activities.length, 0);
    await deny(f.classrooms.activityDetail(f.S, f.room, applied.activityId), 'FORBIDDEN');
    await deny(service.apply(f.T, f.room, view.id, { ...input, requestId: randomUUID() }), 'CONFLICT');
    assert.equal((await f.classrooms.listActivities(f.T, f.room)).activities.length, 1);
    assert.equal((await service.get(f.T, f.room, view.id)).state, 'APPLIED');
  });
});

test('A3 source/curriculum changes, revocation and invalid output cannot become applied drafts', { timeout: 120000 }, async t => {
  const { ActivityAiService, ActivityAiWorker } = await ai();
  await withAiDatabase(async ({ pool }) => {
    for (const mutation of ['digest', 'deleted', 'topic', 'archive', 'invalid-output']) await t.test(mutation, async () => {
      await rollbackCase(pool, async local => {
        const f = await fixture(local), service = new ActivityAiService(f.options);
        if (mutation === 'invalid-output') f.options.provider.generateActivity = async () => ({ json: { status: 'READY', proposal: { ...f.proposal, assignmentPrompts: [] } }, inputTokens: 20, outputTokens: 30 });
        const { view } = await service.start(f.T, f.room, f.start);
        await new ActivityAiWorker(f.options).runOnce();
        if (mutation === 'invalid-output') { assert.equal((await service.get(f.T, f.room, view.id)).state, 'FAILED'); return; }
        if (mutation === 'digest') f.state.digest = 'b'.repeat(64);
        if (mutation === 'deleted') f.state.available = false;
        if (mutation === 'topic') await f.seedPlan({ action: 'renameTopic', id: f.topicIds[0], name: 'Nuevo alcance' });
        if (mutation === 'archive') await f.pool.query('UPDATE classrooms SET archived_at=now() WHERE id=$1', [f.room]);
        await assert.rejects(service.apply(f.T, f.room, view.id, { revision: await f.revision(), requestId: randomUUID(), proposal: f.proposal }));
        assert.equal((await f.classrooms.listActivities(f.T, f.room)).activities.length, 0);
      });
    });
  });
});
