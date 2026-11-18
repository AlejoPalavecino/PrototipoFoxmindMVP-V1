import test from 'node:test';
import assert from 'node:assert/strict';
import { withAiDatabase, aiFixture } from './classroom-ai-database.test.mjs';
import { fixture } from './activity-ai-fixture.test.mjs';
const ai = () => Promise.all([import("../apps/api/src/modules/activities/generation/infrastructure/activity-ai/service.ts"),import("../apps/api/src/modules/activities/generation/infrastructure/activity-ai/worker.ts"),import("../apps/api/src/modules/activities/generation/infrastructure/activity-ai/provenance.ts")]).then(([m0,m1,m2]) => Object.freeze({ActivityAiService: m0.ActivityAiService,ActivityAiWorker: m1.ActivityAiWorker,validateActivityGeneration: m2.validateActivityGeneration}));
const extraction = () => Promise.all([import("../apps/api/src/modules/curriculum/generation/infrastructure/ai/service.ts"),import("../apps/api/src/modules/curriculum/generation/infrastructure/ai/worker.ts")]).then(([m0,m1]) => Object.freeze({ClassroomAiService: m0.ClassroomAiService,ClassroomAiWorker: m1.ClassroomAiWorker}));
function extractor(local, f, config, generate = async () => ({ json: { units: [{ name: 'Luz', topics: [{ name: 'Exposición' }] }], warnings: [] }, inputTokens: 20, outputTokens: 30 })) {
  return { database: local.database, authenticate: async (_tx, req) => req.actor, configuration: config,
    reader: { snapshot: async () => ({ fileId: f.fileId, digest: f.digest, extension: 'pdf', sizeBytes: 14 }),
      read: async () => ({ kind: 'text', text: 'Unidad Luz, tema Exposición' }) },
    provider: { countStudyPlanTokens: async () => 20, extractStudyPlan: generate } };
}

test('A3 generation preflight prevents expensive dispatch on token or monetary limits', { timeout: 120000 }, async t => {
  const { ActivityAiService, ActivityAiWorker } = await ai();
  await withAiDatabase(async local => {
    for (const [patch, code] of [[{ maxInputTokens: 19 }, 'AI_INPUT_LIMIT'], [{ dailyBudgetUsd: 0.000001 }, 'AI_GLOBAL_DAILY_BUDGET_EXCEEDED']]) await t.test(code, async () => {
      const f = await fixture(local); f.options.configuration = { ...f.options.configuration, ...patch };
      const service = new ActivityAiService(f.options), { view } = await service.start(f.T, f.room, f.start);
      await new ActivityAiWorker(f.options).runOnce();
      const result = await service.get(f.T, f.room, view.id); assert.equal(result.state, 'FAILED'); assert.equal(result.error, code);
      assert.equal(f.calls.filter(x => x === 'generate').length, 0);
    });
  });
});

test('A3 extractor and generation consume one shared actor/global daily quota, including after service restart', { timeout: 120000 }, async t => {
  const { ActivityAiService, ActivityAiWorker } = await ai(), { ClassroomAiService, ClassroomAiWorker } = await extraction();
  for (const quota of ['actor', 'global']) await t.test(quota, () => withAiDatabase(async local => {
    const f = await fixture(local), e = await aiFixture(local.pool, quota === 'actor' ? { ownerId: f.teacher } : {});
    const config = { ...f.options.configuration, ...(quota === 'actor' ? { dailyActorRequests: 1 } : { dailyGlobalRequests: 1 }) };
    const p = extractor(local, e, config), original = await new ClassroomAiService(p).start(e.request, e.draftId, e.start);
    await new ClassroomAiWorker(p).runOnce(); assert.equal((await new ClassroomAiService(p).get(e.request, e.draftId, original.view.id)).state, 'READY');
    f.options.configuration = config;
    const service = new ActivityAiService(f.options), { view } = await service.start(f.T, f.room, f.start);
    await new ActivityAiWorker(f.options).runOnce();
    const denied = await new ActivityAiService(f.options).get(f.T, f.room, view.id);
    assert.equal(denied.state, 'FAILED');
    assert.equal(denied.error, quota === 'actor' ? 'AI_BUDGET_EXCEEDED' : 'AI_GLOBAL_DAILY_BUDGET_EXCEEDED');
    assert.equal(f.calls.filter(x => x === 'generate').length, 0);
    const buckets = (await local.pool.query('SELECT DISTINCT capability FROM ai_usage_daily')).rows;
    assert.deepEqual(buckets, [{ capability: 'study-plan-v1' }]);
  }));
});

test('A3 shared admission excludes actor overlap across capabilities and global concurrency overflow', { timeout: 120000 }, async t => {
  const { ActivityAiService, ActivityAiWorker } = await ai(), { ClassroomAiService, ClassroomAiWorker } = await extraction();
  for (const scope of ['actor', 'global']) await t.test(scope, () => withAiDatabase(async local => {
    const f = await fixture(local), e = await aiFixture(local.pool, scope === 'actor' ? { ownerId: f.teacher } : {});
    const config = { ...f.options.configuration, maxConcurrency: scope === 'actor' ? 2 : 1 };
    let entered, release; const gate = new Promise(resolve => { release = resolve; }), started = new Promise(resolve => { entered = resolve; });
    const p = extractor(local, e, config, async () => { entered(); await gate;
      return { json: { units: [{ name: 'Luz', topics: [{ name: 'Exposición' }] }], warnings: [] }, inputTokens: 20, outputTokens: 30 }; });
    await new ClassroomAiService(p).start(e.request, e.draftId, e.start);
    const running = new ClassroomAiWorker(p).runOnce(); let timer;
    try {
      await Promise.race([started, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Extraction did not enter')), 5000); })]);
      f.options.configuration = config;
      const { view } = await new ActivityAiService(f.options).start(f.T, f.room, f.start);
      assert.equal(await new ActivityAiWorker(f.options).runOnce(), false);
      assert.equal((await new ActivityAiService(f.options).get(f.T, f.room, view.id)).state, 'QUEUED');
      assert.equal(f.calls.filter(x => x === 'generate').length, 0);
    } finally { clearTimeout(timer); release(); await running; }
    await new ActivityAiWorker(f.options).runOnce(); assert.equal(f.calls.filter(x => x === 'generate').length, 1);
  }));
});
