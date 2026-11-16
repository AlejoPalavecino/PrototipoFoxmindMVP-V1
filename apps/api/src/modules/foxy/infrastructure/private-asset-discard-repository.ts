import { createHash } from 'node:crypto';
import { assetUuid, type DiscardFoxyPrivateAsset, type FoxyPrivateAssetDiscardReceipt } from '../../../../../../src/core/domain/index.ts';
import type { SqlTransaction } from '../../../../../../src/core/contracts/sql.ts';
const fail = (code: string): never => { throw Object.assign(new Error(code), { code }); };
type Asset = { id: string; state: string; revision: bigint };
async function lock(tx: SqlTransaction, owner: string, assetId: string): Promise<Asset> {
  const [ref] = await tx.query<{ conversation_id: string; classroom_id: string | null }>(`SELECT a.conversation_id,c.classroom_id FROM foxy_visual_assets a
    JOIN foxy_conversations c ON c.id=a.conversation_id AND c.owner_id=a.owner_id WHERE a.id=$1::uuid AND a.owner_id=$2::uuid AND c.deleted_at IS NULL`, assetId, owner);
  if (!ref) return fail('NOT_FOUND');
  if (ref.classroom_id && !(await tx.query('SELECT id FROM classrooms WHERE id=$1::uuid AND teacher_id=$2::uuid FOR SHARE',ref.classroom_id,owner)).length) return fail('NOT_FOUND');
  const [conversation] = await tx.query<{ classroom_id: string | null }>('SELECT classroom_id FROM foxy_conversations WHERE id=$1::uuid AND owner_id=$2::uuid AND deleted_at IS NULL FOR UPDATE',ref.conversation_id,owner);
  if (!conversation || conversation.classroom_id !== ref.classroom_id) return fail('NOT_FOUND');
  const [asset] = await tx.query<Asset>('SELECT id,state,revision FROM foxy_visual_assets WHERE id=$1::uuid AND owner_id=$2::uuid AND conversation_id=$3::uuid FOR UPDATE',assetId,owner,ref.conversation_id);
  return asset ?? fail('NOT_FOUND');
}
export function createFoxyPrivateAssetDiscardRepository() {
  return { async discard(tx: SqlTransaction, ownerId: string, assetId: string, command: DiscardFoxyPrivateAsset): Promise<FoxyPrivateAssetDiscardReceipt> {
    const owner = assetUuid(ownerId), id = assetUuid(assetId), asset = await lock(tx,owner,id);
    const hash = createHash('sha256').update(JSON.stringify(['foxy-private-discard-v1',id,command.assetRevision,command.confirm])).digest('hex');
    const [previous] = await tx.query<{ asset_id: string; action: string; input_hash: string; asset_revision: bigint }>('SELECT asset_id,action,input_hash,asset_revision FROM foxy_private_asset_commands WHERE owner_id=$1::uuid AND request_id=$2::uuid',owner,command.requestId);
    if (previous) {
      if (previous.asset_id !== id || previous.action !== 'DISCARD' || previous.input_hash !== hash) return fail('CONFLICT');
      return { assetId: id, action: 'DISCARD', assetRevision: String(previous.asset_revision) };
    }
    if (asset.state === 'DISCARDED' || String(asset.revision) !== command.assetRevision) return fail('CONFLICT');
    const [updated] = await tx.query<{ revision: bigint }>(`UPDATE foxy_visual_assets SET state='DISCARDED',discarded_at=clock_timestamp(),revision=revision+1,
      updated_at=clock_timestamp(),last_activity_at=clock_timestamp() WHERE id=$1::uuid AND owner_id=$2::uuid AND state<>'DISCARDED' AND revision=$3::bigint RETURNING revision`,id,owner,command.assetRevision);
    if (!updated) return fail('CONFLICT');
    await tx.query(`INSERT INTO foxy_private_asset_commands(owner_id,request_id,asset_id,action,input_hash,asset_revision)
      VALUES($1::uuid,$2::uuid,$3::uuid,'DISCARD',$4,$5::bigint)`,owner,command.requestId,id,hash,updated.revision);
    return { assetId: id, action: 'DISCARD', assetRevision: String(updated.revision) };
  } };
}
