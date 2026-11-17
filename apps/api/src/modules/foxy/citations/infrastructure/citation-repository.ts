import type { SqlTransaction } from '../../../../../../../src/core/contracts/sql.ts';
import type { FoxyGroundingFile, FoxyGroundingSnapshot } from '../../../../../../../src/core/domain/foxy/grounding.ts';
import type { FoxyAnswer } from '../../../../../../../src/core/domain/foxy/resource.ts';
import type { mapFoxyCitations } from './citation-mapping.ts';

type CitationInput = Parameters<typeof mapFoxyCitations>[0];
type Turn = { classroom_id: string | null; answer: FoxyAnswer; snapshot: FoxyGroundingSnapshot;
  reference_map: CitationInput['referenceMap']; source_report: CitationInput['sourceReport'] };
type Ready = { original_name: string };
function missing(): never { throw Object.assign(new Error('NOT_FOUND'), { code: 'NOT_FOUND' }); }
export async function loadCitationTurn(tx: SqlTransaction, owner: string, conversationId: string, turnId: string): Promise<Turn> {
  const [row] = await tx.query<Turn>(`SELECT c.classroom_id,t.answer,t.snapshot,t.reference_map,t.source_report FROM foxy_turns t
    JOIN foxy_conversations c ON c.id=t.conversation_id AND c.owner_id=t.owner_id
    LEFT JOIN classrooms room ON room.id=c.classroom_id AND room.teacher_id=c.owner_id
    WHERE t.id=$1::uuid AND t.conversation_id=$2::uuid AND t.owner_id=$3::uuid
      AND t.state='READY' AND c.deleted_at IS NULL AND (c.context_kind='GENERAL' OR room.id IS NOT NULL)
    FOR SHARE OF t,c`, turnId, conversationId, owner);
  if (!row) return missing();
  return row;
}
export async function citationDocument(tx: SqlTransaction, classroomId: string, sourceId: string,
  sourceKind: string, file: FoxyGroundingFile): Promise<Ready | null> {
  const source = sourceId.slice(sourceId.indexOf(':') + 1);
  const joins = sourceKind === 'MATERIAL' ? `JOIN materials s ON s.file_id=f.id AND s.classroom_id=f.classroom_id
    AND s.id=$2::uuid AND s.deleted_at IS NULL`
    : sourceKind === 'PLAN' ? `JOIN study_plan_versions s ON s.file_id=f.id AND s.classroom_id=f.classroom_id AND s.id=$2::uuid`
      : sourceKind === 'ACTIVITY' ? `JOIN activity_instruction_files s ON s.file_id=f.id AND s.classroom_id=f.classroom_id
        JOIN activities a ON a.id=s.activity_id AND a.classroom_id=s.classroom_id AND a.status='PUBLISHED' AND a.id=$2::uuid` : null;
  if (!joins) return null;
  const [row] = await tx.query<Ready>(`SELECT f.original_name FROM files f ${joins}
    JOIN file_custodies custody ON custody.file_id=f.id JOIN uploads upload ON upload.file_id=f.id
    WHERE f.id=$1::uuid AND f.classroom_id=$3::uuid AND f.classroom_draft_id IS NULL AND f.blob_deleted_at IS NULL
      AND f.validation_status='APPROVED' AND f.scan_status='CLEAN' AND upload.status='COMPLETED' AND custody.phase='ready'
      AND custody.purpose=$4 AND custody.target_id IS NOT DISTINCT FROM $5::uuid AND f.extension=$6 AND f.size_bytes=$7::bigint
      AND custody.digest=$8 AND custody.validated_digest=$8 AND custody.scanned_digest=$8
    FOR SHARE OF f,custody,upload`, file.fileId, source, classroomId, file.purpose, file.targetId,
  file.extension, file.sizeBytes, file.digest);
  return row ?? null;
}

export async function textActivity(tx: SqlTransaction, activityId: string, classroomId: string): Promise<boolean> {
 return (await tx.query(`SELECT id FROM activities WHERE id=$1::uuid AND classroom_id=$2::uuid
                AND status='PUBLISHED' FOR SHARE`, activityId, classroomId)).length > 0;
}

export async function citationAttachment(tx: SqlTransaction, input: { attachmentId: string; ownerId: string; conversationId: string }): Promise<boolean> {
  return (await tx.query(`SELECT a.id FROM chat_attachments a JOIN foxy_chat_attachment_links l
                ON l.attachment_id=a.id AND l.owner_id=a.owner_id WHERE a.id=$1::uuid AND a.owner_id=$2::uuid
                AND l.conversation_id=$3::uuid AND l.removed_at IS NULL AND a.folder_id IS NULL AND a.ready_at IS NOT NULL
                AND a.cleanup_claimed_at IS NULL AND a.cleaned_at IS NULL`, input.attachmentId, input.ownerId, input.conversationId)).length > 0;
}
