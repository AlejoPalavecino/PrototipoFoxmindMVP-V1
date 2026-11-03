import type { Transaction } from '../contracts.ts';
import { settle } from './budget.ts';

const batchPerQueue = 25;
const tables = ['classroom_curriculum_extractions', 'activity_ai_generations'] as const;
type GenerationTable = typeof tables[number];

/** Called under the shared admission lock. Each queue gets its own bounded share of the pass. */
export async function recoverGenerationBatch(tx: Transaction, configuration: Parameters<typeof settle>[2],
  first: GenerationTable): Promise<void> {
  const second = first === tables[0] ? tables[1] : tables[0];
  for (const table of [first, second]) {
    const rows = await tx.query<{ id: string; owner_id: string; dispatch_started_at: Date | null }>(
      `SELECT id,owner_id,dispatch_started_at FROM ${table} WHERE state='RUNNING'
        AND lease_until<=clock_timestamp() ORDER BY lease_until,id LIMIT $1 FOR UPDATE SKIP LOCKED`, batchPerQueue);
    for (const row of rows) {
      await settle(tx, row, configuration, undefined, table);
      await tx.query(`UPDATE ${table} SET state=$2,error_code=$3,lease_nonce=NULL,
        lease_until=NULL,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id`, row.id,
      row.dispatch_started_at ? 'FAILED' : 'QUEUED', row.dispatch_started_at ? 'PROVIDER_OUTCOME_UNKNOWN' : null);
    }
  }
}
