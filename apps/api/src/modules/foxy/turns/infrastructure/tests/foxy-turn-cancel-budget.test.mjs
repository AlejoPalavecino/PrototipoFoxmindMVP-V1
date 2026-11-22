import test from 'node:test';
import assert from 'node:assert/strict';

const imports = () => Promise.all([
  import('../../../../../../../../tests/agenda-database-helpers.test.mjs'),
  import('../../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs'),
  import('../../../conversations/infrastructure/conversation-repository.ts'),
  import('../turn-repository.ts'),
  import('../text-budget.ts'),
  import('../turn-recovery.ts'),
  import('../../../../../platform/ai/monthly-budget.ts'),
]);
const configuration = { maxOutputTokens: 1000, inputUsdPerMillion: 1, outputUsdPerMillion: 4,
  dailyBudgetUsd: 1, dailyActorRequests: 20, dailyGlobalRequests: 40 };

async function dispatchedTurn({ query }, ownerId, budget, turns) {
  const context = { kind: 'GENERAL' }, hash = 'a'.repeat(64), tx = { query };
  const { conversation } = await (await import('../../../conversations/infrastructure/conversation-repository.ts'))
    .createFoxyConversationRepository().create(tx, ownerId, { requestId: crypto.randomUUID(), title: 'Privado', context }, hash);
  const { turn } = await turns.enqueue(tx, ownerId, conversation.id,
    { requestId: crypto.randomUUID(), revision: '0', purpose: 'CHAT', text: 'Consulta', selection: { topicIds: [], sourceIds: [] } },
    { context, curriculum: null, sources: [] }, hash, { model: 'synthetic', schemaVersion: 'foxy-answer-v1', promptVersion: 'test' });
  const leaseNonce = crypto.randomUUID();
  await query("UPDATE foxy_turns SET state='RUNNING',lease_nonce=$2::uuid,lease_until=clock_timestamp()+interval '1 minute' WHERE id=$1::uuid", turn.id, leaseNonce);
  const lease = { turnId: turn.id, ownerId, conversationId: conversation.id, leaseNonce };
  assert.equal(await budget.reserve(tx, lease, 500), 'RESERVED');
  const [reservation] = await query("SELECT reserved_microusd FROM ai_monthly_reservations WHERE namespace='foxy_turns' AND job_id=$1::uuid", turn.id);
  return { lease, conversationId: conversation.id, turnId: turn.id, reserved: BigInt(reservation.reserved_microusd) };
}

test('user cancel of a dispatched chat turn charges the full reserved amount to the monthly budget', { timeout: 180000 }, async () => {
  const [{ withAgendaDatabase }, { homeFixture }, , { createFoxyTurnRepository }, { createFoxyTextBudget }, , monthly] = await imports();
  await withAgendaDatabase(async ({ transaction }) => transaction(async ({ query }) => {
    const { teacherActor: ownerId } = await homeFixture(query), tx = { query };
    const turns = createFoxyTurnRepository(), budget = createFoxyTextBudget({ configuration });
    const { lease, conversationId, turnId, reserved } = await dispatchedTurn({ query }, ownerId, budget, turns);
    assert.ok(reserved > 0n);
    assert.equal((await turns.cancel(tx, ownerId, conversationId, turnId)).state, 'CANCELLED');
    const after = await monthly.readAiMonthlyBudget(tx, ownerId);
    assert.equal(BigInt(after.consumedMicrousd), reserved);
    assert.equal(after.reservedMicrousd, 0);
    // Even once the original 24h reservation window has passed, the charge stays.
    await query("UPDATE ai_monthly_reservations SET reserved_at=statement_timestamp()-interval '25 hours',expires_at=statement_timestamp()-interval '1 hour' WHERE job_id=$1::uuid", turnId);
    await monthly.sweepAiMonthlyBudget(tx, null);
    const swept = await monthly.readAiMonthlyBudget(tx, ownerId);
    assert.equal(BigInt(swept.consumedMicrousd), reserved);
    assert.equal(swept.remainingMicrousd, swept.limitMicrousd - Number(reserved));
    // A later observed cost cannot charge twice (worker lease is gone, and the ledger is already SETTLED).
    assert.equal(await budget.settle(tx, lease, { inputTokens: 10, outputTokens: 10 }), false);
    assert.equal(await monthly.settleAiMonthlyBudget(tx, { namespace: 'foxy_turns', jobId: turnId, ownerId }, reserved), null);
    assert.equal(BigInt((await monthly.readAiMonthlyBudget(tx, ownerId)).consumedMicrousd), reserved);
  }));
});

