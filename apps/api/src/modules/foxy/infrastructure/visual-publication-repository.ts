import { createHash, randomUUID } from 'node:crypto';
import { assetUuid, type PrepareFoxyVisualPublication, type FoxyVisualPublicationSummary } from '../../../../../../src/core/domain/index.ts';
import type { SqlTransaction } from '../../../../../../src/core/contracts/sql.ts';
import type { createFoxyPrivateAssetReadRepository } from './private-asset-read-repository.ts';
type Row = { id: string; source_asset_id: string; source_asset_revision: bigint; source_editorial_revision: bigint | null; classroom_id: string; unit_id: string|null; topic_id: string|null; title: string; state: FoxyVisualPublicationSummary['state']; revision: bigint; input_hash: string };
const fail = (code: string): never => { throw Object.assign(new Error(code),{code}); };
function view(row: Row): FoxyVisualPublicationSummary { return { id:row.id,sourceKind:'VISUAL',assetId:row.source_asset_id,assetRevision:String(row.source_asset_revision),editorialRevision:String(row.source_editorial_revision ?? 0),classroomId:row.classroom_id,unitId:row.unit_id,topicId:row.topic_id,title:row.title,state:row.state,revision:String(row.revision) }; }
async function scope(tx: SqlTransaction, owner: string, asset: string, destination?: string) {
  const [ref] = await tx.query<{ classroom_id: string|null }>(`SELECT c.classroom_id FROM foxy_visual_assets a JOIN foxy_conversations c ON c.id=a.conversation_id AND c.owner_id=a.owner_id
    JOIN users u ON u.id=a.owner_id WHERE a.id=$1::uuid AND a.owner_id=$2::uuid AND c.deleted_at IS NULL AND u.account_role='teacher' AND u.email_verified_at IS NOT NULL`,asset,owner);
  if (!ref) return fail('NOT_FOUND');
  const rooms = [...new Set([ref.classroom_id,destination].filter((x): x is string => !!x))].sort();
  if (rooms.length && (await tx.query('SELECT id FROM classrooms WHERE id=ANY($1::uuid[]) AND teacher_id=$2::uuid ORDER BY id FOR SHARE',rooms,owner)).length !== rooms.length) return fail('NOT_FOUND');
}
export function createFoxyVisualPublicationRepository(options: { assets: Pick<ReturnType<typeof createFoxyPrivateAssetReadRepository>,'describe' | 'inspect'> }) {
  return {
    async prepare(tx: SqlTransaction, ownerId: string, assetId: string, input: PrepareFoxyVisualPublication) {
      const owner=assetUuid(ownerId), id=assetUuid(assetId); await tx.query('SELECT id FROM users WHERE id=$1::uuid FOR UPDATE',owner);
      await scope(tx,owner,id,assetUuid(input.classroomId));
      const hash=createHash('sha256').update(JSON.stringify(['foxy-visual-publication-v1',id,input.assetRevision,assetUuid(input.classroomId),input.title,input.unitId ? assetUuid(input.unitId) : null,input.topicId ? assetUuid(input.topicId) : null,...(input.editorialRevision === undefined ? [] : [input.editorialRevision])])).digest('hex');
      const [prior]=await tx.query<Row>('SELECT * FROM foxy_publications WHERE owner_id=$1::uuid AND request_id=$2::uuid',owner,input.requestId);
      if (prior) { if (prior.input_hash!==hash) return fail('CONFLICT'); return { created:false, publication:view(prior) }; }
      const [receipt]=await tx.query<{ publication_id: string; action: string; input_hash: string }>('SELECT publication_id,action,input_hash FROM foxy_publication_command_requests WHERE owner_id=$1::uuid AND request_id=$2::uuid',owner,input.requestId);
      if (receipt) {
        if (receipt.action!=='PREPARE' || receipt.input_hash!==hash) return fail('CONFLICT');
        const [prepared]=await tx.query<Row>('SELECT * FROM foxy_publications WHERE id=$1::uuid AND owner_id=$2::uuid AND source_asset_id=$3::uuid AND classroom_id=$4::uuid',receipt.publication_id,owner,id,input.classroomId);
        if (!prepared) return fail('NOT_FOUND'); return { created:false, publication:view(prepared) };
      }
      const [dest]=await tx.query(`SELECT c.id FROM classrooms c WHERE c.id=$1::uuid AND c.teacher_id=$2::uuid AND c.archived_at IS NULL
        AND ($3::uuid IS NULL OR EXISTS(SELECT 1 FROM units u WHERE u.id=$3::uuid AND u.classroom_id=c.id))
        AND ($4::uuid IS NULL OR EXISTS(SELECT 1 FROM topics t WHERE t.id=$4::uuid AND t.unit_id=$3::uuid AND t.classroom_id=c.id))`,input.classroomId,owner,input.unitId,input.topicId);
      if (!dest) return fail('NOT_FOUND');
      const asset=await options.assets.describe(tx,owner,id); if (asset.assetRevision!==input.assetRevision) return fail('CONFLICT');
      const inspection=await options.assets.inspect(tx,owner,id);
      const editorial=inspection.editorial; if (!editorial) return fail('FILE_NOT_READY');
      if (input.editorialRevision !== undefined && input.editorialRevision !== editorial.revision) return fail('CONFLICT');
      const [duplicate]=await tx.query<Row>(`SELECT * FROM foxy_publications
        WHERE owner_id=$1::uuid AND source_asset_id=$2::uuid AND source_asset_revision=$3::bigint AND classroom_id=$4::uuid
        AND COALESCE(source_editorial_revision,0)=$5::bigint AND state<>'DISCARDED' ORDER BY (state='PUBLISHED') DESC,created_at,id LIMIT 1`,owner,id,input.assetRevision,input.classroomId,editorial.revision);
      if (duplicate) {
        await tx.query(`INSERT INTO foxy_publication_command_requests(owner_id,request_id,publication_id,action,input_hash,publication_revision)
          VALUES($1::uuid,$2::uuid,$3::uuid,'PREPARE',$4,$5::bigint)`,owner,input.requestId,duplicate.id,hash,duplicate.revision);
        return { created:false, publication:view(duplicate) };
      }
      const snapshot={kind:'VISUAL',assetId:id,assetRevision:asset.assetRevision,digest:asset.digest,sizeBytes:asset.sizeBytes,mimeType:asset.mimeType,width:asset.width,height:asset.height,producerVersion:asset.producerVersion};
      const [row]=await tx.query<Row>(`INSERT INTO foxy_publications(id,owner_id,request_id,input_hash,source_kind,source_asset_id,source_asset_revision,source_editorial_revision,snapshot_description,snapshot_title,snapshot_visual,classroom_id,unit_id,topic_id,title)
        VALUES($1::uuid,$2::uuid,$3::uuid,$4,'VISUAL',$5::uuid,$6::bigint,$13::bigint,$14,$7,$8::jsonb,$9::uuid,$10::uuid,$11::uuid,$12) RETURNING *`,randomUUID(),owner,input.requestId,hash,id,input.assetRevision,input.title,JSON.stringify(snapshot),input.classroomId,input.unitId,input.topicId,input.title,editorial.revision,editorial.description);
      if (!row) return fail('CONFLICT'); return { created:true, publication:view(row) };
    },
    async list(tx: SqlTransaction, ownerId: string, assetId: string, page: { limit:number; afterId:string|null }) {
      const owner=assetUuid(ownerId), id=assetUuid(assetId); await scope(tx,owner,id);
      if (page.afterId !== null) { const [cursor]=await tx.query('SELECT id FROM foxy_publications WHERE id=$1::uuid AND owner_id=$2::uuid AND source_asset_id=$3::uuid',assetUuid(page.afterId),owner,id); if (!cursor) return fail('NOT_FOUND'); }
      const rows=await tx.query<Row>(`SELECT p.* FROM foxy_publications p JOIN classrooms c ON c.id=p.classroom_id AND c.teacher_id=p.owner_id
        WHERE p.owner_id=$1::uuid AND p.source_asset_id=$2::uuid AND ($3::uuid IS NULL OR (p.created_at,p.id)<(SELECT created_at,id FROM foxy_publications WHERE id=$3::uuid))
        ORDER BY p.created_at DESC,p.id DESC LIMIT $4`,owner,id,page.afterId,page.limit+1);
      const items=rows.slice(0,page.limit).map(view); return {items,nextAfterId:rows.length>page.limit ? items[items.length-1]!.id : null};
    },
  };
}
