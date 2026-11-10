import type { FilePurpose } from './policy.ts';

export const uuid = (value: unknown): value is string => typeof value === 'string'
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export interface FileRow {
  id: string; classroom_id: string | null; classroom_draft_id: string | null; uploaded_by_id: string;
  original_name: string; extension: string; detected_mime_type: string | null; storage_key: string; size_bytes: bigint;
  validation_status: 'PENDING' | 'APPROVED' | 'REJECTED'; scan_status: 'PENDING' | 'RUNNING' | 'CLEAN' | 'REJECTED' | 'ERROR';
  rejection_code: string | null; upload_status: 'STARTED' | 'UPLOADING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  completed_at: Date | null; last_activity_at: Date; reservation_released_at: Date | null;
  purpose: FilePurpose; target_id: string | null; phase: string; digest: string | null;
  blob_deleted_at: Date | null;
  validated_digest: string | null; scanned_digest: string | null; operation_id: string | null; lease_until: Date | null;
}
export function targetOf(row: FileRow): { scope: { kind: 'classroom' | 'draft'; id: string }; purpose: FilePurpose; targetId: string | null; fileId: string } {
  return { scope: row.classroom_id ? { kind: 'classroom', id: row.classroom_id } : { kind: 'draft', id: row.classroom_draft_id! },
    purpose: row.purpose, targetId: row.target_id, fileId: row.id };
}