test('lease-expiry recovery of a dispatched turn keeps the unknown-outcome PENDING behaviour', { timeout: 180000 }, async () => {
  const [{ withAgendaDatabase }, { homeFixture }, , { createFoxyTurnRepository }, { createFoxyTextBudget }, { recoverFoxyExpired }, monthly] = await imports();
  await withAgendaDatabase(async ({ transaction }) => transaction(async ({ query }) => {
    const { teacherActor: ownerId } = await homeFixture(query), tx = { query };
    const turns = createFoxyTurnRepository(), budget = createFoxyTextBudget({ configuration });
    const { turnId, reserved } = await dispatchedTurn({ query }, ownerId, budget, turns);
    await query("UPDATE foxy_turns SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1::uuid", turnId);
    assert.equal(await recoverFoxyExpired(tx), 1);
    const [row] = await query("SELECT status,actor_microusd FROM ai_monthly_reservations WHERE job_id=$1::uuid", turnId);
    assert.equal(row.status, 'PENDING');
    assert.equal(BigInt(row.actor_microusd), 0n);
    const snapshot = await monthly.readAiMonthlyBudget(tx, ownerId);
    assert.equal(snapshot.consumedMicrousd, 0);
    assert.equal(BigInt(snapshot.reservedMicrousd), reserved);
  }));
});

test('user cancel of a dispatched visual job charges the full reserved amount to the monthly budget', { timeout: 180000 }, async () => {
  const [{ withAgendaDatabase }, { homeFixture }, { createFoxyConversationRepository }, , , , monthly] = await imports();
  const [{ createFoxyVisualRepository }, { createFoxyPrivateAssetRepository }, { createFoxyVisualQueue }, { createFoxyVisualBudget }] = await Promise.all([
    import('../../../visuals/infrastructure/visual-repository.ts'), import('../../../private-assets/infrastructure/private-asset-repository.ts'),
    import('../../../../../bootstrap/foxy-service-factories.ts'), import('../../../visuals/infrastructure/visual-budget.ts')]);
  await withAgendaDatabase(async ({ transaction }) => transaction(async ({ query, database }) => {
    const { teacherActor: ownerId } = await homeFixture(query), tx = { query }, context = { kind: 'GENERAL' };
    const { conversation } = await createFoxyConversationRepository().create(tx, ownerId, { requestId: crypto.randomUUID(), title: 'Privado', context }, 'a'.repeat(64));
    const budget = createFoxyVisualBudget({ limits: { dailyBudgetUsd: 1, dailyActorRequests: 5, dailyGlobalRequests: 10 } });
    const jobs = createFoxyVisualRepository({ assets: createFoxyPrivateAssetRepository(), settleCancelled: budget.settleCancelled });
    const profile = { kind: 'IMAGE', model: 'gemini-3.1-flash-lite-image', profileVersion: 'foxy-gemini-image-v1', maxInputTokens: 65536, maxOutputTokens: 4096,
      inputUsdPerMillion: '0.25', outputUsdPerMillion: '30', textOutputUsdPerMillion: '1.5', imageOutputUsdPerMillion: '30' };
    const { job } = await jobs.enqueue(tx, ownerId, conversation.id, { requestId: crypto.randomUUID(), revision: '0', kind: 'IMAGE', aspectRatio: '1:1',
      prompt: 'Consulta', selection: { topicIds: [], sourceIds: [] } }, { context, curriculum: null, sources: [] }, profile, 10485760n);
    const queue = createFoxyVisualQueue({ database, budget, configuration: { maxConcurrency: 1, maxJobAgeMs: 60000 } });
    const lease = await queue.claim();
    assert.equal(await budget.reserve(tx, lease, 12), 'RESERVED');
    const [reservation] = await query("SELECT reserved_microusd FROM ai_monthly_reservations WHERE namespace='foxy_visual_jobs' AND job_id=$1::uuid", job.id);
    const reserved = BigInt(reservation.reserved_microusd);
    assert.ok(reserved > 0n);
    assert.equal((await jobs.cancel(tx, ownerId, conversation.id, job.id)).state, 'CANCELLED');
    const after = await monthly.readAiMonthlyBudget(tx, ownerId);
    assert.equal(BigInt(after.consumedMicrousd), reserved);
    assert.equal(after.reservedMicrousd, 0);
    assert.equal(await monthly.settleAiMonthlyBudget(tx, { namespace: 'foxy_visual_jobs', jobId: job.id, ownerId }, reserved), null);
  }));
});
