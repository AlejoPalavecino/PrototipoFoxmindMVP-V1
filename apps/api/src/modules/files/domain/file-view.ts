import { requireReady } from './readiness.ts';
import type { FileRow } from './file-record.ts';

export interface FileView {
  id: string; name: string; sizeBytes: number; ready: boolean;
  upload: FileRow['upload_status']; validation: FileRow['validation_status']; scan: FileRow['scan_status']; rejectionCode: string | null;
}
export function view(row: FileRow): FileView {
  let ready = true; try { requireReady(row); } catch { ready = false; }
  return { id: row.id, name: row.original_name, sizeBytes: Number(row.size_bytes), ready,
    upload: row.upload_status, validation: row.validation_status, scan: row.scan_status, rejectionCode: row.rejection_code };
}
