import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from '../../../../tests/agenda-database-helpers.test.mjs';
import { homeFixture } from '../../../../tests/foxmind-3d-repository-fixture.test.mjs';

const hash = 'a'.repeat(64), metadata = { model: 'synthetic', promptVersion: 'foxy-chat-v1', schemaVersion: 'foxy-answer-v1' };
const config = { maxConcurrency: 1, deadlineMs: 30000, maxJobAgeMs: 300000, dailyActorRequests: 5, dailyGlobalRequests: 20,
  maxOutputTokens: 100, inputUsdPerMillion: 2, outputUsdPerMillion: 3, dailyBudgetUsd: 1 };
async function start(api, query, owner) {
  const tx = { query }, conversations = api.createFoxyConversationRepository(), turns = api.createFoxyTurnRepository();
  const context = { kind: 'GENERAL' };
  const { conversation } = await conversations.create(tx, owner, { requestId: randomUUID(), title: 'Presupuesto', context }, hash);
  const input = { requestId: randomUUID(), revision: '0', purpose: 'CHAT', text: 'Consulta', selection: { topicIds: [], sourceIds: [] } };
  await turns.enqueue(tx, owner, conversation.id, input, { context, curriculum: null, sources: [] }, hash, metadata);
  const database = { $transaction: fn => fn({ $queryRawUnsafe: query }) }, q = api.createFoxyTurnQueue({ database, configuration: config });
  const lease = await q.claim(); assert.ok(lease);
  return { lease, tx };
}
async function ledgers(query, owner) {
  return query(`SELECT scope,capability,request_count,reserved_microusd::text AS reserved,consumed_microusd::text AS consumed
    FROM ai_usage_daily WHERE scope IN ('global',$1) ORDER BY scope`, owner);
}

