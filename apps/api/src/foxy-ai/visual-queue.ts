import { activeAiOwnersSql, lockAiAdmission, noAiWorkForOwner } from '../ai-admission.ts';
import { randomUUID } from 'node:crypto';
import type { SqlDatabase, SqlTransaction } from '../../../../src/core/domain/index.ts';
import type { FoxyVisualLease } from './visual-worker-types.ts';
import { createVisualRecovery } from './visual-queue-recovery.ts';
type Configuration = { maxConcurrency: number; maxJobAgeMs: number; enabled?: { IMAGE: boolean; DIAGRAM: boolean } };
type Candidate = { id: string; owner_id: string; conversation_id: string; asset_id: string; classroom_id: string | null; kind: 'IMAGE'|'DIAGRAM'; dispatch_count: number };
const failure = () => Object.assign(new Error('NOT_CURRENT'), { code: 'NOT_CURRENT' });
async function lock(tx: SqlTransaction, item: Candidate): Promise<boolean> {
  if (!(await tx.query("SELECT id FROM users WHERE id=$1::uuid AND account_role='teacher' AND email_verified_at IS NOT NULL FOR UPDATE",item.owner_id)).length) return false;
  if (item.classroom_id && !(await tx.query('SELECT id FROM classrooms WHERE id=$1::uuid AND teacher_id=$2::uuid AND archived_at IS NULL FOR SHARE',item.classroom_id,item.owner_id)).length) return false;
  if (!(await tx.query('SELECT id FROM foxy_conversations WHERE id=$1::uuid AND owner_id=$2::uuid AND deleted_at IS NULL AND classroom_id IS NOT DISTINCT FROM $3::uuid FOR UPDATE',item.conversation_id,item.owner_id,item.classroom_id)).length) return false;
  if (!(await tx.query('SELECT id FROM foxy_visual_jobs WHERE id=$1::uuid AND owner_id=$2::uuid AND conversation_id=$3::uuid AND asset_id=$4::uuid FOR UPDATE',item.id,item.owner_id,item.conversation_id,item.asset_id)).length) return false;
  return !!(await tx.query('SELECT id FROM foxy_visual_assets WHERE id=$1::uuid AND owner_id=$2::uuid AND conversation_id=$3::uuid FOR UPDATE',item.asset_id,item.owner_id,item.conversation_id)).length;
}
export function createFoxyVisualQueue(options: { database: SqlDatabase; configuration: Configuration; budget: { settleExpired(tx: SqlTransaction, jobId: string): Promise<boolean> } }) {
  const config = options.configuration;
  if (typeof options.budget?.settleExpired !== 'function' || !Number.isSafeInteger(config?.maxConcurrency) || config.maxConcurrency<1 || !Number.isSafeInteger(config.maxJobAgeMs) || config.maxJobAgeMs<1) throw Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' });
  const transact = <T>(fn: (tx: SqlTransaction) => Promise<T>) => options.database.$transaction(raw => fn({query:(sql,...args)=>raw.$queryRawUnsafe(sql,...args)}),{maxWait:2000,timeout:6000});
  async function claim(): Promise<FoxyVisualLease|null> {
    return transact(async tx => {
      await lockAiAdmission(tx);
      await tx.query('SELECT 1 FROM pg_advisory_xact_lock(78123001)');
      const [active] = await tx.query<{count: number}>(`SELECT count(*)::int AS count FROM (${activeAiOwnersSql}) active`);
      if (!active || active.count>=config.maxConcurrency) return null;
      const [item] = await tx.query<Candidate>(`SELECT j.id,j.owner_id,j.conversation_id,j.asset_id,j.kind,j.dispatch_count,c.classroom_id FROM foxy_visual_jobs j
        JOIN foxy_conversations c ON c.id=j.conversation_id AND c.owner_id=j.owner_id JOIN foxy_visual_assets a ON a.id=j.asset_id AND a.owner_id=j.owner_id
        JOIN users u ON u.id=j.owner_id WHERE c.deleted_at IS NULL AND u.account_role='teacher' AND u.email_verified_at IS NOT NULL
        AND (c.context_kind='GENERAL' OR EXISTS (SELECT 1 FROM classrooms r WHERE r.id=c.classroom_id AND r.teacher_id=j.owner_id AND r.archived_at IS NULL))
        AND ((j.state='QUEUED' AND a.state='RESERVED') OR (j.state='RUNNING' AND (j.dispatch_count=0 OR (j.dispatch_count=1 AND a.digest IS NOT NULL)) AND j.lease_until<=clock_timestamp() AND a.state='PROCESSING' AND a.lease_until<=clock_timestamp() AND a.lease_nonce=j.lease_nonce))
        AND j.created_at+$1::bigint*interval '1 millisecond'>clock_timestamp() AND (j.dispatch_count=1 OR (j.kind='IMAGE' AND $2) OR (j.kind='DIAGRAM' AND $3))
        AND ${noAiWorkForOwner('j')} ORDER BY j.created_at,j.id LIMIT 1`,config.maxJobAgeMs,config.enabled?.IMAGE ?? true,config.enabled?.DIAGRAM ?? true);
      if (!item || !await lock(tx,item)) return null;
      if (item.dispatch_count === 1 && !await options.budget.settleExpired(tx,item.id)) throw failure();
      const nonce=randomUUID(), [clock] = await tx.query<{until: Date}>("SELECT clock_timestamp()+interval '90 seconds' AS until");
      const [job] = await tx.query(`UPDATE foxy_visual_jobs SET state='RUNNING',lease_nonce=$2::uuid,lease_until=$3,revision=revision+1,updated_at=clock_timestamp()
        WHERE id=$1::uuid AND (state='QUEUED' OR (state='RUNNING' AND lease_until<=clock_timestamp())) RETURNING id`,item.id,nonce,clock!.until);
      if (!job) return null;
      const [asset] = await tx.query(`UPDATE foxy_visual_assets SET state='PROCESSING',lease_nonce=$2::uuid,lease_until=$3,revision=revision+1,updated_at=clock_timestamp(),last_activity_at=clock_timestamp()
        WHERE id=$1::uuid AND (state='RESERVED' OR (state='PROCESSING' AND lease_until<=clock_timestamp())) RETURNING id`,item.asset_id,nonce,clock!.until);
      if (!asset) throw failure();
      return {jobId:item.id,assetId:item.asset_id,ownerId:item.owner_id,conversationId:item.conversation_id,leaseNonce:nonce};
    });
  }
  async function renew(lease: FoxyVisualLease): Promise<boolean> {
    try { return await transact(async tx => {
      const [item] = await tx.query<Candidate>(`SELECT j.id,j.owner_id,j.conversation_id,j.asset_id,j.kind,c.classroom_id FROM foxy_visual_jobs j JOIN foxy_conversations c ON c.id=j.conversation_id AND c.owner_id=j.owner_id
        WHERE j.id=$1::uuid AND j.owner_id=$2::uuid AND j.conversation_id=$3::uuid AND j.asset_id=$4::uuid`,lease.jobId,lease.ownerId,lease.conversationId,lease.assetId);
      if (!item || !await lock(tx,item)) return false;
      const [clock] = await tx.query<{until: Date}>("SELECT clock_timestamp()+interval '90 seconds' AS until");
      const [job] = await tx.query(`UPDATE foxy_visual_jobs SET lease_until=$3,updated_at=clock_timestamp() WHERE id=$1::uuid AND state='RUNNING' AND lease_nonce=$2::uuid AND lease_until>clock_timestamp() RETURNING id`,lease.jobId,lease.leaseNonce,clock!.until);
      if (!job) return false;
      const [asset] = await tx.query(`UPDATE foxy_visual_assets SET lease_until=$3,updated_at=clock_timestamp(),last_activity_at=clock_timestamp() WHERE id=$1::uuid AND state='PROCESSING' AND lease_nonce=$2::uuid AND lease_until>clock_timestamp() RETURNING id`,lease.assetId,lease.leaseNonce,clock!.until);
      if (!asset) throw failure(); return true;
    }); } catch (error) { if ((error as {code?:string})?.code==='NOT_CURRENT') return false; throw error; }
  }
  const recoverExpired = createVisualRecovery(options.database,options.budget,config.maxJobAgeMs);
  return { claim, renew, recoverExpired };
}
