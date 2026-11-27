import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const api = () => Promise.all([import("../../../../../../platform/ai/errors.ts"),import("../../../../../study/generation/infrastructure/providers/study-adapter.ts"),import("../../../../../activities/generation/infrastructure/providers/activity-adapter.ts"),import("../../../../../../platform/ai/configuration.ts"),import("../../../../../curriculum/generation/infrastructure/providers/gemini-adapter.ts"),import("../../../../../../platform/ai/text-budget.ts"),import("../../../../visuals/infrastructure/providers/foxy-image-budget.ts"),import("../foxy-adapter.ts"),import("../../../../visuals/infrastructure/providers/foxy-image-adapter.ts"),import("../../../../visuals/infrastructure/providers/foxy-diagram-adapter.ts")]).then(([m0,m1,m2,m3,m4,m5,m6,m7,m8,m9]) => Object.freeze({AiError: m0.AiError,createGeminiStudyProvider: m1.createGeminiStudyProvider,GeminiActivityGenerationAdapter: m2.GeminiActivityGenerationAdapter,createGeminiActivityGenerationAdapter: m2.createGeminiActivityGenerationAdapter,readAiConfiguration: m3.readAiConfiguration,GeminiExtractionAdapter: m4.GeminiExtractionAdapter,createGeminiExtractionAdapter: m4.createGeminiExtractionAdapter,reserveAiTextBudget: m5.reserveAiTextBudget,settleAiTextBudget: m5.settleAiTextBudget,tokenCost: m5.tokenCost,quoteFoxyImageBudget: m6.quoteFoxyImageBudget,GeminiFoxyTextAdapter: m7.GeminiFoxyTextAdapter,createGeminiFoxyTextAdapter: m7.createGeminiFoxyTextAdapter,GeminiFoxyImageAdapter: m8.GeminiFoxyImageAdapter,createGeminiFoxyImageAdapter: m8.createGeminiFoxyImageAdapter,GeminiFoxyDiagramAdapter: m9.GeminiFoxyDiagramAdapter,createGeminiFoxyDiagramAdapter: m9.createGeminiFoxyDiagramAdapter}));
const shim = () => import("../../../../../curriculum/generation/infrastructure/ai/budget.ts");
const tables = ['classroom_curriculum_extractions', 'activity_ai_generations', 'student_ai_reports', 'grading_ai_jobs'];
const config = { maxOutputTokens: 100, inputUsdPerMillion: 0.1, outputUsdPerMillion: 0.02,
  dailyBudgetUsd: 0.1, dailyActorRequests: 5, dailyGlobalRequests: 10 };
