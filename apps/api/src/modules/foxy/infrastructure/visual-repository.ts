import { tryLockAiBudget } from '../../../platform/ai/admission.ts';
import { createHash, randomUUID } from 'node:crypto';
import { assetUuid, type StartFoxyVisual } from '../../../../../../src/core/domain/index.ts';
import type { SqlTransaction } from '../../../../../../src/core/contracts/sql.ts';
import type { FoxyGroundingSnapshot } from '../../../../../../src/core/domain/foxy/grounding.ts';
import type { createFoxyPrivateAssetRepository } from './private-asset-repository.ts';
import { validateVisualProfile, type VisualProfile } from '../domain/visual-profile.ts';
export { validateVisualProfile, type VisualProfile } from '../domain/visual-profile.ts';

type Row = { id: string; owner_id: string; conversation_id: string; asset_id: string; input_hash: string; kind: StartFoxyVisual['kind'];
  aspect_ratio: StartFoxyVisual['aspectRatio']; state: string; error_code: string | null; created_at: Date; conversation_revision: bigint };
function fail(code: string): never { throw Object.assign(new Error(code), { code }); }
export function visualHash(conversationId: string, input: StartFoxyVisual): string {
  return createHash('sha256').update(JSON.stringify(['foxy-visual-v1',assetUuid(conversationId),input.revision,input.kind,input.prompt,
    input.selection.topicIds.map(x=>x.toLowerCase()),input.selection.sourceIds.map(x=>x.toLowerCase()),input.aspectRatio,...(input.selection.mode ? [input.selection.mode] : [])])).digest('hex');
}
function view(row: Row) { return { id: row.id, conversationId: row.conversation_id, kind: row.kind, aspectRatio: row.aspect_ratio,
  state: row.state, assetId: row.asset_id, errorCode: row.error_code, createdAt: row.created_at.toISOString() }; }
