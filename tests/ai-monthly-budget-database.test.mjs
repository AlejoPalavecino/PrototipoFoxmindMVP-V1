import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from './agenda-database-helpers.test.mjs';
import { readAiMonthlyBudget, reserveAiMonthlyBudget, settleAiMonthlyBudget, sweepAiMonthlyBudget } from '../apps/api/src/platform/ai/monthly-budget.ts';
import { reserveAiImageBudget, settleAiImageBudget } from '../apps/api/src/platform/ai/text-budget.ts';

test('PostgreSQL: presupuesto mensual por rol, concurrencia, exceso, caducidad y conciliación', { timeout: 90000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    async function transaction(operation) {
      const client = await pool.connect();
      await client.query('BEGIN');
      try {
        const result = await operation({ async query(sql, ...parameters) { return (await client.query(sql, parameters)).rows; } });
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
    }
    async function account(role) {
      const owner = randomUUID();
      await pool.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
        VALUES($1,now(),$2,$2,'Synthetic','AI','no-login',now(),$3)`, [owner, `${owner}@example.invalid`, role]);
      return owner;
    }
    const student = await account('student'), teacher = await account('teacher');
    const key = (ownerId, namespace) => ({ ownerId, namespace, jobId: randomUUID() });
    const first = key(student, 'study_ai_dispatches'), second = key(student, 'study_image');
    const reserve = (work, amount) => transaction(tx => reserveAiMonthlyBudget(tx, work, amount, {
      capability: work.namespace === 'study_image' ? 'study_image' : 'study', provider: 'gemini', model: 'synthetic',
      pricing: { inputUsdPerMillion: 0.25, outputUsdPerMillion: 1.50 },
    }));
    const read = owner => transaction(tx => readAiMonthlyBudget(tx, owner));
    const settle = (work, amount) => transaction(tx => settleAiMonthlyBudget(tx, work, amount));
    const initial = await read(student);
    assert.equal(initial.limitMicrousd, 3_000_000);
    assert.equal((await read(teacher)).limitMicrousd, 5_000_000);
    assert.equal(initial.remainingMicrousd, initial.limitMicrousd);
    assert.ok(initial.periodStart.endsWith('T03:00:00.000Z'));
    assert.ok(initial.renewsAt.endsWith('T03:00:00.000Z'));
    assert.equal(await transaction(tx => readAiMonthlyBudget(tx, student, initial)), null);
    assert.equal((await transaction(tx => readAiMonthlyBudget(tx, student, {
      ...initial, periodStart: '2026-01-01T03:00:00.000Z',
    }))).periodStart, initial.periodStart);
    const result = await Promise.allSettled([reserve(first, 2_000_000n), reserve(second, 2_000_000n)]);
    assert.equal(result.filter(outcome => outcome.status === 'fulfilled' && outcome.value === true).length, 1);
    const winner = result[0].status === 'fulfilled' ? first : second;
    const denied = result.find(outcome => outcome.status === 'rejected').reason;
    assert.equal(denied.code, 'AI_MONTHLY_BUDGET_EXCEEDED');
    assert.deepEqual(denied.quota, { availableMicrousd: 1_000_000, requiredMicrousd: 2_000_000, renewsAt: initial.renewsAt });
    assert.equal(await reserve(winner, 2_000_000n), false);
    assert.equal((await read(student)).remainingMicrousd, 1_000_000);
    await settle(winner, 2_500_000n);
    await settle(winner, 2_600_000n);
    const uncertain = key(student, 'study_image');
    assert.equal(await reserve(uncertain, 750_000n), true);
    await settle(uncertain, null);
    assert.equal((await read(student)).reservedMicrousd, 750_000);
    const lockOwner = key(teacher, 'foxy_turns');
    assert.equal(await reserve(lockOwner, 1_000_000n), true);
    const untouched = await pool.query(`SELECT extract(epoch FROM expires_at-reserved_at)::int AS window
      FROM ai_monthly_reservations WHERE job_id=$1`, [lockOwner.jobId]);
    assert.equal(untouched.rows[0].window, 86400);
    // Expiry works for idle accounts and does not wait on an older locked owner at the head of the queue.
    await pool.query(`UPDATE ai_monthly_reservations SET
      reserved_at=$2::timestamptz - interval '24 hours', expires_at=$2::timestamptz,
      period_start=date_trunc('month',($2::timestamptz - interval '24 hours') AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
      WHERE job_id=$1`, [lockOwner.jobId, new Date(Date.now() - 5000)]);
    await pool.query(`UPDATE ai_monthly_reservations SET
      reserved_at=$2::timestamptz - interval '24 hours', expires_at=$2::timestamptz,
      period_start=date_trunc('month',($2::timestamptz - interval '24 hours') AT TIME ZONE 'America/Argentina/Buenos_Aires')::date
      WHERE job_id=$1`, [uncertain.jobId, new Date(Date.now() - 3000)]);
    const held = await pool.connect();
    try {
      await held.query('BEGIN');
      await held.query('SELECT pg_advisory_xact_lock(78123003,hashtext(($1::uuid)::text))', [teacher]);
      const cursor = await transaction(tx => sweepAiMonthlyBudget(tx, null, 1));
      assert.equal(cursor.job_id, lockOwner.jobId);
      assert.equal((await transaction(tx => sweepAiMonthlyBudget(tx, cursor, 1))).job_id, uncertain.jobId);
      const statuses = await pool.query('SELECT job_id,status FROM ai_monthly_reservations WHERE job_id IN ($1,$2)', [lockOwner.jobId, uncertain.jobId]);
      assert.deepEqual(new Map(statuses.rows.map(r => [r.job_id, r.status])), new Map([[lockOwner.jobId, 'RESERVED'], [uncertain.jobId, 'EXPIRED']]));
    } finally {
      await held.query('ROLLBACK');
      held.release();
    }
    assert.equal(await transaction(tx => sweepAiMonthlyBudget(tx, null)), null);
    assert.equal((await pool.query('SELECT status FROM ai_monthly_reservations WHERE job_id=$1', [lockOwner.jobId])).rows[0].status, 'EXPIRED');
    const expired = await read(student);
    assert.equal(expired.reservedMicrousd, 0);
    assert.equal(expired.remainingMicrousd, 1_000_000);
    assert.ok(expired.version > initial.version);
    await settle(uncertain, 900_000n);
    assert.equal((await read(student)).remainingMicrousd, expired.remainingMicrousd);
    const all = await pool.query('SELECT job_id,actor_microusd,platform_microusd,status,pricing FROM ai_monthly_reservations WHERE owner_id=$1', [student]);
    const rows = new Map(all.rows.map(row => [row.job_id, [row.actor_microusd, row.platform_microusd, row.status]]));
    assert.deepEqual(rows.get(winner.jobId), ['2000000', '500000', 'SETTLED']);
    assert.deepEqual(rows.get(uncertain.jobId), ['0', '900000', 'RECONCILED']);
    assert.deepEqual(all.rows[0].pricing, { inputUsdPerMillion: 0.25, outputUsdPerMillion: 1.50 });
    const movements = await pool.query('SELECT event FROM ai_monthly_budget_movements WHERE job_id=$1 ORDER BY id', [uncertain.jobId]);
    assert.deepEqual(movements.rows.map(row => row.event), ['RESERVED', 'PENDING', 'EXPIRED', 'RECONCILED']);
    await assert.rejects(pool.query(`UPDATE ai_monthly_budget_movements SET owner_id=$2 WHERE job_id=$1`,
      [uncertain.jobId, teacher]), { code: '23503' });

    const cancelled = key(teacher, 'study_image');
    const dailyLimits = { dailyBudgetUsd: 5, dailyActorRequests: 5, dailyGlobalRequests: 10 };
    assert.equal(await transaction(tx => reserveAiImageBudget(tx, cancelled, 500_000n, {
      capability: 'study_image', provider: 'gemini', model: 'synthetic', pricing: { inputUsdPerMillion: 1, outputUsdPerMillion: 2 },
    }, dailyLimits)), true);
    const probe = await transaction(tx => readAiMonthlyBudget(tx, teacher));
    assert.equal(probe.reservedMicrousd, 500_000);
    // Represent a daily transaction that began before UTC midnight, with generation reserved after midnight.
    await pool.query(`UPDATE ai_monthly_reservations SET operational_day=operational_day-1 WHERE job_id=$1`, [cancelled.jobId]);
    await pool.query(`UPDATE ai_usage_daily SET day=day-1 WHERE scope IN ('global',$1)`, [teacher]);
    await transaction(tx => settleAiImageBudget(tx, cancelled, 0n));
    await transaction(tx => settleAiImageBudget(tx, cancelled, 0n));
    const afterCancellation = await transaction(tx => readAiMonthlyBudget(tx, teacher, probe));
    assert.equal(afterCancellation.remainingMicrousd, 5_000_000);
    const { rows: daily } = await pool.query(`SELECT consumed_microusd,request_count FROM ai_usage_daily WHERE scope IN ('global',$1)`, [teacher]);
    assert.deepEqual(daily, [{ consumed_microusd: '0', request_count: 1 }, { consumed_microusd: '0', request_count: 1 }]);
  });
});
