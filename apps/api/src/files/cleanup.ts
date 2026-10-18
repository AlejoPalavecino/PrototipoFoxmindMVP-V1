import { randomUUID } from 'node:crypto';
import { FileStore, targetOf, type FileRow } from './store.ts';
import { FileError } from './errors.ts';
import { mayClaimAbandonedUpload } from './policy.ts';
import type { ObjectStorage } from './storage.ts';
import type { FileTransaction } from './contracts.ts';

async function references(tx: FileTransaction, id: string): Promise<number> {
  const [row] = await tx.query<{ linked: boolean }>(`SELECT EXISTS(
    SELECT 1 FROM study_plan_versions WHERE file_id=$1::uuid UNION ALL SELECT 1 FROM materials WHERE file_id=$1::uuid
    UNION ALL SELECT 1 FROM activity_instruction_files WHERE file_id=$1::uuid
    UNION ALL SELECT 1 FROM attempt_attachments WHERE file_id=$1::uuid) AS linked`, id);
  return row.linked ? 1 : 0;
}
export async function cleanIncomplete(store: FileStore, storage: ObjectStorage, limit: number) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new FileError('INVALID_UPLOAD');
  const candidates = await store.transaction(tx => tx.query<{ id: string }>(`SELECT f.id FROM files f
    JOIN uploads u ON u.file_id=f.id JOIN file_custodies c ON c.file_id=f.id
    WHERE u.completed_at IS NULL AND u.status<>'COMPLETED' AND u.reservation_released_at IS NULL
      AND c.phase NOT IN ('ready','deleted') AND (c.lease_until IS NULL OR c.lease_until<=clock_timestamp())
      AND u.last_activity_at<=clock_timestamp()-interval '24 hours' ORDER BY u.last_activity_at LIMIT $1`, limit));
  let deleted = 0, failed = 0;
  const deadline = performance.now() + 30000;
  for (const candidate of candidates) {
    if (performance.now() >= deadline) break;
    const operation = randomUUID();
    const claim: FileRow | null = await store.transaction(async tx => {
      const initial = await store.load(tx, candidate.id); await store.lockScope(tx, targetOf(initial).scope);
      const row = await store.load(tx, candidate.id), now = await store.now(tx);
      if (row.phase === 'ready' || row.phase === 'deleted' || (row.lease_until && row.lease_until > now)
        || row.reservation_released_at || !mayClaimAbandonedUpload({ upload: row.upload_status,
          lastActivityAt: row.last_activity_at.getTime(), completedAt: row.completed_at?.getTime() ?? null,
          confirmedDraft: row.completed_at !== null, references: await references(tx, row.id) }, now.getTime())) return null;
      await tx.query(`UPDATE file_custodies SET phase='deleting',operation_id=$2::uuid,
        lease_until=clock_timestamp()+interval '90 seconds' WHERE file_id=$1::uuid RETURNING file_id`, row.id, operation);
      await tx.query(`UPDATE uploads SET status='CANCELLED',updated_at=clock_timestamp() WHERE file_id=$1::uuid RETURNING id`, row.id);
      return row;
    });
    if (!claim) continue;
    try {
      await storage.remove(claim.storage_key);
      await store.transaction(async tx => {
        await store.lockScope(tx, targetOf(claim).scope); const current = await store.load(tx, claim.id);
        if (current.phase !== 'deleting' || current.operation_id !== operation || current.completed_at
          || await references(tx, claim.id)) throw new FileError('UPLOAD_CONFLICT');
        await tx.query(`UPDATE uploads SET reserved_bytes=0,reservation_released_at=clock_timestamp(),updated_at=clock_timestamp()
          WHERE file_id=$1::uuid RETURNING id`, claim.id);
        await tx.query(`UPDATE file_custodies SET phase='deleted',operation_id=NULL,lease_until=NULL WHERE file_id=$1::uuid RETURNING file_id`, claim.id);
        await tx.query(`UPDATE files SET validation_status='REJECTED',scan_status='ERROR',rejection_code='INCOMPLETE_UPLOAD_REMOVED',
          updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id`, claim.id);
      });
      deleted++;
    } catch { failed++; } // Reservation retained. The next bounded sweep can retry the expired deletion lease.
  }
  return { deleted, failed };
}
