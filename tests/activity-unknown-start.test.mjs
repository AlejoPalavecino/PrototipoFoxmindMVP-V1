import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import React from 'react';
import { withAiDatabase, rollbackCase } from './classroom-ai-database.test.mjs';
import { fixture } from './activity-ai-fixture.test.mjs';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';
const ai = () => import('../apps/api/src/classrooms/activity-ai/index.ts');
async function setup(local) {
  const f = await fixture(local); await f.plan({ action: 'addTopic', unitId: f.unitId, name: 'Second topic' });
  f.start.revision = await f.revision(); f.start.topicIds = (await f.classrooms.detail(f.T, f.room)).units[0].topics.map(t => t.id);
  f.start.sourceIds = [f.sourceId, `material:${randomUUID()}`];
  const files = new Map(f.start.sourceIds.map(sourceId => [sourceId, randomUUID()]));
  f.options.reader.snapshot = async (_tx, _req, _room, sourceId) => ({ sourceId, fileId: files.get(sourceId), digest: 'a'.repeat(64), extension: 'pdf', sizeBytes: 100 });
  f.options.reader.read = async grant => ({ sourceId: grant.sourceId, document: { kind: 'pdf', bytes: Uint8Array.from([37,80,68,70]) }, pageCount: 3, warnings: [] });
  f.options.provider.generateActivity = async () => { f.calls.push('generate'); throw Object.assign(new Error('PROVIDER_OUTCOME_UNKNOWN'), { code: 'PROVIDER_OUTCOME_UNKNOWN' }); };
  const { ActivityAiService, ActivityAiWorker } = await ai(), service = new ActivityAiService(f.options);
  const first = await service.start(f.T, f.room, f.start); await new ActivityAiWorker(f.options).runOnce();
  assert.equal((await service.get(f.T, f.room, first.view.id)).error, 'PROVIDER_OUTCOME_UNKNOWN');
  return { ...f, service, first, ActivityAiWorker };
}

test('A01 fresh request IDs, revision changes and reordered selection cannot bypass unknown-outcome acknowledgement', { timeout: 120000 }, async t => {
  await withAiDatabase(async ({ pool }) => {
    for (const variant of ['fresh-key', 'revision', 'selection-order']) await t.test(variant, () => rollbackCase(pool, async local => {
      const f = await setup(local);
      if (variant === 'revision') await local.pool.query('UPDATE classrooms SET revision=revision+1 WHERE id=$1', [f.room]);
      const retry = { ...f.start, revision: await f.revision(), requestId: randomUUID(),
        ...(variant === 'selection-order' ? { topicIds: [...f.start.topicIds].reverse(), sourceIds: [...f.start.sourceIds].reverse() } : {}) };
      await assert.rejects(f.service.start(f.T, f.room, retry), { code: 'PROVIDER_OUTCOME_UNKNOWN' });
      assert.equal((await local.pool.query('SELECT count(*)::int n FROM activity_ai_generations')).rows[0].n, 1);
      assert.equal(f.calls.filter(x => x === 'generate').length, 1);
      const distinct = await f.service.start(f.T, f.room, { ...retry, requestId: randomUUID(), objective: 'Un objetivo docente realmente distinto' });
      assert.equal(distinct.created, true); assert.notEqual(distinct.view.id, f.first.view.id);
    }));
  });
});

test('A01 acknowledged regeneration dispatches once and another unknown successor requires renewed acknowledgement', { timeout: 120000 }, async () => {
  await withAiDatabase(async ({ pool }) => rollbackCase(pool, async local => {
    const f = await setup(local), input = { ...f.start, requestId: randomUUID(), acknowledgePossibleCharge: true };
    const successor = await f.service.regenerate(f.T, f.room, f.first.view.id, input);
    assert.equal(successor.created, true); await new f.ActivityAiWorker(f.options).runOnce();
    assert.equal((await f.service.get(f.T, f.room, successor.view.id)).error, 'PROVIDER_OUTCOME_UNKNOWN');
    assert.equal(f.calls.filter(x => x === 'generate').length, 2);
    await assert.rejects(f.service.start(f.T, f.room, { ...f.start, requestId: randomUUID() }), { code: 'PROVIDER_OUTCOME_UNKNOWN' });
    await assert.rejects(f.service.regenerate(f.T, f.room, successor.view.id,
      { ...f.start, requestId: randomUUID(), acknowledgePossibleCharge: false }), { code: 'CONFLICT' });
    assert.equal((await local.pool.query('SELECT count(*)::int n FROM activity_ai_generations')).rows[0].n, 2);
  }));
});

test('A01 reopening generation recovers the latest uncertain result before permitting another initial start', async () => {
  const { useActivityGeneration } = loadTsModule('apps/classrooms-ui/use-activity-generation.ts');
  const failed = { id: randomUUID(), classroomId: randomUUID(), state: 'FAILED', error: 'PROVIDER_OUTCOME_UNKNOWN', proposal: null,
    retryable: false, missingInformation: [], sourceReport: [], appliedActivityId: null, createdAt: '2026-10-25T12:00:00Z' };
  const calls = [], api = { call: async (...args) => { calls.push(args); return args[0].endsWith('/sources') ? { revision: '2', sources: [] }
    : args[0].endsWith(failed.id) ? failed : { jobs: [failed] }; } };
  const Host = () => React.createElement('output', { state: useActivityGeneration(api, { id: failed.classroomId, revision: '2' }, async () => {}) });
  const view = hookView(Host, {});
  try {
    await view.flush(); assert.equal(view.tree.props.state.view?.id, failed.id);
    assert.equal(view.tree.props.state.view.error, 'PROVIDER_OUTCOME_UNKNOWN');
    assert.equal(calls.some(([, method]) => method === 'POST'), false);
  } finally { view.close(); }
});

