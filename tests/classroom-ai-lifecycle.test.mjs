import test from 'node:test';
import assert from 'node:assert/strict';
import { withAiDatabase, aiFixture } from './classroom-ai-database.test.mjs';

test('C3 worker shutdown aborts active provider, drains persistence and rejects future dispatch', { timeout: 120000 }, async () => {
  const { ClassroomAiService, ClassroomAiWorker } = await Promise.all([import("../apps/api/src/modules/curriculum/generation/infrastructure/ai/service.ts"),import("../apps/api/src/modules/curriculum/generation/infrastructure/ai/worker.ts")]).then(([m0,m1]) => Object.freeze({ClassroomAiService: m0.ClassroomAiService,ClassroomAiWorker: m1.ClassroomAiWorker}));
  await withAiDatabase(async ({ pool, database }) => {
    const f = await aiFixture(pool); let entered, signal, calls = 0;
    const dispatch = new Promise(resolve => { entered = resolve; });
    const options = { database, authenticate: async (_tx, req) => req.actor,
      configuration: { model: 'synthetic', maxInputTokens: 100000, maxOutputTokens: 16384,
        deadlineMs: 90000, maxDispatches: 2, maxJobAgeMs: 300000, maxConcurrency: 2,
        dailyActorRequests: 5, dailyGlobalRequests: 20, dailyBudgetUsd: 10, inputUsdPerMillion: 1, outputUsdPerMillion: 2 },
      reader: { snapshot: async () => ({ fileId: f.fileId, digest: f.digest, extension: 'pdf', sizeBytes: 14 }),
        read: async () => ({ kind: 'text', text: 'Unidad Luz, tema Exposición' }) },
      provider: { countStudyPlanTokens: async () => 20, extractStudyPlan: async input => {
        calls++; signal = input.signal; entered(); return new Promise(() => {});
      } } };
    const service = new ClassroomAiService(options), worker = new ClassroomAiWorker(options);
    const { view } = await service.start(f.request, f.draftId, f.start);
    assert.equal(calls, 0, 'Constructing and enqueuing never starts external I/O');
    const running = worker.runOnce(); await dispatch;
    await worker.onModuleDestroy(); await running;
    assert.equal(signal.aborted, true);
    const result = await service.get(f.request, f.draftId, view.id);
    assert.equal(result.state, 'FAILED'); assert.equal(result.error, 'PROVIDER_OUTCOME_UNKNOWN');
    assert.equal(await worker.runOnce(), false);
    await worker.onModuleDestroy(); assert.equal(calls, 1);
  });
});

test('C3 shutdown while claim is pending never starts file/token/provider I/O after claim resolves', { timeout: 120000 }, async () => {
  const { ClassroomAiService, ClassroomAiWorker } = await Promise.all([import("../apps/api/src/modules/curriculum/generation/infrastructure/ai/service.ts"),import("../apps/api/src/modules/curriculum/generation/infrastructure/ai/worker.ts")]).then(([m0,m1]) => Object.freeze({ClassroomAiService: m0.ClassroomAiService,ClassroomAiWorker: m1.ClassroomAiWorker}));
  await withAiDatabase(async ({ pool, database }) => {
    const f = await aiFixture(pool); let release, entered, delayed = false, io = 0;
    const gate = new Promise(resolve => { release = resolve; }), claimed = new Promise(resolve => { entered = resolve; });
    const delayedDatabase = { $transaction: (operation, options) => database.$transaction(async raw => {
      const result = await operation(raw);
      if (!delayed && result?.state === 'RUNNING') { delayed = true; entered(); await gate; }
      return result;
    }, options) };
    const options = { database: delayedDatabase, authenticate: async (_tx, req) => req.actor,
      configuration: { model: 'synthetic', maxInputTokens: 100000, maxOutputTokens: 16384, deadlineMs: 1000,
        maxDispatches: 2, maxJobAgeMs: 300000, maxConcurrency: 2, dailyActorRequests: 5, dailyGlobalRequests: 20,
        dailyBudgetUsd: 10, inputUsdPerMillion: 1, outputUsdPerMillion: 2 },
      reader: { snapshot: async () => ({ fileId: f.fileId, digest: f.digest, extension: 'pdf', sizeBytes: 14 }),
        read: async () => { io++; return { kind: 'pdf', bytes: Uint8Array.from([37,80,68,70]) }; } },
      provider: { countStudyPlanTokens: async () => { io++; return 20; }, extractStudyPlan: async () => {
        io++; return { json: { units: [{ name: 'U', topics: [{ name: 'T' }] }], warnings: [] }, inputTokens: 20, outputTokens: 20 };
      } } };
    await new ClassroomAiService(options).start(f.request, f.draftId, f.start);
    const worker = new ClassroomAiWorker(options), running = worker.runOnce(); await claimed;
    const closing = worker.onModuleDestroy(); release(); await Promise.all([running, closing]);
    assert.equal(io, 0); assert.equal(await worker.runOnce(), false);
  });
});
