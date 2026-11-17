import { requireReady } from '../../../files/public.ts';
import type { FileRow } from '../../../files/public.ts';
import type { Transaction } from '../../../classrooms/public.ts';

export async function practicalAttachments(tx: Transaction, attemptId: string, draft: boolean) {
  const files = await tx.query<FileRow & { selected: boolean }>(`SELECT f.*,u.status::text AS upload_status,u.completed_at,
    u.last_activity_at,u.reservation_released_at,c.purpose,c.target_id,c.phase,c.digest,c.validated_digest,c.scanned_digest,
    c.operation_id,c.lease_until,(aa.file_id IS NOT NULL) AS selected
    FROM files f JOIN uploads u ON u.file_id=f.id JOIN file_custodies c ON c.file_id=f.id
    LEFT JOIN attempt_attachments aa ON aa.file_id=f.id AND aa.attempt_id=$1::uuid
    WHERE aa.file_id IS NOT NULL OR ($2 AND c.purpose='attachment' AND c.target_id=$1::uuid
      AND u.status NOT IN ('COMPLETED','CANCELLED','FAILED') AND u.reservation_released_at IS NULL)
    ORDER BY aa.position NULLS LAST,f.created_at,f.id`, attemptId, draft);
  return files.map(row => {
    let ready = true; try { requireReady(row); } catch { ready = false; }
    return { id: row.id, name: row.original_name, extension: row.extension, sizeBytes: row.size_bytes.toString(),
      ready, selected: row.selected, upload: row.upload_status, validation: row.validation_status, scan: row.scan_status,
      rejectionCode: row.rejection_code };
  });
}

export async function questionnaireUnanswered(tx: Transaction, activityId: string, attemptId: string) {
  const rows = await tx.query<{ type: string; text: string | null; selected: boolean }>(`SELECT q.type::text,a.development_text AS text,
    EXISTS(SELECT 1 FROM answer_selections s WHERE s.answer_id=a.id) AS selected FROM questions q
    LEFT JOIN answers a ON a.question_id=q.id AND a.attempt_id=$2::uuid WHERE q.activity_id=$1::uuid
    ORDER BY q.position,q.id`, activityId, attemptId);
  return rows.filter(row => row.type === 'DEVELOPMENT' ? !row.text?.trim() : !row.selected).length;
}
