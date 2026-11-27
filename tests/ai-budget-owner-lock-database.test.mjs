import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from './agenda-database-helpers.test.mjs';
import { reserveAiTextBudget, settleAiTextBudget } from '../apps/api/src/platform/ai/text-budget.ts';

// B3: the budget lock is per owner. One owner's stalled reservation must not stop another owner's,
// while the exact global daily cap still holds under concurrency.
const configuration = { backend: 'gemini-developer', apiKey: 'synthetic-only', model: 'synthetic-model',
  maxInputTokens: 100, maxOutputTokens: 10, deadlineMs: 8000, maxConcurrency: 4,
  dailyActorRequests: 10, dailyGlobalRequests: 3, dailyBudgetUsd: 1, inputUsdPerMillion: 1, outputUsdPerMillion: 1 };
const timeout = (promise, ms, message) => Promise.race([promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))]);

async function fixture(pool) {
  const transaction = async (operation, { commit = true } = {}) => {
    const client = await pool.connect();
    await client.query('BEGIN');
    try {
      const result = await operation({ async query(sql, ...values) { return (await client.query(sql, values)).rows; } }, client);
      await client.query(commit ? 'COMMIT' : 'ROLLBACK');
      return result;
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  };
  const owner = async () => {
    const id = randomUUID();
    await pool.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
      VALUES($1,now(),$2,$2,'Synthetic','AI','no-login',now(),'student')`, [id, `${id}@example.invalid`]);
    return id;
  };
  const job = async ownerId => {
    const id = randomUUID();
    await pool.query(`INSERT INTO study_ai_dispatches(id,owner_id,request_id,lease_until) VALUES($1,$2,$3,now()+interval '1 minute')`,
      [id, ownerId, randomUUID()]);
    return { id, owner_id: ownerId };
  };
  const reserve = row => transaction(tx => reserveAiTextBudget(tx, row, 10, configuration, 'study_ai_dispatches'));
  return { transaction, owner, job, reserve };
}

test('PostgreSQL: a stalled reservation of one owner does not block another owner (B3)', { timeout: 90000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    const { owner, job, reserve } = await fixture(pool);
    const [ownerA, ownerB] = [await owner(), await owner()];
    const [jobA, jobB] = [await job(ownerA), await job(ownerB)];
    // Another transaction holds owner A's job row (a lease renewal or a cancellation, for example).
    const holder = await pool.connect();
    let stalled;
    try {
      await holder.query('BEGIN');
      await holder.query('SELECT id FROM study_ai_dispatches WHERE id=$1 FOR UPDATE', [jobA.id]);
      stalled = reserve(jobA);
      for (let n = 0; n < 50; n++) {
        const waiting = await pool.query(`SELECT count(*)::int AS n FROM pg_stat_activity
          WHERE wait_event_type='Lock' AND query LIKE '%FROM study_ai_dispatches WHERE id=$1::uuid FOR UPDATE%'`);
        if (waiting.rows[0].n > 0) break;
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      assert.equal(await timeout(reserve(jobB), 3000, 'owner B waited behind owner A'), true);
    } finally {
      await holder.query('ROLLBACK');
      holder.release();
    }
    assert.equal(await timeout(stalled, 3000, 'owner A did not resume'), true);
  });
});

test('PostgreSQL: concurrent owners never exceed the global daily request cap', { timeout: 90000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    const { owner, job, reserve, transaction } = await fixture(pool);
    const owners = await Promise.all(Array.from({ length: 6 }, owner));
    const jobs = await Promise.all(owners.map(job));
    const outcomes = await Promise.allSettled(jobs.map(reserve));
    const admitted = outcomes.filter(item => item.status === 'fulfilled' && item.value === true).length;
    const rejected = outcomes.filter(item => item.status === 'rejected');
    assert.equal(admitted, configuration.dailyGlobalRequests);
    assert.ok(rejected.every(item => item.reason.code === 'AI_GLOBAL_DAILY_BUDGET_EXCEEDED'), String(rejected.map(item => item.reason.code)));
    const [global] = (await pool.query(`SELECT request_count FROM ai_usage_daily WHERE scope='global'`)).rows;
    assert.equal(global.request_count, configuration.dailyGlobalRequests);
    // Settling every admitted job concurrently keeps the global ledger exact (no lost update, no deadlock).
    const admittedJobs = jobs.filter((_, index) => outcomes[index].status === 'fulfilled');
    await Promise.all(admittedJobs.map(row => transaction(tx => settleAiTextBudget(tx, row, configuration,
      { inputTokens: 10, outputTokens: 10 }, 'study_ai_dispatches'))));
    const ledger = (await pool.query(`SELECT scope,reserved_microusd::int AS reserved,consumed_microusd::int AS consumed
      FROM ai_usage_daily ORDER BY scope='global' DESC`)).rows;
    assert.deepEqual(ledger[0], { scope: 'global', reserved: 0, consumed: 20 * admittedJobs.length });
    assert.equal(ledger.slice(1).reduce((sum, row) => sum + row.consumed, 0), 20 * admittedJobs.length);
  });
});
