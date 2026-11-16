import { lockAiAdmission, tryLockAiBudget } from '../../../platform/ai/admission.ts';
import { isDeepStrictEqual } from 'node:util';
import type { FoxyContext, FoxySelection } from '../../../../../../src/core/domain/index.ts';
import type { SqlDatabase, SqlTransaction } from '../../../../../../src/core/contracts/sql.ts';
import { refreshFoxyAttachmentSnapshot } from './claim-authority-check.ts';
import type { FoxyGroundingSnapshot } from '../../../../../../src/core/domain/foxy/grounding.ts';
import { rebuildGrounding } from './grounding-rebuild.ts';
type Budget = { settleExpired(tx: SqlTransaction, jobId: string): Promise<boolean> };
type Ref = { id: string; owner_id: string; conversation_id: string; asset_id: string; classroom_id: string | null };
type Job = { snapshot: FoxyGroundingSnapshot; selection: FoxySelection; kind: string; aspect_ratio: string };
function unavailable(): never { throw Object.assign(new Error('SERVICE_UNAVAILABLE'), { code: 'SERVICE_UNAVAILABLE' }); }
async function authorized(tx: SqlTransaction, ref: Ref): Promise<FoxyContext|null> {
  const [user] = await tx.query<{ ok: boolean }>("SELECT (account_role='teacher' AND email_verified_at IS NOT NULL) AS ok FROM users WHERE id=$1::uuid FOR UPDATE",ref.owner_id);
  if (!user) return unavailable(); let roomOk = true;
  if (ref.classroom_id) { const [room] = await tx.query<{ok: boolean}>('SELECT (teacher_id=$2::uuid AND archived_at IS NULL) AS ok FROM classrooms WHERE id=$1::uuid FOR SHARE',ref.classroom_id,ref.owner_id); roomOk = !!room?.ok; }
  const [c] = await tx.query<{context_kind:string;classroom_id:string|null;deleted_at:Date|null}>('SELECT context_kind,classroom_id,deleted_at FROM foxy_conversations WHERE id=$1::uuid AND owner_id=$2::uuid FOR UPDATE',ref.conversation_id,ref.owner_id);
  if (!c) return unavailable();
  if (!user.ok || !roomOk || c.deleted_at || c.classroom_id !== ref.classroom_id) return null;
  if (c.context_kind==='GENERAL' && c.classroom_id===null) return {kind:'GENERAL'};
  if (c.context_kind==='CLASSROOM' && c.classroom_id) return {kind:'CLASSROOM',classroomId:c.classroom_id};
  return null;
}
async function fresh(tx: SqlTransaction, context: FoxyContext|null, job: Job, ref: Ref): Promise<boolean> {
  if (!context) return false;
  try {
    const current = await rebuildGrounding(tx,context,job.selection);
    await refreshFoxyAttachmentSnapshot(tx,ref.owner_id,ref.conversation_id,job.snapshot,current);
    return isDeepStrictEqual(current,job.snapshot);
  }
  catch (error) { if (['INVALID_INPUT','FORBIDDEN','FILE_NOT_READY','AI_INPUT_LIMIT','CONFLICT','EMPTY_CONTENT'].includes(String((error as {code?:unknown})?.code))) return false; throw error; }
}
export function createVisualRecovery(database: SqlDatabase, budget: Budget, maxJobAgeMs: number) {
  async function one(): Promise<boolean> {
    return database.$transaction(async raw => {
      const tx: SqlTransaction = {query:(sql,...args)=>raw.$queryRawUnsafe(sql,...args)};
      await lockAiAdmission(tx);
      const [stale] = await tx.query<{ id: string }>(`UPDATE foxy_visual_jobs SET state='FAILED',error_code='GENERATION_INTERRUPTED',revision=revision+1,updated_at=clock_timestamp()
        WHERE id=(SELECT id FROM foxy_visual_jobs WHERE state='QUEUED' AND created_at+$1::bigint*interval '1 millisecond'<=clock_timestamp() ORDER BY created_at,id LIMIT 1 FOR UPDATE)
        AND state='QUEUED' RETURNING id`,maxJobAgeMs);
      if (stale) return true;
      const [ref] = await tx.query<Ref>(`SELECT j.id,j.owner_id,j.conversation_id,j.asset_id,c.classroom_id FROM foxy_visual_jobs j
        JOIN foxy_conversations c ON c.id=j.conversation_id AND c.owner_id=j.owner_id JOIN users u ON u.id=j.owner_id
        JOIN foxy_visual_assets a ON a.id=j.asset_id AND a.owner_id=j.owner_id
        WHERE j.state='RUNNING' AND j.dispatch_count=1 AND j.lease_until<=clock_timestamp()
        AND NOT (a.state='PROCESSING' AND a.digest IS NOT NULL AND a.lease_nonce=j.lease_nonce AND a.lease_until<=clock_timestamp()
          AND j.created_at+$1::bigint*interval '1 millisecond'>clock_timestamp() AND c.deleted_at IS NULL AND u.account_role='teacher' AND u.email_verified_at IS NOT NULL
          AND (c.context_kind='GENERAL' OR EXISTS (SELECT 1 FROM classrooms r WHERE r.id=c.classroom_id AND r.teacher_id=c.owner_id AND r.archived_at IS NULL)))
        ORDER BY j.lease_until,j.id LIMIT 1`,maxJobAgeMs);
      if (!ref || !await tryLockAiBudget(tx)) return false;
      const context=await authorized(tx,ref);
      const [job]=await tx.query<Job>("SELECT snapshot,selection,kind,aspect_ratio FROM foxy_visual_jobs WHERE id=$1::uuid AND state='RUNNING' AND dispatch_count=1 AND lease_until<=clock_timestamp() FOR UPDATE",ref.id);
      if (!job) return unavailable();
      const [asset]=await tx.query<{ready:boolean}>(`SELECT (state='READY' AND discarded_at IS NULL AND blob_deleted_at IS NULL AND quota_released_at IS NULL AND digest IS NOT NULL
        AND validated_digest=digest AND scanned_digest=digest AND validated_at IS NOT NULL AND scanned_at IS NOT NULL AND kind=$4 AND aspect_ratio=$5) AS ready
        FROM foxy_visual_assets WHERE id=$1::uuid AND owner_id=$2::uuid AND conversation_id=$3::uuid FOR UPDATE`,ref.asset_id,ref.owner_id,ref.conversation_id,job.kind,job.aspect_ratio);
      if (!asset) return unavailable();
      if (!await budget.settleExpired(tx,ref.id)) return unavailable();
      const ready=!!asset.ready && await fresh(tx,context,job,ref);
      const rows=await tx.query(`UPDATE foxy_visual_jobs SET state=$2,error_code=$3,lease_nonce=NULL,lease_until=NULL,revision=revision+1,updated_at=clock_timestamp()
        WHERE id=$1::uuid AND state='RUNNING' AND dispatch_count=1 AND lease_until<=clock_timestamp() RETURNING id`,ref.id,ready?'READY':'FAILED',ready?null:'GENERATION_INTERRUPTED');
      if (!rows.length) return unavailable(); return true;
    },{maxWait:2000,timeout:6000});
  }
  return async function recoverExpired(): Promise<number> { let count=0; while (count<50 && await one()) count++; return count; };
}
