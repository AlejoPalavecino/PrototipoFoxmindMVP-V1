import { lockAiAdmission } from '../../../platform/ai/admission.ts';
import type { SqlDatabase, SqlTransaction } from '../../../../../../src/core/contracts/sql.ts';
import type { FoxyVisualLease, VisualUsage } from './visual-worker-types.ts';
import { checkVisualClaim } from './visual-claim-check.ts';
type Result = { state: 'READY' } | { state: 'FAILED'; errorCode: string; usage?: VisualUsage|null };
type Budget = { settle(tx: SqlTransaction, lease: FoxyVisualLease, usage?: VisualUsage|null): Promise<boolean> };
const allowed = new Set(['AI_UNAVAILABLE','AI_INPUT_LIMIT','AI_RATE_LIMITED','AI_TIMEOUT','PROVIDER_OUTCOME_UNKNOWN','INVALID_AI_OUTPUT','SERVICE_UNAVAILABLE','FORBIDDEN','INVALID_CONTENT','INFECTED','AI_BUDGET_EXCEEDED','CONFLICT']);
export function createFoxyVisualCompletion(options: { database: SqlDatabase; budget: Budget; maxJobAgeMs?: number }) {
  return { async finish(lease: FoxyVisualLease, result: Result): Promise<boolean> {
    if (!result || (result.state !== 'READY' && (result.state !== 'FAILED' || !allowed.has(result.errorCode)))) throw Object.assign(new Error('INVALID_INPUT'),{ code: 'INVALID_INPUT' });
    return options.database.$transaction(async raw => {
      const tx: SqlTransaction = { query: (sql,...args) => raw.$queryRawUnsafe(sql,...args) };
      await lockAiAdmission(tx); await tx.query('SELECT 1 FROM pg_advisory_xact_lock(78123001)');
      await tx.query('SELECT id FROM users WHERE id=$1::uuid FOR UPDATE',lease.ownerId);
      const [ref] = await tx.query<{ classroom_id: string|null }>('SELECT classroom_id FROM foxy_conversations WHERE id=$1::uuid AND owner_id=$2::uuid',lease.conversationId,lease.ownerId);
      if (ref?.classroom_id) await tx.query('SELECT id FROM classrooms WHERE id=$1::uuid FOR SHARE',ref.classroom_id);
      await tx.query('SELECT id FROM foxy_conversations WHERE id=$1::uuid AND owner_id=$2::uuid FOR UPDATE',lease.conversationId,lease.ownerId);
      const [job] = await tx.query<{ dispatch_count: number; reserved_microusd: bigint }>(`SELECT dispatch_count,reserved_microusd FROM foxy_visual_jobs
        WHERE id=$1::uuid AND asset_id=$2::uuid AND owner_id=$3::uuid AND conversation_id=$4::uuid AND lease_nonce=$5::uuid
        AND state='RUNNING' AND lease_until>clock_timestamp() FOR UPDATE`,lease.jobId,lease.assetId,lease.ownerId,lease.conversationId,lease.leaseNonce);
      if (!job || (result.state === 'READY' && job.dispatch_count !== 1)) return false;
      const [asset] = await tx.query<{ ready: boolean }>(`SELECT state='READY' AND discarded_at IS NULL AND blob_deleted_at IS NULL AND quota_released_at IS NULL
        AND digest IS NOT NULL AND validated_digest=digest AND scanned_digest=digest AND validated_at IS NOT NULL AND scanned_at IS NOT NULL AS ready
        FROM foxy_visual_assets WHERE id=$1::uuid AND owner_id=$2::uuid AND conversation_id=$3::uuid FOR UPDATE`,lease.assetId,lease.ownerId,lease.conversationId);
      if (result.state === 'READY') {
        if (!asset?.ready || !Number.isSafeInteger(options.maxJobAgeMs) || options.maxJobAgeMs! < 1) return false;
        try { if (!(await checkVisualClaim(tx,lease,options.maxJobAgeMs!)).fresh) return false; } catch { return false; }
      }
      if (BigInt(job.reserved_microusd) > 0n && !await options.budget.settle(tx,lease,result.state === 'FAILED' ? result.usage : undefined)) throw new Error('BUDGET_SETTLEMENT_FAILED');
      const [updated] = await tx.query(`UPDATE foxy_visual_jobs SET state=$6,error_code=$7,lease_nonce=NULL,lease_until=NULL,revision=revision+1,updated_at=clock_timestamp()
        WHERE id=$1::uuid AND asset_id=$2::uuid AND owner_id=$3::uuid AND conversation_id=$4::uuid AND lease_nonce=$5::uuid AND state='RUNNING' AND lease_until>clock_timestamp() RETURNING id`,lease.jobId,lease.assetId,lease.ownerId,lease.conversationId,lease.leaseNonce,result.state,result.state === 'FAILED' ? result.errorCode : null);
      if (!updated) throw new Error('LEASE_EXPIRED_DURING_COMPLETION'); return true;
    },{ maxWait: 2000, timeout: 6000 });
  } };
}
