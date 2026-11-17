import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAiDatabase, aiFixture } from './classroom-ai-database.test.mjs';

const ai = () => Promise.all([import("../apps/api/src/modules/curriculum/generation/infrastructure/ai/service.ts"),import("../apps/api/src/modules/curriculum/generation/infrastructure/ai/worker.ts")]).then(([m0,m1]) => Object.freeze({ClassroomAiService: m0.ClassroomAiService,ClassroomAiWorker: m1.ClassroomAiWorker}));
const units = [{ name: 'Luz', topics: [{ name: 'Exposición' }] }];
const configuration = { model: 'gemini-test-fixture', maxInputTokens: 100000, maxOutputTokens: 16384,
  deadlineMs: 1000, maxDispatches: 2, maxJobAgeMs: 300000, maxConcurrency: 2,
  dailyActorRequests: 5, dailyGlobalRequests: 20, dailyBudgetUsd: 10,
  inputUsdPerMillion: 1, outputUsdPerMillion: 2 };
const options = (database, f, extractStudyPlan) => ({ database, configuration,
  authenticate: async (_tx, request) => request?.actor,
  reader: { snapshot: async () => ({ fileId: f.fileId, digest: f.digest, extension: 'pdf', sizeBytes: 14 }),
    read: async () => ({ kind: 'text', text: 'Unidad: Luz; Tema: Exposición' }) },
  provider: { countStudyPlanTokens: async () => 20, extractStudyPlan },
});
const success = () => ({ json: { units, warnings: [] }, inputTokens: 20, outputTokens: 30 });

test('C3 expired queued job with unchanged source becomes retryable timeout rather than stale', { timeout: 120000 }, async () => {
  const { ClassroomAiService, ClassroomAiWorker } = await ai();
  await withAiDatabase(async ({ pool, database }) => {
    const f = await aiFixture(pool); let dispatched = 0;
    const p = options(database, f, async () => { dispatched++; return success(); });
    const worker = new ClassroomAiWorker(p);
    p.reader.snapshotWorker = async (tx, grant, signal) => {
      await worker.authorizeClaim(grant, signal, tx);
      return p.reader.snapshot(tx, f.request, f.draftId, f.fileId);
    };
    const service = new ClassroomAiService(p), { view } = await service.start(f.request, f.draftId, f.start);
    await pool.query("UPDATE classroom_curriculum_extractions SET created_at=clock_timestamp()-interval '301 seconds' WHERE id=$1", [view.id]);
    await worker.runOnce();
    const result = await service.get(f.request, f.draftId, view.id);
    assert.equal(result.state, 'FAILED'); assert.equal(result.error, 'AI_TIMEOUT'); assert.equal(result.retryable, true);
    assert.equal(dispatched, 0);
  });
});

test('C3 transient failure persists, only explicit concurrent retry creates one successor', { timeout: 120000 }, async () => {
  const { ClassroomAiService, ClassroomAiWorker } = await ai();
  await withAiDatabase(async ({ pool, database }) => {
    const f = await aiFixture(pool); let calls = 0;
    const p = options(database, f, async () => { calls++; throw Object.assign(new Error('AI_UNAVAILABLE'), { code: 'AI_UNAVAILABLE' }); });
    let service = new ClassroomAiService(p);
    const { view } = await service.start(f.request, f.draftId, f.start);
    assert.equal(await new ClassroomAiWorker(p).runOnce(), true);
    service = new ClassroomAiService(p);
    const failed = await service.get(f.request, f.draftId, view.id);
    assert.equal(failed.state, 'FAILED'); assert.equal(failed.error, 'AI_UNAVAILABLE'); assert.equal(failed.retryable, true);
    const requestId = randomUUID();
    const retries = await Promise.all([service.retry(f.request, f.draftId, view.id, { revision: '1', requestId }),
      service.retry(f.request, f.draftId, view.id, { revision: '1', requestId: randomUUID() })]);
    assert.equal(retries[0].view.id, retries[1].view.id);
    assert.notEqual(retries[0].view.id, view.id);
    assert.equal((await pool.query('SELECT count(*)::int n FROM classroom_curriculum_extractions')).rows[0].n, 2);
    assert.equal(calls, 1, 'Retry enqueues only; HTTP never calls provider');
    assert.deepEqual((await pool.query('SELECT payload FROM classroom_drafts WHERE id=$1', [f.draftId])).rows[0].payload, f.payload);
  });
});

