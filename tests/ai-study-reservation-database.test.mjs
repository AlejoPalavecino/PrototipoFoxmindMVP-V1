import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from './agenda-database-helpers.test.mjs';
import { executeStudyAiText } from '../apps/api/src/modules/study/infrastructure/providers/study-ai-execution.ts';

test('PostgreSQL: expired Study waits for reservation commit before releasing it, without generation', { timeout: 90000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    const ownerId = randomUUID(), requestId = randomUUID();
    await pool.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
      VALUES($1,now(),$2,$2,'Synthetic','AI','no-login',now(),'student')`, [ownerId, `${ownerId}@example.invalid`]);
    let entered, settled = false, generates = 0;
    const reserving = new Promise(resolve => { entered = resolve; });
    const database = { async $transaction(operation, options) {
      assert.deepEqual(options, { maxWait: 2000, timeout: 6000 });
      const client = await pool.connect();
      await client.query('BEGIN');
      try {
        const result = await operation({ async $queryRawUnsafe(sql, ...values) {
          if (sql.includes('pg_advisory_xact_lock(78123001)')) entered();
          return (await client.query(sql, values)).rows;
        } });
        await client.query('COMMIT'); return result;
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    } };
    const configuration = { backend: 'gemini-developer', apiKey: 'synthetic-only', model: 'synthetic-model',
      maxInputTokens: 100, maxOutputTokens: 50, deadlineMs: 1000, maxConcurrency: 2,
      dailyActorRequests: 10, dailyGlobalRequests: 20, dailyBudgetUsd: 1, inputUsdPerMillion: 1, outputUsdPerMillion: 1 };
    const transport = { provider: 'gemini', async count() { return 10; }, async generate() { generates++; throw new Error('must not generate'); } };
    const locker = await pool.connect();
    await locker.query('BEGIN');
    await locker.query('SELECT pg_advisory_xact_lock(78123001)');
    let running;
    try {
      running = executeStudyAiText({ configuration, database, ownerId, requestId, transport,
        request: { system: 'Synthetic', messages: [{ role: 'user', parts: [{ kind: 'text', text: 'Synthetic' }] }] }, authorize: async () => {} })
        .then(() => { settled = true; return null; }, error => { settled = true; return error; });
      await reserving;
      await new Promise(resolve => setTimeout(resolve, 1100));
      assert.equal(settled, false, 'must wait for the in-flight reservation before cleanup');
    } finally { await locker.query('COMMIT'); locker.release(); }
    const error = await running;
    assert.equal(error.code, 'AI_TIMEOUT'); assert.equal(generates, 0);
    const job = (await pool.query('SELECT state,reserved_microusd,dispatch_count FROM study_ai_dispatches WHERE owner_id=$1', [ownerId])).rows[0];
    assert.equal(job.state, 'FAILED'); assert.equal(job.reserved_microusd, '0'); assert.equal(job.dispatch_count, 1);
    const usage = (await pool.query('SELECT request_count,reserved_microusd,consumed_microusd FROM ai_usage_daily WHERE scope=$1', [ownerId])).rows[0];
    assert.equal(usage.request_count, 1); assert.equal(usage.reserved_microusd, '0'); assert.equal(usage.consumed_microusd, '0');
  });
});