test('Foxy text reservations share ledger and survive fenced transactional settlement', { timeout: 120000 }, async t => {
  const api = await import('./index.ts'); assert.equal(typeof api.createFoxyTextBudget, 'function');
  await withAgendaDatabase(async ({ pool, transaction }) => {
    assert.match((await pool.query('SELECT current_database() name')).rows[0].name, /_test$/);
    const check = (name, operation) => t.test(name, () => transaction(async ({ query }) => {
      const f = await homeFixture(query), { lease, tx } = await start(api, query, f.teacherActor);
      await operation({ f, query, lease, tx });
    }));

    await check('reserve and replay update the shared global and owner ledger once', async ({ f, query, lease, tx }) => {
      const budget = api.createFoxyTextBudget({ configuration: config });
      assert.equal(await budget.reserve(tx, lease, 100), 'RESERVED');
      assert.equal(await budget.reserve(tx, lease, 100), 'ALREADY_DISPATCHED');
      const ledger = await ledgers(query, f.teacherActor); assert.equal(ledger.length, 2);
      for (const row of ledger) { assert.equal(row.capability, 'study-plan-v1'); assert.equal(row.request_count, 1); assert.equal(row.reserved, '500'); assert.equal(row.consumed, '0'); }
      const [turn] = await query('SELECT dispatch_count,dispatch_started_at,reserved_microusd::text AS reserved FROM foxy_turns WHERE id=$1::uuid', lease.turnId);
      assert.equal(turn.dispatch_count, 1); assert.ok(turn.dispatch_started_at); assert.equal(turn.reserved, '500');
    });

    await check('lost or expired lease cannot reserve or settle', async ({ query, lease, tx }) => {
      const budget = api.createFoxyTextBudget({ configuration: config }), wrong = { ...lease, leaseNonce: randomUUID() };
      assert.equal(await budget.reserve(tx, wrong, 100), 'NOT_CURRENT');
      assert.equal(await budget.settle(tx, wrong, { inputTokens: 1, outputTokens: 1 }), false);
      assert.equal(await budget.reserve(tx, lease, 100), 'RESERVED');
      await query("UPDATE foxy_turns SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1::uuid", lease.turnId);
      assert.equal(await budget.settle(tx, lease, { inputTokens: 1, outputTokens: 1 }), false);
      assert.equal(await budget.reserve(tx, lease, 100), 'NOT_CURRENT');
    });

    for (const scope of ['global', 'owner']) await check(`${scope} shared quota denies reservation`, async ({ f, query, lease, tx }) => {
      const quotaScope = scope === 'global' ? 'global' : f.teacherActor, cap = scope === 'global' ? config.dailyGlobalRequests : config.dailyActorRequests;
      await query(`INSERT INTO ai_usage_daily(day,scope,capability,request_count) VALUES((now() AT TIME ZONE 'UTC')::date,$1,'study-plan-v1',$2)
        ON CONFLICT(day,scope,capability) DO UPDATE SET request_count=$2`, quotaScope, cap);
      const budget = api.createFoxyTextBudget({ configuration: config });
      assert.equal(await budget.reserve(tx, lease, 100), 'NO_BUDGET');
      const [turn] = await query('SELECT dispatch_count,reserved_microusd::text AS reserved FROM foxy_turns WHERE id=$1::uuid', lease.turnId);
      assert.equal(turn.dispatch_count, 0); assert.equal(turn.reserved, '0');
    });

    await check('incomplete usage consumes full reservation, settlement is idempotent', async ({ f, query, lease, tx }) => {
      const budget = api.createFoxyTextBudget({ configuration: config });
      assert.equal(await budget.reserve(tx, lease, 100), 'RESERVED');
      assert.equal(await budget.settle(tx, lease, { inputTokens: 10, outputTokens: null }), true);
      assert.equal(await budget.settle(tx, lease, { inputTokens: 10, outputTokens: null }), false);
      for (const row of await ledgers(query, f.teacherActor)) { assert.equal(row.reserved, '0'); assert.equal(row.consumed, '500'); }
    });

    await check('revoked verification blocks a new dispatch but does not block settlement of incurred usage', async ({ f, query, lease, tx }) => {
      const budget = api.createFoxyTextBudget({ configuration: config });
      assert.equal(await budget.reserve(tx, lease, 100), 'RESERVED');
      await query('UPDATE users SET email_verified_at=NULL WHERE id=$1::uuid', f.teacherActor);
      assert.equal(await budget.reserve(tx, lease, 100), 'NOT_CURRENT');
      assert.equal(await budget.settle(tx, lease, { inputTokens: 10, outputTokens: 20 }), true);
      assert.equal(await budget.settle(tx, lease, { inputTokens: 10, outputTokens: 20 }), false);
      for (const row of await ledgers(query, f.teacherActor)) {
        assert.equal(row.request_count, 1); assert.equal(row.reserved, '0'); assert.equal(row.consumed, '80');
      }
      const [turn] = await query('SELECT dispatch_count,reserved_microusd::text AS reserved FROM foxy_turns WHERE id=$1::uuid', lease.turnId);
      assert.equal(turn.dispatch_count, 1); assert.equal(turn.reserved, '0');
    });

    await check('settlement uses price snapshot from dispatch despite later config changes', async ({ f, query, lease, tx }) => {
      const rates = { ...config }, budget = api.createFoxyTextBudget({ configuration: rates });
      assert.equal(await budget.reserve(tx, lease, 100), 'RESERVED');
      rates.inputUsdPerMillion = 100; rates.outputUsdPerMillion = 100;
      assert.equal(await budget.settle(tx, lease, { inputTokens: 10, outputTokens: 20 }), true);
      for (const row of await ledgers(query, f.teacherActor)) { assert.equal(row.reserved, '0'); assert.equal(row.consumed, '80'); }
    });

    await check('expired dispatch settlement is conservative, fenced and idempotent', async ({ f, query, lease, tx }) => {
      const budget = api.createFoxyTextBudget({ configuration: config });
      assert.equal(await budget.reserve(tx, lease, 100), 'RESERVED');
      assert.equal(await budget.settleExpired(tx, lease.turnId), false);
      await query("UPDATE foxy_turns SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1::uuid", lease.turnId);
      assert.equal(await budget.settleExpired(tx, lease.turnId), true);
      assert.equal(await budget.settleExpired(tx, lease.turnId), false);
      for (const row of await ledgers(query, f.teacherActor)) { assert.equal(row.reserved, '0'); assert.equal(row.consumed, '500'); }
    });

    for (const method of ['recoverExpired', 'claim']) await check(`${method} settles an expired dispatched reservation atomically`, async ({ f, query, lease, tx }) => {
      const budget = api.createFoxyTextBudget({ configuration: config });
      assert.equal(await budget.reserve(tx, lease, 100), 'RESERVED');
      await query("UPDATE foxy_turns SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1::uuid", lease.turnId);
      const database = { $transaction: fn => fn({ $queryRawUnsafe: query }) };
      const queue = api.createFoxyTurnQueue({ database, configuration: config });
      const checkBefore = async () => {
        const [turn] = await query('SELECT state,error_code,reserved_microusd::text AS reserved FROM foxy_turns WHERE id=$1::uuid', lease.turnId);
        assert.equal(turn.state, 'RUNNING'); assert.equal(turn.error_code, null); assert.equal(turn.reserved, '500');
        for (const row of await ledgers(query, f.teacherActor)) { assert.equal(row.reserved, '500'); assert.equal(row.consumed, '0'); }
      };
      const recover = async () => method === 'claim' ? assert.equal(await queue.claim(), null) : assert.equal(await queue.recoverExpired(), 1);
      const checkAfter = async () => {
        const [turn] = await query('SELECT state,error_code,reserved_microusd::text AS reserved,lease_nonce,lease_until FROM foxy_turns WHERE id=$1::uuid', lease.turnId);
        assert.equal(turn.state, 'FAILED'); assert.equal(turn.error_code, 'PROVIDER_OUTCOME_UNKNOWN'); assert.equal(turn.reserved, '0');
        assert.equal(turn.lease_nonce, null); assert.equal(turn.lease_until, null);
        for (const row of await ledgers(query, f.teacherActor)) { assert.equal(row.reserved, '0'); assert.equal(row.consumed, '500'); }
      };
      await checkBefore(); await query('SAVEPOINT before_queue_recovery');
      await recover(); await checkAfter();
      await query('ROLLBACK TO SAVEPOINT before_queue_recovery'); await checkBefore();
      await recover(); await checkAfter();
      assert.equal(await queue.recoverExpired(), 0); assert.equal(await queue.claim(), null); await checkAfter();
    });

    await check('rollback of reservation or settlement restores job and ledger together', async ({ f, query, lease, tx }) => {
      const budget = api.createFoxyTextBudget({ configuration: config });
      await query('SAVEPOINT before_reserve'); assert.equal(await budget.reserve(tx, lease, 100), 'RESERVED');
      await query('ROLLBACK TO SAVEPOINT before_reserve'); assert.deepEqual(await ledgers(query, f.teacherActor), []);
      const [initial] = await query('SELECT dispatch_count,reserved_microusd::text AS reserved FROM foxy_turns WHERE id=$1::uuid', lease.turnId);
      assert.equal(initial.dispatch_count, 0); assert.equal(initial.reserved, '0');
      assert.equal(await budget.reserve(tx, lease, 100), 'RESERVED'); await query('SAVEPOINT before_settle');
      assert.equal(await budget.settle(tx, lease, { inputTokens: 10, outputTokens: 20 }), true);
      await query('ROLLBACK TO SAVEPOINT before_settle');
      for (const row of await ledgers(query, f.teacherActor)) { assert.equal(row.reserved, '500'); assert.equal(row.consumed, '0'); }
    });
  });
});
