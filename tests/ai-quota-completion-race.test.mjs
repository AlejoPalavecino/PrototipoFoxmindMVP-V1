import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { createFoxyTurnCompletion } from '../apps/api/src/modules/foxy/turns/infrastructure/turn-completion.ts';
import { createFoxyVisualCompletion } from '../apps/api/src/modules/foxy/visuals/infrastructure/visual-completion.ts';
import { reserveAiMonthlyBudget, settleAiMonthlyBudget } from '../apps/api/src/platform/ai/monthly-budget.ts';
import { recordObservedCost } from '../apps/api/src/platform/ai/observed-cost.ts';
import { applyReceipt } from '../scripts/reconcile-ai-cost.mjs';
import { withAgendaDatabase } from './agenda-database-helpers.test.mjs';

async function account(pool) {
  const ownerId = randomUUID();
  await pool.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
    VALUES($1,now(),$2,$2,'Synthetic','AI','no-login',now(),'teacher')`, [ownerId, `${ownerId}@example.invalid`]);
  return ownerId;
}

async function transaction(pool, operation) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await operation({ async query(sql, ...parameters) { return (await client.query(sql, parameters)).rows; } });
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

const pricing = { inputUsdPerMillion: 2, outputUsdPerMillion: 3 };
const metadata = { capability: 'foxy', provider: 'gemini', model: 'synthetic', pricing };

const billing = async (pool, job) => (await pool.query(`SELECT status,actor_microusd,platform_microusd
  FROM ai_monthly_reservations WHERE job_id=$1`, [job.jobId])).rows[0];

const movementEvents = async (pool, job) => (await pool.query('SELECT event FROM ai_monthly_budget_movements WHERE job_id=$1 ORDER BY id',
  [job.jobId])).rows.map(row => row.event);

function moveToExpiredPeriod(pool, job) {
  return pool.query(`UPDATE ai_monthly_reservations
    SET reserved_at=(period_start::timestamp-interval '1 month') AT TIME ZONE 'America/Argentina/Buenos_Aires',
      expires_at=(period_start::timestamp-interval '1 month'+interval '24 hours') AT TIME ZONE 'America/Argentina/Buenos_Aires',
      period_start=(period_start-interval '1 month')::date WHERE job_id=$1`, [job.jobId]);
}

test('Foxy text and visual completion can finish concurrently for the same account', { timeout: 90000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    const ownerId = await account(pool), conversationId = randomUUID(), leaseNonce = randomUUID();

    const textLocked = Promise.withResolvers();
    const visualStarted = Promise.withResolvers();
    const resumeText = Promise.withResolvers();
    const database = branch => ({
      async $transaction(work) {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          if (branch === 'visual') visualStarted.resolve((await client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid);
          return await work({ async $queryRawUnsafe(sql, ...parameters) {
            const result = await client.query(sql, parameters);
            if (branch === 'text' && sql.includes('FROM users') && sql.includes('FOR SHARE')) {
              textLocked.resolve();
              await resumeText.promise;
            }
            return result.rows;
          } });
        } finally {
          try { await client.query('ROLLBACK'); } finally { client.release(); }
        }
      },
    });
    const budget = { settle() { assert.fail('The synthetic lease must never settle anything'); } };
    const text = createFoxyTurnCompletion({ database: database('text'), budget, configuration: { maxJobAgeMs: 1000 } });
    const visual = createFoxyVisualCompletion({ database: database('visual'), budget });
    const failed = { state: 'FAILED', errorCode: 'AI_UNAVAILABLE' };
    const finishingText = text.finish({ ownerId, conversationId, leaseNonce, turnId: randomUUID() }, failed);
    const finishingVisual = Promise.race([textLocked.promise, finishingText])
      .then(() => visual.finish({ ownerId, conversationId, leaseNonce, jobId: randomUUID(), assetId: randomUUID() }, failed));
    const pending = Promise.allSettled([finishingText, finishingVisual]);
    try {
      const visualPid = await Promise.race([visualStarted.promise, delay(4000, undefined, { ref: false })]);
      assert.ok(visualPid, 'Visual completion did not start while text held the account lock');
      for (let attempt = 0; ; attempt++) {
        const [{ waiting }] = (await pool.query('SELECT cardinality(pg_blocking_pids($1)) > 0 AS waiting', [visualPid])).rows;
        if (waiting) break;
        assert.ok(attempt < 100, 'Visual completion did not reach the conflicting lock');
        await delay(20);
      }
    } finally {
      resumeText.resolve();
      await pending;
    }
    const outcomes = await pending;
    assert.deepEqual(outcomes.map(item => item.status === 'rejected' ? item.reason.code : item.value), [false, false]);
  });
});

test('a late receipt uses the frozen tariff and settles only the original operation', { timeout: 90000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    const [ownerId, otherOwnerId] = await Promise.all([account(pool), account(pool)]);
    const job = { namespace: 'foxy_turns', jobId: randomUUID(), ownerId };
    await transaction(pool, async tx => {
      assert.equal(await reserveAiMonthlyBudget(tx, job, 500n, metadata), true);
      await settleAiMonthlyBudget(tx, job, null);
    });
    const usage = { inputTokens: 10, outputTokens: 20 };
    await transaction(pool, tx => recordObservedCost(tx, { ...job, ownerId: otherOwnerId }, usage));
    assert.deepEqual(await billing(pool, job), { status: 'PENDING', actor_microusd: '0', platform_microusd: '0' });

    await moveToExpiredPeriod(pool, job);
    await transaction(pool, tx => recordObservedCost(tx, job, usage));
    await transaction(pool, tx => recordObservedCost(tx, job, { inputTokens: 100, outputTokens: 200 }));
    assert.deepEqual(await billing(pool, job), { status: 'RECONCILED', actor_microusd: '0', platform_microusd: '80' });
    assert.deepEqual(await movementEvents(pool, job), ['RESERVED', 'PENDING', 'EXPIRED', 'RECONCILED']);
    const turns = await pool.query('SELECT count(*)::int AS recorded FROM foxy_turns WHERE id=$1', [job.jobId]);
    assert.equal(turns.rows[0].recorded, 0);
  });
});

test('operator receipts reconcile pending and expired operations atomically and exactly once', { timeout: 90000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    const ownerId = await account(pool);
    const first = { namespace: 'foxy_turns', jobId: randomUUID(), ownerId };
    const second = { ...first, jobId: randomUUID() };
    for (const job of [first, second]) await transaction(pool, async tx => {
      assert.equal(await reserveAiMonthlyBudget(tx, job, 200n, metadata), true);
      await settleAiMonthlyBudget(tx, job, null);
    });
    const receipt = { provider: metadata.provider, model: metadata.model, namespace: first.namespace,
      jobId: first.jobId, reference: 'synthetic-report-1', actualMicrousd: '125' };
    const client = await pool.connect();
    try {
      assert.equal((await applyReceipt(client, receipt)).status, 'SETTLED');
      assert.equal((await applyReceipt(client, receipt)).status, 'SETTLED');
      assert.deepEqual(await billing(pool, first), { status: 'SETTLED', actor_microusd: '125', platform_microusd: '0' });
      assert.deepEqual(await movementEvents(pool, first), ['RESERVED', 'PENDING', 'SETTLED']);

      await assert.rejects(applyReceipt(client, { ...receipt, jobId: second.jobId }), /ya se vinculó/);
      assert.deepEqual(await billing(pool, second), { status: 'PENDING', actor_microusd: '0', platform_microusd: '0' });
      assert.deepEqual(await movementEvents(pool, second), ['RESERVED', 'PENDING']);

      await moveToExpiredPeriod(pool, second);
      await transaction(pool, tx => settleAiMonthlyBudget(tx, second, null));
      assert.deepEqual(await billing(pool, second), { status: 'EXPIRED', actor_microusd: '0', platform_microusd: '200' });
      assert.equal((await applyReceipt(client, { ...receipt, jobId: second.jobId, reference: 'synthetic-report-2' })).status, 'RECONCILED');
      assert.deepEqual(await billing(pool, second), { status: 'RECONCILED', actor_microusd: '0', platform_microusd: '125' });
      assert.deepEqual(await movementEvents(pool, second), ['RESERVED', 'PENDING', 'EXPIRED', 'RECONCILED']);
      const receipts = await client.query('SELECT reference,job_id FROM ai_monthly_provider_receipts ORDER BY reference');
      assert.deepEqual(receipts.rows, [{ reference: receipt.reference, job_id: first.jobId }, { reference: 'synthetic-report-2', job_id: second.jobId }]);
    } finally { client.release(); }
  });
});
