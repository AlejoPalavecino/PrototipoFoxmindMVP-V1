import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { reserveAiTextBudget } from './text-budget.ts';
import { readAiConfiguration } from './configuration.ts';

// Amount per reservation: ceil(11 * 0.1) + ceil(100 * 0.02) = 2 + 2 = 4 microusd.
const base = { maxOutputTokens: 100, inputUsdPerMillion: 0.1, outputUsdPerMillion: 0.02, dailyBudgetUsd: 0.1,
  dailyActorRequests: 5, dailyGlobalRequests: 10 };
function fake(ownerId, { globalUsed = 0n, actorUsed = 0n } = {}) {
  const day = new Date('2026-10-31T00:00:00.000Z'), usage = new Map([['global', globalUsed], [ownerId, actorUsed]]);
  return { async query(sql, ...args) {
    if (/pg_advisory_xact_lock\(78123001,hashtext/u.test(sql)) return [{}];
    if (sql.includes('pg_advisory_xact_lock(78123003') || sql.includes('WITH expired AS')) return [];
    if (sql.includes('FROM period, users')) return [{ month: '2026-10-01', observed_at: day, budget: 5_000_000 }];
    if (sql.includes('GROUP BY capability')) return [];
    if (sql.includes('WITH reserved AS')) return [{ id: 1n }];
    if (/SELECT dispatch_count,execution_profile FROM /u.test(sql)) return [{ dispatch_count: 0, execution_profile: null }];
    if (/INSERT INTO ai_usage_daily/u.test(sql)) return [{}];
    if (/SELECT request_count,/u.test(sql)) return [{ request_count: 0, total: String(usage.get(args[0])) }];
    return [{}];
  } };
}
const attempt = (tx, ownerId, config) => reserveAiTextBudget(tx, { id: randomUUID(), owner_id: ownerId }, 11, config);

test('an actor at its dedicated daily cap is rejected while the global scope still has room', async () => {
  const owner = randomUUID(), config = { ...base, dailyActorBudgetUsd: 0.05 };
  await assert.rejects(attempt(fake(owner, { actorUsed: 49_999n }), owner, config), { code: 'AI_BUDGET_EXCEEDED' });
  assert.equal(await attempt(fake(owner, { actorUsed: 49_996n }), owner, config), true);
  // The global scope keeps the global cap and its own error code.
  await assert.rejects(attempt(fake(owner, { globalUsed: 99_999n }), owner, config), { code: 'AI_GLOBAL_DAILY_BUDGET_EXCEEDED' });
});

test('without a per-actor cap the owner scope keeps the global cap', async () => {
  const owner = randomUUID();
  assert.equal(await attempt(fake(owner, { actorUsed: 49_999n }), owner, base), true);
  await assert.rejects(attempt(fake(owner, { actorUsed: 99_999n }), owner, base), { code: 'AI_BUDGET_EXCEEDED' });
});

test('AI_DAILY_ACTOR_BUDGET_USD is optional, positive and not above the global budget', () => {
  const env = { AI_ENABLED: 'true', AI_BACKEND: 'gemini-developer', AI_MODEL: 'synthetic', AI_API_KEY: 'synthetic-key',
    AI_DAILY_ACTOR_REQUESTS: '5', AI_DAILY_GLOBAL_REQUESTS: '10', AI_MAX_INPUT_TOKENS: '1000', AI_MAX_OUTPUT_TOKENS: '100',
    AI_DAILY_BUDGET_USD: '2', AI_INPUT_USD_PER_MILLION: '1', AI_OUTPUT_USD_PER_MILLION: '2', AI_DEADLINE_MS: '1000',
    AI_MAX_CONCURRENCY: '1', AI_MAX_DISPATCHES: '1', AI_MAX_JOB_AGE_MS: '60000' };
  assert.equal(readAiConfiguration({ ...env }).dailyActorBudgetUsd, undefined);
  assert.equal(readAiConfiguration({ ...env, AI_DAILY_ACTOR_BUDGET_USD: '0.5' }).dailyActorBudgetUsd, 0.5);
  assert.equal(readAiConfiguration({ ...env, AI_DAILY_ACTOR_BUDGET_USD: '2' }).dailyActorBudgetUsd, 2);
  for (const bad of ['2.01', '0', '-1', 'abc', '', '1e1']) {
    assert.throws(() => readAiConfiguration({ ...env, AI_DAILY_ACTOR_BUDGET_USD: bad }), { code: 'AI_UNAVAILABLE' }, bad);
  }
});

test('daily AI quota days are Buenos Aires calendar days, like the monthly quota (B11)', async () => {
  const owner = randomUUID(), calls = [], tx = fake(owner), query = tx.query;
  tx.query = async (sql, ...args) => { calls.push(sql); return query(sql, ...args); };
  assert.equal(await attempt(tx, owner, base), true);
  const dayed = calls.filter(sql => /ai_usage_daily|usage_day=|operational_day/u.test(sql) && /transaction_timestamp\(\)/u.test(sql));
  assert.ok(dayed.length >= 4, `expected day-bucketed statements, got ${dayed.length}`);
  for (const sql of dayed) {
    assert.doesNotMatch(sql, /AT TIME ZONE 'UTC'/u);
    assert.match(sql, /AT TIME ZONE 'America\/Argentina\/Buenos_Aires'\)::date/u);
  }
});
