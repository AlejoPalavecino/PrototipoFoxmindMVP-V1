import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAiDatabase } from './classroom-ai-database.test.mjs';
import { fixture } from './activity-ai-fixture.test.mjs';
const ai = () => Promise.all([import("../apps/api/src/modules/activities/infrastructure/activity-ai/service.ts"),import("../apps/api/src/modules/activities/infrastructure/activity-ai/worker.ts"),import("../apps/api/src/modules/activities/infrastructure/activity-ai/provenance.ts")]).then(([m0,m1,m2]) => Object.freeze({ActivityAiService: m0.ActivityAiService,ActivityAiWorker: m1.ActivityAiWorker,validateActivityGeneration: m2.validateActivityGeneration}));

test('A3 explicit insufficient-content result persists missing information without proposal or draft', { timeout: 120000 }, async () => {
  const { ActivityAiService, ActivityAiWorker } = await ai();
  await withAiDatabase(async local => {
    const f = await fixture(local), missingInformation = ['Falta la definición trabajada en clase.'];
    f.options.provider.generateActivity = async () => ({ json: { status: 'INSUFFICIENT_CONTENT', missingInformation }, inputTokens: 20, outputTokens: 8 });
    const service = new ActivityAiService(f.options), { view } = await service.start(f.T, f.room, f.start);
    await new ActivityAiWorker(f.options).runOnce();
    const result = await service.get(f.T, f.room, view.id);
    assert.equal(result.state, 'FAILED'); assert.equal(result.error, 'INSUFFICIENT_CONTENT');
    assert.deepEqual(result.missingInformation, missingInformation); assert.equal(result.proposal, null);
    assert.equal((await f.classrooms.listActivities(f.T, f.room)).activities.length, 0);
  });
});

test('A3 unknown outcome never auto-resends and explicit successor needs possible-charge acknowledgement', { timeout: 120000 }, async () => {
  const { ActivityAiService, ActivityAiWorker } = await ai();
  await withAiDatabase(async local => {
    const f = await fixture(local); let dispatched = 0;
    f.options.provider.generateActivity = async () => { dispatched++; throw Object.assign(new Error('PROVIDER_OUTCOME_UNKNOWN'), { code: 'PROVIDER_OUTCOME_UNKNOWN' }); };
    const service = new ActivityAiService(f.options), { view } = await service.start(f.T, f.room, f.start);
    await new ActivityAiWorker(f.options).runOnce();
    const failed = await service.get(f.T, f.room, view.id);
    assert.equal(failed.state, 'FAILED'); assert.equal(failed.error, 'PROVIDER_OUTCOME_UNKNOWN'); assert.equal(failed.retryable, false);
    for (let i = 0; i < 3; i++) assert.equal(await new ActivityAiWorker(f.options).runOnce(), false);
    assert.equal(dispatched, 1);
    const ledger = (await local.pool.query(`SELECT scope,request_count,reserved_microusd::text reserved,consumed_microusd::text consumed
      FROM ai_usage_daily ORDER BY scope`)).rows;
    assert.equal(ledger.length, 2);
    for (const entry of ledger) {
      assert.equal(entry.request_count, 1); assert.equal(entry.reserved, '0');
      assert.equal(entry.consumed, '32788', 'Unknown usage consumes full input plus maximum-output reservation exactly once');
    }
    const next = { ...f.start, requestId: randomUUID(), acknowledgePossibleCharge: false };
    await assert.rejects(service.regenerate(f.T, f.room, view.id, next));
    const successor = await service.regenerate(f.T, f.room, view.id, { ...next, acknowledgePossibleCharge: true });
    assert.notEqual(successor.view.id, view.id); assert.equal(successor.view.state, 'QUEUED'); assert.equal(dispatched, 1);
    assert.equal((await service.get(f.T, f.room, view.id)).error, 'PROVIDER_OUTCOME_UNKNOWN');
  });
});

