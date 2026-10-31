import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const api = () => import('./index.ts');
const shim = () => import('../classrooms/ai/budget.ts');
const tables = ['classroom_curriculum_extractions', 'activity_ai_generations', 'student_ai_reports', 'grading_ai_jobs'];
const config = { maxOutputTokens: 100, inputUsdPerMillion: 0.1, outputUsdPerMillion: 0.02,
  dailyBudgetUsd: 0.1, dailyActorRequests: 5, dailyGlobalRequests: 10 };
function fake({ dispatchCount = 0, usageCount = 0, amount = 0n } = {}) {
  const calls = [], day = new Date('2026-10-31T00:00:00.000Z');
  const job = { dispatchCount, amount, day, input: null, output: null };
  const usage = new Map([['global', { count: usageCount, reserved: 0n, consumed: 0n }]]);
  const tx = { query: async (sql, ...args) => {
    calls.push({ sql, args });
    if (/pg_advisory_xact_lock\(78123001\)/u.test(sql)) return [{}];
    if (/SELECT dispatch_count FROM /u.test(sql)) return [{ dispatch_count: job.dispatchCount }];
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
    if (/SELECT reserved_microusd::text AS amount/u.test(sql)) return [{ amount: String(job.amount), day: job.day }];
    if (/UPDATE ai_usage_daily SET reserved_microusd=reserved_microusd-/u.test(sql)) {
      for (const scope of ['global', args[1]]) { const entry = usage.get(scope); entry.reserved -= BigInt(args[2]); entry.consumed += BigInt(args[3]); }
      return [{}];
    }
    if (/UPDATE \w+ SET reserved_microusd=0/u.test(sql)) { job.amount = 0n; job.output = args[1]; return [{}]; }
    throw new Error('Unexpected budget query');
  } };
  return { tx, calls, job, usage };
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
    assert.equal(f.calls[0].sql, 'SELECT 1 FROM pg_advisory_xact_lock(78123001)');
    const effective = table ?? tables[0];
    assert.ok(f.calls.some(c => c.sql.includes(`SELECT dispatch_count FROM ${effective}`)));
    assert.ok(f.calls.some(c => c.sql.includes(`UPDATE ${effective} SET reserved_microusd=`)));
    for (const call of f.calls.filter(c => c.sql.includes('ai_usage_daily'))) assert.match(call.sql, /study-plan-v1/u);
    for (const scope of ['global', row.owner_id]) {
      const entry = f.usage.get(scope); assert.equal(entry.count, 1); assert.equal(entry.reserved, 4n); assert.equal(entry.consumed, 0n);
    }
    assert.equal(f.job.dispatchCount, 1); assert.equal(f.job.amount, 4n); assert.equal(f.job.input, 11);
  }
});

test('duplicate dispatch or exhausted global or actor quota cannot reserve again', async () => {
  const { reserveAiTextBudget: reserve } = await functions(), row = { id: randomUUID(), owner_id: randomUUID() };
  const f = fake({ dispatchCount: 1 });
  assert.equal(await reserve(f.tx, row, 11, config), false);
  assert.equal(f.calls.some(c => c.sql.includes('ai_usage_daily')), false);
  for (const quota of ['dailyGlobalRequests', 'dailyActorRequests']) {
    const exhausted = fake(), limits = { ...config, [quota]: 0 };
    assert.equal(await reserve(exhausted.tx, row, 11, limits), false);
    assert.equal(exhausted.job.dispatchCount, 0); assert.equal(exhausted.job.amount, 0n);
  }
});

test('settle without usage consumes full reservation and repeated settle does nothing', async () => {
  const { reserveAiTextBudget: reserve, settleAiTextBudget: settle } = await functions();
  for (const table of tables) {
    const f = fake(), row = { id: randomUUID(), owner_id: randomUUID() };
    assert.equal(await reserve(f.tx, row, 11, config, table), true);
    await settle(f.tx, row, config, undefined, table);
    for (const scope of ['global', row.owner_id]) {
      const entry = f.usage.get(scope); assert.equal(entry.reserved, 0n); assert.equal(entry.consumed, 4n);
    }
    assert.equal(f.job.amount, 0n); assert.equal(f.job.output, null);
    const writes = f.calls.filter(call => /^\s*UPDATE\b/u.test(call.sql)).length;
    await settle(f.tx, row, config, undefined, table);
    assert.equal(f.calls.filter(call => /^\s*UPDATE\b/u.test(call.sql)).length, writes);
  }
});
