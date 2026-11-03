import { lockAiAdmission } from '../ai-admission.ts';
import type { SqlDatabase, SqlTransaction } from '../../../../src/core/domain/index.ts';

type Expired = { id: string; owner_id: string; dispatch_count: number; dispatch_started_at: Date | null;
  reserved_microusd: bigint; usage_day: Date | null; input_usd_per_million: number | null; output_usd_per_million: number | null };
function invalid(): never { throw new Error('INVALID_RECOVERY_LEDGER'); }
async function settle(tx: SqlTransaction, row: Expired): Promise<void> {
  const amount = BigInt(row.reserved_microusd);
  if (!row.dispatch_started_at) {
    if (row.dispatch_count !== 0 || amount !== 0n || row.usage_day !== null) invalid();
    return;
  }
  if (row.dispatch_count !== 1 || amount <= 0n || !row.usage_day || !Number.isFinite(row.input_usd_per_million)
    || !Number.isFinite(row.output_usd_per_million) || row.input_usd_per_million! <= 0 || row.output_usd_per_million! <= 0) invalid();
  const ledger = await tx.query<{ scope: string; reserved_microusd: bigint }>(`SELECT scope,reserved_microusd FROM ai_usage_daily
    WHERE day=$1::date AND scope IN ('global',$2) AND capability='study-plan-v1' FOR UPDATE`, row.usage_day, row.owner_id);
  if (ledger.length !== 2 || !ledger.some(item => item.scope === 'global') || !ledger.some(item => item.scope === row.owner_id)
    || ledger.some(item => BigInt(item.reserved_microusd) < amount)) invalid();
  const updated = await tx.query<{ scope: string }>(`UPDATE ai_usage_daily SET reserved_microusd=reserved_microusd-$3::bigint,
    consumed_microusd=consumed_microusd+$3::bigint WHERE day=$1::date AND scope IN ('global',$2)
    AND capability='study-plan-v1' RETURNING scope`, row.usage_day, row.owner_id, amount.toString());
  if (updated.length !== 2) invalid();
}
export async function recoverFoxyExpired(tx: SqlTransaction): Promise<number> {
  await tx.query('SELECT 1 FROM pg_advisory_xact_lock(78123001)');
  const rows = await tx.query<Expired>(`SELECT id,owner_id,dispatch_count,dispatch_started_at,reserved_microusd,usage_day,
    input_usd_per_million,output_usd_per_million FROM foxy_turns WHERE state='RUNNING'
    AND lease_until<=clock_timestamp() ORDER BY lease_until,id LIMIT 50 FOR UPDATE SKIP LOCKED`);
  for (const row of rows) {
    await settle(tx, row);
    await tx.query(`UPDATE foxy_turns SET state=$2,error_code=$3,lease_nonce=NULL,lease_until=NULL,reserved_microusd=0,
      updated_at=clock_timestamp() WHERE id=$1::uuid`, row.id, row.dispatch_started_at ? 'FAILED' : 'QUEUED',
    row.dispatch_started_at ? 'PROVIDER_OUTCOME_UNKNOWN' : null);
  }
  return rows.length;
}
export function createFoxyTurnRecovery(options: { database: SqlDatabase }) {
  return { recoverExpired: () => options.database.$transaction(async raw => {
    const tx: SqlTransaction = { query: (sql, ...args) => raw.$queryRawUnsafe(sql, ...args) };
    await lockAiAdmission(tx);
    return recoverFoxyExpired(tx);
  }, { maxWait: 2000, timeout: 6000 }) };
}