function result(row: Row, created: boolean) { return { created, job: view(row), conversationRevision: String(row.conversation_revision) }; }
export function createFoxyVisualRepository(options: { assets: ReturnType<typeof createFoxyPrivateAssetRepository>; settleCancelled?(tx: SqlTransaction, jobId: string): Promise<boolean> }) {
  return {
    async replay(tx: SqlTransaction, owner: string, conversationId: string, input: StartFoxyVisual) {
      const [row] = await tx.query<Row>('SELECT * FROM foxy_visual_jobs WHERE owner_id=$1::uuid AND request_id=$2::uuid',assetUuid(owner),assetUuid(input.requestId));
      if (!row) return null;
      if (row.input_hash !== visualHash(conversationId,input) || row.conversation_id !== assetUuid(conversationId)) return fail('CONFLICT');
      return result(row,false);
    },
    async enqueue(tx: SqlTransaction, owner: string, conversationId: string, input: StartFoxyVisual, snapshot: FoxyGroundingSnapshot, profile: VisualProfile, quota: bigint) {
      const ownerId = assetUuid(owner), id = assetUuid(conversationId), hash = visualHash(id,input), frozen = validateVisualProfile(profile,input.kind);
      if (!(await tx.query("SELECT id FROM users WHERE id=$1::uuid AND account_role='teacher' AND email_verified_at IS NOT NULL FOR UPDATE",ownerId)).length) return fail('NOT_FOUND');
      const existing = await this.replay(tx,ownerId,id,input); if (existing) return existing;
      const asset = await options.assets.reserve(tx,ownerId,id,{ requestId:input.requestId,conversationRevision:input.revision,kind:input.kind,aspectRatio:input.aspectRatio },quota);
      if (!asset.created) return fail('CONFLICT');
      const [conversation] = await tx.query<{ revision: bigint }>('UPDATE foxy_conversations SET revision=revision+1,updated_at=clock_timestamp() WHERE owner_id=$1::uuid AND id=$2::uuid AND deleted_at IS NULL AND revision=$3::bigint RETURNING revision',ownerId,id,input.revision);
      if (!conversation) return fail('CONFLICT');
      const [row] = await tx.query<Row>(`INSERT INTO foxy_visual_jobs(id,owner_id,conversation_id,request_id,asset_id,input_hash,prompt,kind,aspect_ratio,selection,snapshot,profile,conversation_revision)
        VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12::jsonb,$13::bigint) RETURNING *`,randomUUID(),ownerId,id,assetUuid(input.requestId),asset.asset.id,hash,input.prompt,input.kind,input.aspectRatio,JSON.stringify(input.selection),JSON.stringify(snapshot),JSON.stringify(frozen),String(conversation.revision));
      if (!row) return fail('CONFLICT'); return result(row,true);
    },
    async cancel(tx: SqlTransaction, owner: string, conversationId: string, jobId: string) {
      const args = [assetUuid(owner),assetUuid(conversationId),assetUuid(jobId)] as const;
      if (!await tryLockAiBudget(tx)) return fail('CONFLICT');
      const [job] = await tx.query<Row & {reserved_microusd: bigint}>(`SELECT j.* FROM foxy_visual_jobs j
        JOIN foxy_conversations c ON c.id=j.conversation_id AND c.owner_id=j.owner_id
        WHERE j.owner_id=$1::uuid AND j.conversation_id=$2::uuid AND j.id=$3::uuid AND c.deleted_at IS NULL
        AND (c.context_kind='GENERAL' OR EXISTS (SELECT 1 FROM classrooms r WHERE r.id=c.classroom_id AND r.teacher_id=c.owner_id))
        FOR UPDATE OF j`, ...args);
      if (!job) return null;
      if (job.state !== 'QUEUED' && job.state !== 'RUNNING') return view(job);
      if (BigInt(job.reserved_microusd) > 0n && !await options.settleCancelled?.(tx,job.id)) return fail('CONFLICT');
      // Keep the asset lease until expiry so storage cleanup cannot race a write already in progress.
      await tx.query(`UPDATE foxy_visual_assets SET state='DISCARDED',discarded_at=clock_timestamp(),revision=revision+1,
        updated_at=clock_timestamp(),last_activity_at=clock_timestamp()
        WHERE owner_id=$1::uuid AND conversation_id=$2::uuid AND id=$3::uuid AND state<>'DISCARDED' RETURNING id`,
      args[0],args[1],job.asset_id);
      const [cancelled] = await tx.query<Row>(`UPDATE foxy_visual_jobs SET state='CANCELLED',lease_nonce=NULL,lease_until=NULL,
        revision=revision+1,updated_at=clock_timestamp() WHERE owner_id=$1::uuid AND conversation_id=$2::uuid AND id=$3::uuid
        AND state IN ('QUEUED','RUNNING') RETURNING *`,...args);
      if (!cancelled) return fail('CONFLICT');
      return view(cancelled);
    },
    async get(tx: SqlTransaction, owner: string, conversationId: string, jobId: string) {
      const [row] = await tx.query<Row>('SELECT * FROM foxy_visual_jobs WHERE owner_id=$1::uuid AND conversation_id=$2::uuid AND id=$3::uuid',assetUuid(owner),assetUuid(conversationId),assetUuid(jobId));
      return row ? view(row) : null;
    },
    async list(tx: SqlTransaction, owner: string, conversationId: string, page: { limit: number; afterId: string | null }) {
      const ownerId=assetUuid(owner), id=assetUuid(conversationId), after=page.afterId ? assetUuid(page.afterId) : null;
      if (!Number.isSafeInteger(page.limit) || page.limit<1 || page.limit>50) return fail('INVALID_INPUT');
      const rows = await tx.query<Row>(`SELECT j.* FROM foxy_visual_jobs j WHERE j.owner_id=$1::uuid AND j.conversation_id=$2::uuid
        AND ($3::uuid IS NULL OR (j.created_at,j.id)<(SELECT created_at,id FROM foxy_visual_jobs WHERE id=$3::uuid AND owner_id=$1::uuid AND conversation_id=$2::uuid))
        ORDER BY j.created_at DESC,j.id DESC LIMIT $4`,ownerId,id,after,page.limit+1);
      const items=rows.slice(0,page.limit).map(view); return { items, nextAfterId: rows.length>page.limit ? items[items.length-1]!.id : null };
    },
  };
}
