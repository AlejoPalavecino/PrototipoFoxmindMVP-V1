import { createHash } from 'node:crypto';
import { assetUuid, type EditFoxyPrivateAsset, type FoxyPrivateAssetEditReceipt } from '../../../../../../src/core/domain/index.ts';
import type { SqlTransaction } from '../../../../../../src/core/contracts/sql.ts';
const fail = (code: string): never => { throw Object.assign(new Error(code), { code }); };
export function createFoxyPrivateAssetEditorialRepository() {
  return { async edit(tx: SqlTransaction, ownerId: string, assetId: string, command: EditFoxyPrivateAsset): Promise<FoxyPrivateAssetEditReceipt> {
    const owner = assetUuid(ownerId), id = assetUuid(assetId);
    if (!(await tx.query("SELECT id FROM users WHERE id=$1::uuid AND account_role='teacher' AND email_verified_at IS NOT NULL FOR UPDATE",owner)).length) return fail('NOT_FOUND');
    const [ref] = await tx.query<{ conversation_id: string; classroom_id: string | null }>(`SELECT a.conversation_id,c.classroom_id FROM foxy_visual_assets a
      JOIN foxy_conversations c ON c.id=a.conversation_id AND c.owner_id=a.owner_id WHERE a.id=$1::uuid AND a.owner_id=$2::uuid AND c.deleted_at IS NULL`,id,owner);
    if (!ref) return fail('NOT_FOUND');
    if (ref.classroom_id && !(await tx.query('SELECT id FROM classrooms WHERE id=$1::uuid AND teacher_id=$2::uuid FOR SHARE',ref.classroom_id,owner)).length) return fail('NOT_FOUND');
    const [conversation] = await tx.query<{ classroom_id: string | null }>('SELECT classroom_id FROM foxy_conversations WHERE id=$1::uuid AND owner_id=$2::uuid AND deleted_at IS NULL FOR UPDATE',ref.conversation_id,owner);
    if (!conversation || conversation.classroom_id !== ref.classroom_id) return fail('NOT_FOUND');
    const [asset] = await tx.query<{ state: string; revision: bigint; editorial_revision: bigint }>('SELECT state,revision,editorial_revision FROM foxy_visual_assets WHERE id=$1::uuid AND owner_id=$2::uuid FOR UPDATE',id,owner);
    if (!asset) return fail('NOT_FOUND');
    const hash = createHash('sha256').update(JSON.stringify(['foxy-private-editorial-v1',id,command.expectedRevision,command.title,command.description])).digest('hex');
    const [previous] = await tx.query<{ asset_id: string; action: string; input_hash: string; editorial_revision: bigint }>('SELECT asset_id,action,input_hash,editorial_revision FROM foxy_private_asset_commands WHERE owner_id=$1::uuid AND request_id=$2::uuid',owner,command.requestId);
    if (previous) {
      if (previous.asset_id !== id || previous.action !== 'EDIT' || previous.input_hash !== hash) return fail('CONFLICT');
      return { assetId: id, action: 'EDIT', editorialRevision: String(previous.editorial_revision) };
    }
    if (asset.state !== 'READY' || String(asset.editorial_revision) !== command.expectedRevision || command.expectedRevision === '9223372036854775807') return fail('CONFLICT');
    const [updated] = await tx.query<{ editorial_revision: bigint }>(`UPDATE foxy_visual_assets SET editorial_revision=editorial_revision+1,editorial_title=$4,editorial_description=$5,
      updated_at=clock_timestamp(),last_activity_at=clock_timestamp() WHERE id=$1::uuid AND owner_id=$2::uuid AND editorial_revision=$3::bigint AND state='READY' RETURNING editorial_revision`,id,owner,command.expectedRevision,command.title,command.description);
    if (!updated) return fail('CONFLICT');
    await tx.query(`INSERT INTO foxy_private_asset_commands(owner_id,request_id,asset_id,action,input_hash,asset_revision,editorial_revision)
      VALUES($1::uuid,$2::uuid,$3::uuid,'EDIT',$4,$5::bigint,$6::bigint)`,owner,command.requestId,id,hash,asset.revision,updated.editorial_revision);
    return { assetId: id, action: 'EDIT', editorialRevision: String(updated.editorial_revision) };
  } };
}
