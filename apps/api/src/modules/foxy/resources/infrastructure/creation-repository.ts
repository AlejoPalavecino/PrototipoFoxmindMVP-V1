import type { FoxyContext } from '../../../../../../../src/core/domain/foxy/foxy-ai.ts';
import type { SqlTransaction } from '../../../../../../../src/core/contracts/sql.ts';
import { catalogUuid, creationOptions, invalidCatalog, type CreationPageOptions, type CreationKind, type CreationStatus } from '../application/catalog-input.ts';
export type FoxyCreationDestination = { kind: 'MATERIAL' | 'ACTIVITY'; classroomId: string; classroomName: string; id: string | null; state: Exclude<CreationStatus, 'PRIVATE'> };
export type FoxyCreation = { id: string; kind: CreationKind; title: string; context: FoxyContext; conversationId: string; turnId: string | null; visualJobId: string | null; assetId: string | null; createdAt: string; status: CreationStatus; destinations: FoxyCreationDestination[] };
type Row = { id: string; kind: CreationKind; title: string; context_kind: 'GENERAL' | 'CLASSROOM'; classroom_id: string | null; conversation_id: string; turn_id: string | null; visual_job_id: string | null; asset_id: string | null; created_at: Date; status: CreationStatus; destinations: FoxyCreationDestination[] };
const sql = `WITH visible_conversations AS (
  SELECT c.* FROM foxy_conversations c JOIN users u ON u.id=c.owner_id
  WHERE c.owner_id=$1::uuid AND c.deleted_at IS NULL AND u.account_role='teacher' AND u.email_verified_at IS NOT NULL
  AND (c.context_kind='GENERAL' OR EXISTS(SELECT 1 FROM classrooms r WHERE r.id=c.classroom_id AND r.teacher_id=$1::uuid))
  AND ($2='ALL' OR ($2='GENERAL' AND c.context_kind='GENERAL') OR c.classroom_id::text=$2)
), creations AS (
 SELECT t.id,CASE t.purpose WHEN 'STUDY_MATERIAL' THEN 'NOTE' WHEN 'REVIEW' THEN 'NOTE' WHEN 'LESSON_PLAN' THEN 'PLAN'
   WHEN 'ACTIVITY_IDEAS' THEN 'ACTIVITY' WHEN 'RUBRIC' THEN 'RUBRIC' END kind,
   COALESCE(r.title,t.answer->>'title') title,c.context_kind,c.classroom_id,c.id conversation_id,
   t.id turn_id,NULL::uuid visual_job_id,NULL::uuid asset_id,t.created_at,r.id resource_id
 FROM visible_conversations c JOIN foxy_turns t ON t.conversation_id=c.id AND t.owner_id=$1::uuid
 LEFT JOIN foxy_resources r ON r.source_turn_id=t.id AND r.owner_id=$1::uuid
 WHERE t.state='READY' AND t.purpose IN ('STUDY_MATERIAL','REVIEW','LESSON_PLAN','ACTIVITY_IDEAS','RUBRIC')
   AND t.answer->'missingInformation'='[]'::jsonb
 UNION ALL
 SELECT j.id,j.kind,COALESCE(a.editorial_title,a.title),c.context_kind,c.classroom_id,c.id,NULL::uuid,j.id,a.id,j.created_at,NULL::uuid
 FROM visible_conversations c JOIN foxy_visual_jobs j ON j.conversation_id=c.id AND j.owner_id=$1::uuid
 JOIN foxy_visual_assets a ON a.id=j.asset_id AND a.owner_id=$1::uuid AND a.conversation_id=c.id
 WHERE j.state='READY' AND a.state='READY' AND a.blob_deleted_at IS NULL
), detailed AS (
 SELECT x.*,d.destinations,CASE WHEN d.published THEN 'PUBLISHED' WHEN d.draft THEN 'DRAFT'
   WHEN jsonb_array_length(d.destinations)>0 THEN 'PREPARING' ELSE 'PRIVATE' END status
 FROM creations x CROSS JOIN LATERAL (
 SELECT COALESCE(jsonb_agg(jsonb_build_object('kind',z.kind,'classroomId',z.classroom_id,'classroomName',z.name,'id',z.id,'state',z.state)
   ORDER BY z.kind,z.classroom_id,z.id NULLS LAST),'[]'::jsonb) destinations,
   COALESCE(bool_or(z.state='PUBLISHED'),false) published,COALESCE(bool_or(z.state='DRAFT'),false) draft
 FROM (
   SELECT 'MATERIAL' kind,room.id classroom_id,room.name,m.id,
     CASE WHEN m.id IS NOT NULL THEN 'PUBLISHED' ELSE 'PREPARING' END state
   FROM foxy_publications p JOIN classrooms room ON room.id=p.classroom_id AND room.teacher_id=$1::uuid
   LEFT JOIN materials m ON m.id=p.material_id AND m.classroom_id=p.classroom_id AND m.created_by_id=$1::uuid AND m.deleted_at IS NULL
   WHERE p.owner_id=$1::uuid AND ((p.resource_id=x.resource_id AND x.resource_id IS NOT NULL) OR (p.source_asset_id=x.asset_id AND x.asset_id IS NOT NULL))
     AND (p.state IN ('PREPARING','READY') OR (p.state='PUBLISHED' AND m.id IS NOT NULL))
   UNION
   SELECT 'ACTIVITY',room.id,room.name,a.id,CASE WHEN a.status::text='DRAFT' THEN 'DRAFT' ELSE 'PUBLISHED' END
   FROM foxy_resource_requests request JOIN activities a ON a.id::text=request.result->>'activityId'
   JOIN classrooms room ON room.id=a.classroom_id AND room.teacher_id=$1::uuid AND room.id::text=request.result->>'classroomId'
   WHERE request.owner_id=$1::uuid AND request.resource_id=x.resource_id AND x.resource_id IS NOT NULL AND a.status::text IN ('DRAFT','PUBLISHED')
 ) z
 ) d
)
SELECT * FROM detailed x WHERE strpos(lower(x.title),lower($3))>0 AND ($4='ALL' OR x.kind=$4) AND ($5='ALL' OR x.status=$5)
 AND ($6::timestamptz IS NULL OR (date_trunc('milliseconds',x.created_at),x.id)<($6::timestamptz,$7::uuid))
ORDER BY date_trunc('milliseconds',x.created_at) DESC,x.id DESC LIMIT $8`;
export function createFoxyCreationRepository() {
  return { async listPage(tx: SqlTransaction, owner: string, input: CreationPageOptions) {
    if (!catalogUuid.test(owner)) return invalidCatalog();
    const v=creationOptions(input);
    const rows=await tx.query<Row>(sql,owner,v.context,v.q,v.type,v.status,v.after?.createdAt??null,v.after?.id??null,v.limit+1);
    const items: FoxyCreation[]=rows.slice(0,v.limit).map(r=>({id:r.id,kind:r.kind,title:r.title,
      context:r.context_kind==='GENERAL'?{kind:'GENERAL'}:{kind:'CLASSROOM',classroomId:r.classroom_id!},
      conversationId:r.conversation_id,turnId:r.turn_id,visualJobId:r.visual_job_id,assetId:r.asset_id,
      createdAt:r.created_at.toISOString(),status:r.status,destinations:r.destinations}));
    const last=items.at(-1);
    return {items,next:rows.length>v.limit&&last?{createdAt:last.createdAt,id:last.id}:null};
  }};
}
