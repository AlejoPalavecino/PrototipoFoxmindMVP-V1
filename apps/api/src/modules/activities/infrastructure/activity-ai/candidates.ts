import { DOCUMENT_MAX_BYTES, isDocumentExtension } from '../../../../../../../src/core/domain/documents/document-formats.ts';
import type { ActivitySourceCandidate } from '../../../../../../../src/core/domain/index.ts';
import type { Transaction } from '../../../classrooms/public.ts';

interface CandidateRow { source_id: string; file_id: string; title: string; kind: 'plan' | 'material'; extension: string;
  size_bytes: bigint | string; unit_id: string | null; topic_id: string | null; ready: boolean }
export async function candidates(tx: Transaction, classroomId: string): Promise<ActivitySourceCandidate[]> {
  const rows = await tx.query<CandidateRow>(`SELECT s.*,f.extension,f.size_bytes,
    (f.blob_deleted_at IS NULL AND c.phase='ready' AND u.status='COMPLETED' AND f.validation_status='APPROVED'
    AND f.scan_status='CLEAN' AND c.digest IS NOT NULL AND c.digest=c.validated_digest AND c.digest=c.scanned_digest) AS ready
    FROM (SELECT 'plan:'||p.id AS source_id,p.file_id,'Programa vigente' AS title,'plan' AS kind,
      NULL::uuid AS unit_id,NULL::uuid AS topic_id FROM study_plan_versions p WHERE p.classroom_id=$1::uuid
      AND p.version_number=(SELECT max(version_number) FROM study_plan_versions WHERE classroom_id=$1::uuid)
    UNION ALL SELECT 'material:'||m.id,m.file_id,m.title,'material',m.unit_id,m.topic_id FROM materials m
      WHERE m.classroom_id=$1::uuid AND m.deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM material_revisions mr WHERE mr.previous_id=m.id)) s
    JOIN files f ON f.id=s.file_id JOIN file_custodies c ON c.file_id=f.id JOIN uploads u ON u.file_id=f.id
    ORDER BY s.kind,s.title,s.source_id`, classroomId);
  return rows.map(row => {
    const sizeBytes = Number(row.size_bytes), reason = !row.ready ? 'FILE_NOT_READY' as const
      : !isDocumentExtension(row.extension) ? 'UNSUPPORTED_FORMAT' as const
        : sizeBytes > DOCUMENT_MAX_BYTES ? 'AI_INPUT_LIMIT' as const : null;
    return { sourceId: row.source_id, fileId: row.file_id, title: row.title, kind: row.kind,
      extension: row.extension, sizeBytes, unitId: row.unit_id, topicId: row.topic_id, available: reason === null, reason };
  });
}