test('A3 malformed provider envelopes never yield proposal or unsanitized missing information', { timeout: 120000 }, async t => {
  const { ActivityAiService, ActivityAiWorker } = await ai();
  for (const kind of ['raw', 'extra', 'empty-missing', 'oversized-missing']) await t.test(kind, () => withAiDatabase(async local => {
    const f = await fixture(local), json = kind === 'raw' ? f.proposal : kind === 'extra'
      ? { status: 'READY', proposal: f.proposal, publish: true }
      : { status: 'INSUFFICIENT_CONTENT', missingInformation: kind === 'empty-missing' ? [] : ['x'.repeat(501)] };
    f.options.provider.generateActivity = async () => ({ json, inputTokens: 20, outputTokens: 30 });
    const service = new ActivityAiService(f.options), { view } = await service.start(f.T, f.room, f.start);
    await new ActivityAiWorker(f.options).runOnce();
    const result = await service.get(f.T, f.room, view.id);
    assert.equal(result.state, 'FAILED'); assert.equal(result.error, 'INVALID_AI_OUTPUT'); assert.equal(result.proposal, null);
    assert.deepEqual(result.missingInformation, []);
  }));
});

test('A3 expired dispatch lease cannot resend or accept late output from its old owner', { timeout: 120000 }, async () => {
  const { ActivityAiService, ActivityAiWorker } = await ai();
  await withAiDatabase(async local => {
    const f = await fixture(local); let entered, release, dispatches = 0;
    const gate = new Promise(resolve => { release = resolve; }), dispatched = new Promise(resolve => { entered = resolve; });
    f.options.provider.generateActivity = async () => { dispatches++; entered(); await gate; return { json: { status: 'READY', proposal: f.proposal }, inputTokens: 20, outputTokens: 30 }; };
    const service = new ActivityAiService(f.options), { view } = await service.start(f.T, f.room, f.start);
    const running = new ActivityAiWorker(f.options).runOnce();
    let timer;
    try {
      await Promise.race([dispatched, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Provider not entered')), 5000); })]);
      await local.pool.query(`UPDATE activity_ai_generations SET lease_until=clock_timestamp()-interval '1 minute' WHERE id=$1`, [view.id]);
      await new ActivityAiWorker(f.options).runOnce();
    } finally { clearTimeout(timer); release(); await running; }
    const failed = await service.get(f.T, f.room, view.id);
    assert.equal(failed.state, 'FAILED'); assert.equal(failed.error, 'PROVIDER_OUTCOME_UNKNOWN'); assert.equal(failed.proposal, null);
    assert.equal(dispatches, 1); assert.equal(await new ActivityAiWorker(f.options).runOnce(), false);
  });
});

test('A3 shutdown aborts/drains active dispatch and permanently prevents new work from that worker', { timeout: 120000 }, async () => {
  const { ActivityAiService, ActivityAiWorker } = await ai();
  await withAiDatabase(async local => {
    const f = await fixture(local); let entered, signal, calls = 0;
    const dispatched = new Promise(resolve => { entered = resolve; });
    f.options.configuration = { ...f.options.configuration, deadlineMs: 90000 };
    f.options.provider.generateActivity = async input => { calls++; signal = input.signal; entered(); return new Promise(() => {}); };
    const service = new ActivityAiService(f.options), { view } = await service.start(f.T, f.room, f.start), worker = new ActivityAiWorker(f.options);
    const running = worker.runOnce(); let timer;
    try {
      await Promise.race([dispatched, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Provider not entered')), 5000); })]);
      await worker.onModuleDestroy(); await running;
      assert.equal(signal.aborted, true); assert.equal(await worker.runOnce(), false);
      const result = await service.get(f.T, f.room, view.id); assert.equal(result.state, 'FAILED'); assert.equal(result.error, 'PROVIDER_OUTCOME_UNKNOWN');
      await worker.onModuleDestroy(); assert.equal(calls, 1);
    } finally { clearTimeout(timer); await worker.onModuleDestroy(); }
  });
});
