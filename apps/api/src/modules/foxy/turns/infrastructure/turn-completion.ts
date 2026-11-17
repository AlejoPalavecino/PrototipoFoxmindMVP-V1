import { parseFoxyAnswer } from '../../../../../../../src/core/domain/foxy/resource-validation.ts';
import type { SqlDatabase, SqlTransaction } from '../../../../../../../src/core/contracts/sql.ts';
import type { FoxyAnswer } from '../../../../../../../src/core/domain/foxy/resource.ts';
import type { FoxyTurnLease } from './turn-queue.ts';
import { checkClaimStatus } from './claim-authority-check.ts';

type Usage = { inputTokens: number | null; outputTokens: number | null };
type Result = { state: 'READY'; answer: FoxyAnswer; referenceMap: unknown[]; sourceReport: unknown[]; usage?: Usage }
  | { state: 'FAILED'; errorCode: string; usage?: Usage };
type Budget = { settle(tx: SqlTransaction, lease: FoxyTurnLease, usage?: Usage): Promise<boolean> };
type Locked = { reserved_microusd: bigint | string; dispatch_count: number };
function error(): never { throw Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' }); }
function validResult(input: Result): Result {
  if (!input || typeof input !== 'object') return error();
  if (input.state === 'READY') {
    if (!Array.isArray(input.referenceMap) || !Array.isArray(input.sourceReport)) return error();
    return { state: 'READY', answer: parseFoxyAnswer(input.answer), referenceMap: input.referenceMap,
      sourceReport: input.sourceReport, ...(input.usage ? { usage: input.usage } : {}) };
  }
  if (input.state === 'FAILED' && typeof input.errorCode === 'string' && /^[A-Z][A-Z0-9_]{1,79}$/u.test(input.errorCode)) return input;
  return error();
}
async function acquire(tx: SqlTransaction, lease: FoxyTurnLease): Promise<Locked | null> {
  await tx.query('SELECT id FROM users WHERE id=$1::uuid FOR SHARE', lease.ownerId);
  const [scope] = await tx.query<{ classroom_id: string | null }>(
    'SELECT classroom_id FROM foxy_conversations WHERE id=$1::uuid AND owner_id=$2::uuid', lease.conversationId, lease.ownerId);
  if (scope?.classroom_id) await tx.query('SELECT id FROM classrooms WHERE id=$1::uuid FOR SHARE', scope.classroom_id);
  await tx.query('SELECT id FROM foxy_conversations WHERE id=$1::uuid AND owner_id=$2::uuid FOR SHARE', lease.conversationId, lease.ownerId);
  await tx.query('SELECT 1 FROM pg_advisory_xact_lock(78123001)');
  const [row] = await tx.query<Locked>(`SELECT reserved_microusd,dispatch_count FROM foxy_turns WHERE id=$1::uuid AND owner_id=$2::uuid
    AND conversation_id=$3::uuid AND lease_nonce=$4::uuid AND state='RUNNING' AND lease_until>clock_timestamp() FOR UPDATE`,
  lease.turnId, lease.ownerId, lease.conversationId, lease.leaseNonce);
  return row ?? null;
}
async function fresh(tx: SqlTransaction, lease: FoxyTurnLease, maxJobAgeMs: number): Promise<boolean> {
  try { return (await checkClaimStatus(tx, lease, maxJobAgeMs)).fresh; }
  catch (error) { if ((error as { code?: unknown })?.code === 'FORBIDDEN') return false; throw error; }
}
export function createFoxyTurnCompletion(options: { database: SqlDatabase; budget: Budget; configuration: { maxJobAgeMs: number } }) {
  async function finish(lease: FoxyTurnLease, result: Result): Promise<boolean> {
    const input = validResult(result);
    return options.database.$transaction(async raw => {
      const tx: SqlTransaction = { query: (sql, ...args) => raw.$queryRawUnsafe(sql, ...args) };
      const row = await acquire(tx, lease);
      if (!row || (input.state === 'READY' && row.dispatch_count !== 1)) return false;
      const isFresh = await fresh(tx, lease, options.configuration.maxJobAgeMs);
      if (BigInt(row.reserved_microusd) > 0n && !await options.budget.settle(tx, lease, input.usage))
        throw new Error('BUDGET_SETTLEMENT_FAILED');
      const terminal = isFresh ? input.state : 'STALE';
      const answer = terminal === 'READY' && input.state === 'READY' ? input.answer : null;
      const references = terminal === 'READY' && input.state === 'READY' ? input.referenceMap : null;
      const report = terminal === 'READY' && input.state === 'READY' ? input.sourceReport : null;
      const errorCode = terminal === 'FAILED' && input.state === 'FAILED' ? input.errorCode : null;
      const updated = await tx.query(`UPDATE foxy_turns SET state=$5,error_code=$6,answer=$7::jsonb,reference_map=$8::jsonb,
        source_report=$9::jsonb,lease_nonce=NULL,lease_until=NULL,updated_at=clock_timestamp()
        WHERE id=$1::uuid AND owner_id=$2::uuid AND conversation_id=$3::uuid AND lease_nonce=$4::uuid
          AND state='RUNNING' AND lease_until>clock_timestamp() RETURNING id`, lease.turnId, lease.ownerId,
      lease.conversationId, lease.leaseNonce, terminal, errorCode, answer === null ? null : JSON.stringify(answer),
      references === null ? null : JSON.stringify(references), report === null ? null : JSON.stringify(report));
      if (!updated.length) throw new Error('LEASE_EXPIRED_DURING_COMPLETION');
      return true;
    }, { maxWait: 2000, timeout: 6000 });
  }
  return { finish };
}
