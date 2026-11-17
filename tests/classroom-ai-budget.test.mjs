import test from 'node:test';
import assert from 'node:assert/strict';
import { withAiDatabase, aiFixture } from './classroom-ai-database.test.mjs';

const ai = () => Promise.all([import("../apps/api/src/modules/curriculum/generation/infrastructure/ai/service.ts"),import("../apps/api/src/modules/curriculum/generation/infrastructure/ai/worker.ts")]).then(([m0,m1]) => Object.freeze({ClassroomAiService: m0.ClassroomAiService,ClassroomAiWorker: m1.ClassroomAiWorker}));
const config = { model: 'gemini-test-fixture', maxInputTokens: 100000, maxOutputTokens: 16384,
  deadlineMs: 1000, maxDispatches: 2, maxJobAgeMs: 300000, maxConcurrency: 2,
  dailyActorRequests: 5, dailyGlobalRequests: 20, dailyBudgetUsd: 10,
  inputUsdPerMillion: 1, outputUsdPerMillion: 2 };
const result = { json: { units: [{ name: 'Luz', topics: [{ name: 'Exposición' }] }], warnings: [] }, inputTokens: 20, outputTokens: 30 };
function ports(database, configuration = {}, extract = async () => result) {
  const calls = [];
  return { database, configuration: { ...config, ...configuration }, calls,
    authenticate: async (_tx, req) => req?.actor,
    reader: { snapshot: async (_tx, _req, _draft, fileId) => ({ fileId, digest: 'd'.repeat(64), extension: 'pdf', sizeBytes: 14 }),
      read: async () => { calls.push('read'); return { kind: 'text', text: 'Unidad: Luz; tema: Exposición' }; } },
    provider: { countStudyPlanTokens: async () => { calls.push('count'); return 20; },
      extractStudyPlan: async input => { calls.push('extract'); return extract(input); } },
  };
}

test('C3 input token limit and worst-case monetary reservation fail closed before generation', { timeout: 120000 }, async () => {
  const { ClassroomAiService, ClassroomAiWorker } = await ai();
  await withAiDatabase(async ({ pool, database }) => {
    for (const [patch, expected] of [[{ maxInputTokens: 19 }, 'AI_INPUT_LIMIT'],
      [{ dailyBudgetUsd: 0.000001 }, 'AI_BUDGET_EXCEEDED']]) {
      const f = await aiFixture(pool), p = ports(database, patch), service = new ClassroomAiService(p);
      const { view } = await service.start(f.request, f.draftId, f.start);
      await new ClassroomAiWorker(p).runOnce();
      const failed = await service.get(f.request, f.draftId, view.id);
      assert.equal(failed.state, 'FAILED'); assert.equal(failed.error, expected);
      assert.equal(p.calls.filter(x => x === 'extract').length, 0);
      assert.deepEqual((await pool.query('SELECT payload FROM classroom_drafts WHERE id=$1', [f.draftId])).rows[0].payload, f.payload);
    }
  });
});

test('C3 actor daily request quota persists across worker/service instances and distinct sources', { timeout: 120000 }, async () => {
  const { ClassroomAiService, ClassroomAiWorker } = await ai();
  await withAiDatabase(async ({ pool, database }) => {
    const f = await aiFixture(pool), second = await aiFixture(pool, { ownerId: f.ownerId }), p = ports(database, { dailyActorRequests: 1 });
    const first = await new ClassroomAiService(p).start(f.request, f.draftId, f.start);
    await new ClassroomAiWorker(p).runOnce();
    assert.equal((await new ClassroomAiService(p).get(f.request, f.draftId, first.view.id)).state, 'READY');
    const next = await new ClassroomAiService(p).start(f.request, second.draftId, second.start);
    await new ClassroomAiWorker(p).runOnce();
    const denied = await new ClassroomAiService(p).get(f.request, second.draftId, next.view.id);
    assert.equal(denied.state, 'FAILED'); assert.equal(denied.error, 'AI_BUDGET_EXCEEDED');
    assert.equal(p.calls.filter(x => x === 'extract').length, 1);
    assert.ok((await pool.query('SELECT count(*)::int n FROM ai_usage_daily')).rows[0].n > 0);
  });
});

test('C3 global daily request reservation cannot be bypassed by concurrent actors', { timeout: 120000 }, async () => {
  const { ClassroomAiService, ClassroomAiWorker } = await ai();
  await withAiDatabase(async ({ pool, database }) => {
    const fixtures = await Promise.all([aiFixture(pool), aiFixture(pool)]), p = ports(database, { dailyGlobalRequests: 1 });
    const jobs = await Promise.all(fixtures.map(f => new ClassroomAiService(p).start(f.request, f.draftId, f.start)));
    await Promise.all([new ClassroomAiWorker(p).runOnce(), new ClassroomAiWorker(p).runOnce()]);
    const states = await Promise.all(fixtures.map((f, i) => new ClassroomAiService(p).get(f.request, f.draftId, jobs[i].view.id)));
    assert.equal(states.filter(x => x.state === 'READY').length, 1);
    assert.equal(states.filter(x => x.state === 'FAILED' && x.error === 'AI_BUDGET_EXCEEDED').length, 1);
    assert.equal(p.calls.filter(x => x === 'extract').length, 1);
  });
});

test('C3 global dispatch leases limit three separate actors to two simultaneous provider calls', { timeout: 120000 }, async () => {
  const { ClassroomAiService, ClassroomAiWorker } = await ai();
  await withAiDatabase(async ({ pool, database }) => {
    let release, entered, running = 0, maximum = 0;
    const gate = new Promise(resolve => { release = resolve; });
    const twoEntered = new Promise(resolve => { entered = resolve; });
    const p = ports(database, {}, async () => {
      running++; maximum = Math.max(maximum, running); if (running === 2) entered();
      try { await gate; return result; } finally { running--; }
    });
    const fixtures = await Promise.all([aiFixture(pool), aiFixture(pool), aiFixture(pool)]);
    await Promise.all(fixtures.map(f => new ClassroomAiService(p).start(f.request, f.draftId, f.start)));
    const workers = [new ClassroomAiWorker(p).runOnce(), new ClassroomAiWorker(p).runOnce(), new ClassroomAiWorker(p).runOnce()];
    let timer;
    try {
      await Promise.race([twoEntered, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Two workers failed to enter provider')), 5000); })]);
      assert.equal(p.calls.filter(x => x === 'extract').length, 2);
      const rows = (await pool.query('SELECT state,count(*)::int n FROM classroom_curriculum_extractions GROUP BY state')).rows;
      assert.equal(rows.find(x => x.state === 'RUNNING')?.n, 2);
      assert.equal(rows.find(x => x.state === 'QUEUED')?.n, 1);
    } finally { clearTimeout(timer); release(); await Promise.allSettled(workers); }
    assert.equal(maximum, 2);
    await new ClassroomAiWorker(p).runOnce();
    assert.equal(p.calls.filter(x => x === 'extract').length, 3);
  });
});