function fake({ dispatchCount = 0, usageCount = 0, amount = 0n } = {}) {
  const calls = [], day = new Date('2026-10-31T00:00:00.000Z');
  const job = { dispatchCount, amount, day, input: null, output: null };
  let monthly;
  const usage = new Map([['global', { count: usageCount, reserved: 0n, consumed: 0n }]]);
  const tx = { query: async (sql, ...args) => {
    calls.push({ sql, args });
    if (/pg_advisory_xact_lock\(78123001,hashtext/u.test(sql)) return [{}];
    if (/SELECT scope,reserved_microusd FROM ai_usage_daily[\s\S]*ORDER BY \(scope='global'\) DESC FOR UPDATE/u.test(sql)) return [];
    if (sql.includes('pg_advisory_xact_lock(78123003') || sql.includes('WITH expired AS')) return [];
    if (sql.includes('FROM period, users')) return [{ month: '2026-10-01', observed_at: day, budget: 5_000_000 }];
    if (sql.includes('GROUP BY capability')) return [];
    if (sql.includes('WITH reserved AS')) {
      monthly = { status: 'RESERVED', reserved_microusd: BigInt(args[8]), platform_microusd: 0n, reserved_at: day };
      return [{ id: 1n }];
    }
    if (sql.includes('SELECT status,reserved_microusd,platform_microusd,reserved_at')) return monthly ? [monthly] : [];
    if (sql.includes('WITH updated AS')) { monthly.status = args[3]; return [{ id: 2n }]; }
    if (/SELECT dispatch_count,execution_profile FROM /u.test(sql)) return [{ dispatch_count: job.dispatchCount, execution_profile: null }];
    if (/INSERT INTO ai_usage_daily/u.test(sql)) {
      if (!usage.has(args[0])) usage.set(args[0], { count: usageCount, reserved: 0n, consumed: 0n });
      return [{}];
    }
    if (/SELECT request_count,/u.test(sql)) {
      const entry = usage.get(args[0]); return [{ request_count: entry.count, total: String(entry.reserved + entry.consumed) }];
    }
    if (/UPDATE ai_usage_daily SET request_count/u.test(sql)) {
      for (const scope of ['global', args[0]]) { const entry = usage.get(scope); entry.count++; entry.reserved += BigInt(args[1]); }
      return [{}];
    }
    if (/UPDATE \w+ SET reserved_microusd=\$2::bigint/u.test(sql)) {
      job.amount = BigInt(args[1]); job.input = args[2]; job.dispatchCount++; return [{}];
    }
    if (/SELECT reserved_microusd::text AS amount,\s+execution_profile,\s+usage_day AS day FROM /u.test(sql)) return [{ amount: String(job.amount), day: job.day, execution_profile: null }];
    if (/UPDATE ai_usage_daily SET reserved_microusd=reserved_microusd-/u.test(sql)) {
      for (const scope of ['global', args[1]]) { const entry = usage.get(scope); entry.reserved -= BigInt(args[2]); entry.consumed += BigInt(args[3]); }
      return [{}];
    }
    if (/UPDATE \w+ SET reserved_microusd=0/u.test(sql)) { job.amount = 0n; job.output = args[1]; return [{}]; }
    throw new Error('Unexpected budget query');
  } };
  return { tx, calls, job, usage, get monthly() { return monthly; } };
}
async function functions() {
  const m = await api();
  for (const name of ['reserveAiTextBudget', 'settleAiTextBudget', 'tokenCost']) assert.equal(typeof m[name], 'function', name);
  return m;
}

test('public shared budget exports are identical to legacy shim functions', async () => {
  const shared = await functions(), legacy = await shim();
  assert.equal(legacy.reserve, shared.reserveAiTextBudget);
  assert.equal(legacy.settle, shared.settleAiTextBudget);
  assert.equal(legacy.tokenCost, shared.tokenCost);
});

test('token cost uses exact upward rounding for fractional and exponential rates', async () => {
  const { tokenCost } = await functions();
  for (const [tokens, rate, expected] of [[0, 0.1, 0n], [1, 0.1, 1n], [10, 0.1, 1n], [11, 0.1, 2n],
    [100, 1e-7, 1n], [100, 0.02, 2n], [1000001, 0.5, 500001n]]) assert.equal(tokenCost(tokens, rate), expected);
});

test('reserve uses shared lock and ledger for default and all four existing tables', async () => {
  const { reserveAiTextBudget: reserve } = await functions();
  for (const table of [undefined, ...tables]) {
    const f = fake(), row = { id: randomUUID(), owner_id: randomUUID() };
    assert.equal(await reserve(f.tx, row, 11, config, table), true);
    assert.equal(f.calls[0].sql, 'SELECT 1 FROM pg_advisory_xact_lock(78123001,hashtext(($1::uuid)::text))');
    assert.deepEqual(f.calls[0].args, [row.owner_id]);
    const effective = table ?? tables[0];
    assert.ok(f.calls.some(c => c.sql.includes(`SELECT dispatch_count,execution_profile FROM ${effective}`)));
    assert.ok(f.calls.some(c => c.sql.includes(`UPDATE ${effective} SET reserved_microusd=`)));
    for (const call of f.calls.filter(c => c.sql.includes('ai_usage_daily'))) assert.match(call.sql, /study-plan-v1/u);
    for (const scope of ['global', row.owner_id]) {
      const entry = f.usage.get(scope); assert.equal(entry.count, 1); assert.equal(entry.reserved, 4n); assert.equal(entry.consumed, 0n);
    }
    assert.equal(f.job.dispatchCount, 1); assert.equal(f.job.amount, 4n); assert.equal(f.job.input, 11);
    assert.equal(f.monthly.reserved_microusd, 4n);
  }
});

test('duplicate dispatch or exhausted global or actor quota cannot reserve again', async () => {
  const { reserveAiTextBudget: reserve } = await functions(), row = { id: randomUUID(), owner_id: randomUUID() };
  const f = fake({ dispatchCount: 1 });
  assert.equal(await reserve(f.tx, row, 11, config), false);
  assert.equal(f.calls.some(c => c.sql.includes('ai_usage_daily')), false);
  for (const [quota, code] of [['dailyGlobalRequests', 'AI_GLOBAL_DAILY_BUDGET_EXCEEDED'], ['dailyActorRequests', 'AI_BUDGET_EXCEEDED']]) {
    const exhausted = fake(), limits = { ...config, [quota]: 0 };
    await assert.rejects(reserve(exhausted.tx, row, 11, limits), { code });
    assert.equal(exhausted.job.dispatchCount, 0); assert.equal(exhausted.job.amount, 0n);
    assert.equal(exhausted.monthly, undefined);
  }
});

test('settle without usage consumes full reservation and repeated settle does nothing', async () => {
  const { reserveAiTextBudget: reserve, settleAiTextBudget: settle } = await functions();
  for (const table of tables) {
    const f = fake(), row = { id: randomUUID(), owner_id: randomUUID() };
    assert.equal(await reserve(f.tx, row, 11, config, table), true);
    await settle(f.tx, row, config, undefined, table);
    const reservationRead = f.calls.find(call => call.sql.includes('AS amount') && call.sql.includes('execution_profile'));
    assert.ok(reservationRead?.sql.includes('FROM ' + table + ' WHERE id=$1::uuid FOR UPDATE'));
    assert.deepEqual(reservationRead.args, [row.id]);
    for (const scope of ['global', row.owner_id]) {
      const entry = f.usage.get(scope); assert.equal(entry.reserved, 0n); assert.equal(entry.consumed, 4n);
    }
    assert.equal(f.job.amount, 0n); assert.equal(f.job.output, null);
    assert.equal(f.monthly.status, 'PENDING');
    const writes = f.calls.filter(call => /^\s*UPDATE\b/u.test(call.sql)).length;
    await settle(f.tx, row, config, undefined, table);
    assert.equal(f.calls.filter(call => /^\s*UPDATE\b/u.test(call.sql)).length, writes);
    await settle(f.tx, row, config, { inputTokens: 10, outputTokens: 5 }, table);
    assert.equal(f.monthly.status, 'SETTLED');
    for (const scope of ['global', row.owner_id]) assert.equal(f.usage.get(scope).consumed, 4n);
  }
});