test('C3 replacing the plan while provider runs invalidates delayed result without overwriting draft', { timeout: 120000 }, async () => {
  const { ClassroomAiService, ClassroomAiWorker } = await ai();
  await withAiDatabase(async ({ pool, database }) => {
    const f = await aiFixture(pool); let release, entered;
    const gate = new Promise(resolve => { release = resolve; }), dispatched = new Promise(resolve => { entered = resolve; });
    const p = options(database, f, async () => { entered(); await gate; return success(); });
    const service = new ClassroomAiService(p), { view } = await service.start(f.request, f.draftId, f.start);
    const running = new ClassroomAiWorker(p).runOnce();
    await dispatched;
    const changed = { ...f.payload, planFileId: randomUUID(), units: [{ name: 'Manual durante espera', topics: [] }] };
    await pool.query('UPDATE classroom_drafts SET revision=revision+1,payload=$2::jsonb WHERE id=$1', [f.draftId, JSON.stringify(changed)]);
    release(); await running;
    const stale = await service.get(f.request, f.draftId, view.id);
    assert.equal(stale.state, 'STALE');
    assert.deepEqual((await pool.query('SELECT payload FROM classroom_drafts WHERE id=$1', [f.draftId])).rows[0].payload, changed);
    await assert.rejects(service.apply(f.request, f.draftId, view.id, { revision: '2', requestId: randomUUID(), units }), { code: 'CONFLICT' });
  });
});

test('C3 no structure/invalid output preserve manual fallback and are not retryable', { timeout: 120000 }, async () => {
  const { ClassroomAiService, ClassroomAiWorker } = await ai();
  await withAiDatabase(async ({ pool, database }) => {
    for (const [json, expected] of [[{ units: [], warnings: [] }, 'NO_STRUCTURE'],
      [{ units, warnings: [], publish: true }, 'INVALID_AI_OUTPUT']]) {
      const f = await aiFixture(pool), p = options(database, f, async () => ({ json, inputTokens: 20, outputTokens: 30 }));
      const service = new ClassroomAiService(p), { view } = await service.start(f.request, f.draftId, f.start);
      await new ClassroomAiWorker(p).runOnce();
      const result = await service.get(f.request, f.draftId, view.id);
      assert.equal(result.state, 'FAILED'); assert.equal(result.error, expected); assert.equal(result.retryable, false);
      assert.deepEqual((await pool.query('SELECT payload FROM classroom_drafts WHERE id=$1', [f.draftId])).rows[0].payload, f.payload);
    }
  });
});

test('C3 uncertain dispatch recovery is fenced and never automatically bills a second call', { timeout: 120000 }, async () => {
  const { ClassroomAiService, ClassroomAiWorker } = await ai();
  await withAiDatabase(async ({ pool, database }) => {
    const f = await aiFixture(pool); let release, entered, calls = 0;
    const gate = new Promise(resolve => { release = resolve; }), dispatched = new Promise(resolve => { entered = resolve; });
    const p = options(database, f, async () => { calls++; entered(); await gate; return success(); });
    const service = new ClassroomAiService(p), { view } = await service.start(f.request, f.draftId, f.start);
    const running = new ClassroomAiWorker(p).runOnce(); await dispatched;
    await pool.query(`UPDATE classroom_curriculum_extractions SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1`, [view.id]);
    await new ClassroomAiWorker(p).runOnce();
    release(); await running;
    const result = await service.get(f.request, f.draftId, view.id);
    assert.equal(result.state, 'FAILED'); assert.equal(result.error, 'PROVIDER_OUTCOME_UNKNOWN');
    assert.equal(calls, 1); assert.equal(result.proposal, null);
  });
});