test('A01 a successful acknowledged successor resolves its predecessor gate instead of permanently blocking future starts', { timeout: 120000 }, async () => {
  await withAiDatabase(async ({ pool }) => rollbackCase(pool, async local => {
    const f = await setup(local);
    f.options.provider.generateActivity = async () => ({ json: { status: 'READY', proposal: f.proposal }, inputTokens: 20, outputTokens: 30 });
    const successor = await f.service.regenerate(f.T, f.room, f.first.view.id,
      { ...f.start, requestId: randomUUID(), acknowledgePossibleCharge: true });
    await new f.ActivityAiWorker(f.options).runOnce();
    assert.equal((await f.service.get(f.T, f.room, successor.view.id)).state, 'READY');
    const allowed = await f.service.start(f.T, f.room, { ...f.start, requestId: randomUUID() });
    assert.equal(allowed.created, true); assert.notEqual(allowed.view.id, f.first.view.id);
  }));
});

test('A01 an older READY sibling cannot bypass an unresolved unknown successor even with an acknowledgement', { timeout: 120000 }, async t => {
  const { ActivityAiService, ActivityAiWorker } = await ai();
  await withAiDatabase(async ({ pool }) => {
    for (const acknowledgePossibleCharge of [false, true]) await t.test(`older predecessor acknowledgement=${acknowledgePossibleCharge}`, () => rollbackCase(pool, async local => {
      const f = await fixture(local), service = new ActivityAiService(f.options);
      const older = await service.start(f.T, f.room, f.start); await new ActivityAiWorker(f.options).runOnce();
      assert.equal((await service.get(f.T, f.room, older.view.id)).state, 'READY');
      f.options.provider.generateActivity = async () => {
        f.calls.push('generate'); throw Object.assign(new Error('PROVIDER_OUTCOME_UNKNOWN'), { code: 'PROVIDER_OUTCOME_UNKNOWN' });
      };
      const uncertain = await service.regenerate(f.T, f.room, older.view.id,
        { ...f.start, requestId: randomUUID(), acknowledgePossibleCharge: false });
      await new ActivityAiWorker(f.options).runOnce();
      assert.equal((await service.get(f.T, f.room, uncertain.view.id)).error, 'PROVIDER_OUTCOME_UNKNOWN');
      const before = [...f.calls];
      await assert.rejects(service.regenerate(f.T, f.room, older.view.id,
        { ...f.start, requestId: randomUUID(), acknowledgePossibleCharge }), { code: 'PROVIDER_OUTCOME_UNKNOWN' });
      assert.equal((await local.pool.query('SELECT count(*)::int n FROM activity_ai_generations')).rows[0].n, 2);
      assert.deepEqual(f.calls, before);
      const allowed = await service.regenerate(f.T, f.room, uncertain.view.id,
        { ...f.start, requestId: randomUUID(), acknowledgePossibleCharge: true });
      assert.equal(allowed.created, true); assert.notEqual(allowed.view.id, uncertain.view.id);
      assert.deepEqual(f.calls, before, 'Explicit regeneration enqueues without dispatching inline');
      await new ActivityAiWorker(f.options).runOnce();
      assert.equal((await service.get(f.T, f.room, allowed.view.id)).error, 'PROVIDER_OUTCOME_UNKNOWN');
      await assert.rejects(service.start(f.T, f.room, { ...f.start, requestId: randomUUID() }), { code: 'PROVIDER_OUTCOME_UNKNOWN' });
      assert.equal((await local.pool.query('SELECT count(*)::int n FROM activity_ai_generations')).rows[0].n, 3);
    }));
  });
});

test('A01 reopening after a newer READY successor preserves historical uncertainty without blocking new creation', async () => {
  const { useActivityGeneration } = loadTsModule('apps/classrooms-ui/use-activity-generation.ts');
  const { ActivityGeneration } = loadTsModule('apps/classrooms-ui/ActivityGeneration.tsx');
  const room = { id: randomUUID(), revision: '2', role: 'teacher', archived: false, units: [], plans: [] };
  const ancestor = { id: randomUUID(), classroomId: room.id, state: 'FAILED', error: 'PROVIDER_OUTCOME_UNKNOWN', proposal: null,
    retryable: false, missingInformation: [], sourceReport: [], appliedActivityId: null, createdAt: '2026-10-25T12:00:00Z' };
  const successor = { ...ancestor, id: randomUUID(), state: 'READY', error: null, createdAt: '2026-10-25T12:01:00Z' };
  const calls = [], jobs = [successor, ancestor], api = { call: async (...args) => {
    calls.push(args); return args[0].endsWith('/sources') ? { revision: room.revision, sources: [] } : { jobs };
  } };
  const Host = () => React.createElement('output', { state: useActivityGeneration(api, room, async () => {}) });
  const stateView = hookView(Host, {}), formView = hookView(ActivityGeneration, { api, room, onApplied: async () => {}, onClose() {} });
  try {
    await stateView.flush(); await formView.flush();
    assert.notEqual(stateView.tree.props.state.view?.error, 'PROVIDER_OUTCOME_UNKNOWN', 'A resolved historical ancestor cannot reactivate the uncertain gate');
    assert.deepEqual(stateView.tree.props.state.jobs.map(job => job.id), [successor.id, ancestor.id]);
    assert.equal(stateView.tree.props.state.jobs[1].error, 'PROVIDER_OUTCOME_UNKNOWN', 'Historical outcome remains visible in recent generations');
    const generate = descendants(formView.tree, node => node.type?.name === 'GenerationSetup')[0];
    assert.ok(generate); assert.equal(generate.props.disabled, false);
    assert.equal(calls.some(([, method]) => method === 'POST'), false);
  } finally { stateView.close(); formView.close(); }
});
