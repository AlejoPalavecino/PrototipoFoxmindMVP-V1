import { createHash, randomUUID } from 'node:crypto';
import { assetUuid, parseReserveFoxyPrivateAsset, type FoxyPrivateAssetView, type ReserveFoxyPrivateAsset } from '../../../../../../src/core/domain/index.ts';
import type { SqlTransaction } from '../../../../../../src/core/contracts/sql.ts';
const bytes = 10485760n;
function fail(code: string): never { throw Object.assign(new Error(code), { code }); }
type Row = { id: string; conversation_id: string; kind: FoxyPrivateAssetView['kind']; aspect_ratio: FoxyPrivateAssetView['aspectRatio']; state: FoxyPrivateAssetView['state']; revision: bigint; input_hash: string };
function view(row: Row): FoxyPrivateAssetView { return { id: row.id, conversationId: row.conversation_id, kind: row.kind, aspectRatio: row.aspect_ratio, state: row.state, revision: String(row.revision) }; }
async function authorize(tx: SqlTransaction, owner: string, id: string): Promise<string> {
  if (!(await tx.query("SELECT id FROM users WHERE id=$1::uuid AND account_role='teacher' AND email_verified_at IS NOT NULL FOR UPDATE", owner)).length) return fail('NOT_FOUND');
  const [context] = await tx.query<{ classroom_id: string | null }>('SELECT classroom_id FROM foxy_conversations WHERE id=$1::uuid AND owner_id=$2::uuid AND deleted_at IS NULL', id, owner);
  if (!context) return fail('NOT_FOUND');
  if (context.classroom_id && !(await tx.query('SELECT id FROM classrooms WHERE id=$1::uuid AND teacher_id=$2::uuid AND archived_at IS NULL FOR SHARE', context.classroom_id, owner)).length) return fail('NOT_FOUND');
  const [conversation] = await tx.query<{ revision: bigint }>('SELECT revision FROM foxy_conversations WHERE id=$1::uuid AND owner_id=$2::uuid AND deleted_at IS NULL FOR UPDATE', id, owner);
  if (!conversation) return fail('NOT_FOUND');
  return String(conversation.revision);
}
export function createFoxyPrivateAssetRepository() {
  return {
    async usage(tx: SqlTransaction, actorId: string): Promise<{ usedBytes: bigint }> {
      const [row] = await tx.query<{ used: string }>('SELECT COALESCE(sum(charge_bytes),0)::text AS used FROM foxy_visual_assets WHERE owner_id=$1::uuid', assetUuid(actorId));
      return { usedBytes: BigInt(row!.used) };
    },
    async reserve(tx: SqlTransaction, actorId: string, conversationId: string, input: ReserveFoxyPrivateAsset, quotaBytes: bigint) {
      const owner = assetUuid(actorId), id = assetUuid(conversationId), command = parseReserveFoxyPrivateAsset(input);
      if (typeof quotaBytes !== 'bigint' || quotaBytes < 0n || quotaBytes > 9223372036854775807n) return fail('INVALID_INPUT');
      const hash = createHash('sha256').update(JSON.stringify(['foxy-private-asset-v1', id, command.conversationRevision, command.kind, command.aspectRatio])).digest('hex');
      const revision = await authorize(tx, owner, id);
      const [existing] = await tx.query<Row>('SELECT * FROM foxy_visual_assets WHERE owner_id=$1::uuid AND request_id=$2::uuid', owner, command.requestId);
      if (existing) { if (existing.input_hash !== hash) return fail('CONFLICT'); return { created: false, asset: view(existing) }; }
      if (revision !== command.conversationRevision) return fail('CONFLICT');
      if ((await this.usage(tx, owner)).usedBytes + bytes > quotaBytes) return fail('QUOTA_EXCEEDED');
      const assetId = randomUUID();
      const [row] = await tx.query<Row>(`INSERT INTO foxy_visual_assets(id,owner_id,conversation_id,request_id,input_hash,conversation_revision,kind,aspect_ratio,reserved_bytes,charge_bytes,storage_key)
        VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6::bigint,$7,$8,$9::bigint,$9::bigint,$10) RETURNING *`, assetId, owner, id, command.requestId, hash, command.conversationRevision, command.kind, command.aspectRatio, bytes, `foxy-assets/${owner}/${assetId}`);
      return { created: true, asset: view(row!) };
    },
  };
}
