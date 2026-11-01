import { randomUUID } from 'node:crypto';
import type { SqlDatabase, SqlTransaction } from '../../../../src/core/domain/index.ts';

type Candidate = { id: string; classroom_id: string; file_id: string };
type Claim = Candidate & { nonce: string; storage_key: string };
type Locked = { storage_key: string; phase: string; operation_id: string | null; lease_active: boolean; blob_deleted: boolean };
const references = `EXISTS(SELECT 1 FROM materials WHERE file_id=$1::uuid)
  OR EXISTS(SELECT 1 FROM study_plan_versions WHERE file_id=$1::uuid)
  OR EXISTS(SELECT 1 FROM activity_instruction_files WHERE file_id=$1::uuid)
  OR EXISTS(SELECT 1 FROM attempt_attachments WHERE file_id=$1::uuid)
  OR EXISTS(SELECT 1 FROM foxy_publications WHERE file_id=$1::uuid AND id<>$2::uuid)`;
export function createFoxyPublicationCleanup(options: { database: SqlDatabase; storage: { remove(key: string): Promise<void> } }) {
  let active: Promise<boolean> | null = null;
  const transact = <T>(operation: (tx: SqlTransaction) => Promise<T>) => options.database.$transaction(
    raw => operation({ query: (sql, ...args) => raw.$queryRawUnsafe(sql, ...args) }), { maxWait: 2000, timeout: 6000 });
  async function lock(tx: SqlTransaction, candidate: Candidate): Promise<Locked | null> {
    if (!(await tx.query('SELECT id FROM classrooms WHERE id=$1::uuid FOR UPDATE', candidate.classroom_id)).length) return null;
    await tx.query('SELECT pg_advisory_xact_lock(78123003)');
    const [p] = await tx.query(`SELECT id FROM foxy_publications WHERE id=$1::uuid AND classroom_id=$2::uuid AND file_id=$3::uuid
      AND state='DISCARDED' AND material_id IS NULL FOR UPDATE`, candidate.id, candidate.classroom_id, candidate.file_id);
    if (!p) return null;
    const [file] = await tx.query<Locked>(`SELECT f.storage_key,c.phase,c.operation_id,COALESCE(c.lease_until>clock_timestamp(),false) lease_active,
      (f.blob_deleted_at IS NOT NULL) blob_deleted FROM files f JOIN uploads u ON u.file_id=f.id JOIN file_custodies c ON c.file_id=f.id
      JOIN foxy_publications p ON p.id=$2::uuid WHERE f.id=$1::uuid AND f.classroom_id=p.classroom_id AND f.classroom_draft_id IS NULL
      AND f.uploaded_by_id=p.owner_id AND f.extension='pdf' AND f.size_bytes=p.artifact_size_bytes
      AND p.artifact_digest ~ '^[a-f0-9]{64}$' AND p.artifact_page_count>0 AND p.renderer_version IS NOT NULL
      AND (c.digest IS NULL OR c.digest=p.artifact_digest) AND (c.validated_digest IS NULL OR c.validated_digest=p.artifact_digest)
      AND (c.scanned_digest IS NULL OR c.scanned_digest=p.artifact_digest)
      AND c.purpose='material' AND c.target_id IS NULL FOR UPDATE OF f,u,c`, candidate.file_id, candidate.id);
    return file ?? null;
  }
  async function claim(): Promise<Claim | 'conflict' | null> {
    return transact(async tx => {
      const [candidate] = await tx.query<Candidate>(`SELECT p.id,p.classroom_id,p.file_id FROM foxy_publications p
        JOIN files f ON f.id=p.file_id JOIN file_custodies c ON c.file_id=f.id
        WHERE p.state='DISCARDED' AND p.material_id IS NULL AND f.blob_deleted_at IS NULL AND c.phase='deleting'
          AND (c.lease_until IS NULL OR c.lease_until<=clock_timestamp()) ORDER BY p.discarded_at,p.id LIMIT 1`);
      if (!candidate) return null;
      const file = await lock(tx, candidate);
      if (!file || file.phase !== 'deleting' || file.lease_active || file.blob_deleted) return null;
      const nonce = randomUUID();
      await tx.query(`UPDATE file_custodies SET operation_id=$2::uuid,lease_until=clock_timestamp()+interval '90 seconds'
        WHERE file_id=$1::uuid RETURNING file_id`, candidate.file_id, nonce);
      const [ref] = await tx.query(`SELECT 1 WHERE ${references}`, candidate.file_id, candidate.id);
      if (ref) { await tx.query("UPDATE foxy_publications SET cleanup_error_code='REFERENCE_CONFLICT' WHERE id=$1::uuid", candidate.id); return 'conflict'; }
      return { ...candidate, nonce, storage_key: file.storage_key };
    });
  }
  async function finish(claimed: Claim, removed: boolean): Promise<void> {
    await transact(async tx => {
      const file = await lock(tx, claimed);
      if (!file || file.phase !== 'deleting' || !file.lease_active || file.operation_id !== claimed.nonce || file.blob_deleted) return;
      if (!removed) { await tx.query("UPDATE foxy_publications SET cleanup_error_code='STORAGE_UNAVAILABLE' WHERE id=$1::uuid", claimed.id); return; }
      const [ref] = await tx.query(`SELECT 1 WHERE ${references}`, claimed.file_id, claimed.id);
      if (ref) { await tx.query("UPDATE foxy_publications SET cleanup_error_code='REFERENCE_CONFLICT' WHERE id=$1::uuid", claimed.id); return; }
      await tx.query('UPDATE files SET blob_deleted_at=clock_timestamp(),updated_at=clock_timestamp() WHERE id=$1::uuid', claimed.file_id);
      await tx.query(`UPDATE file_custodies SET phase='deleted',operation_id=NULL,lease_until=NULL WHERE file_id=$1::uuid AND operation_id=$2::uuid`, claimed.file_id, claimed.nonce);
      await tx.query(`UPDATE uploads SET reserved_bytes=0,reservation_released_at=clock_timestamp(),updated_at=clock_timestamp()
        WHERE file_id=$1::uuid AND completed_at IS NULL AND reservation_released_at IS NULL`, claimed.file_id);
      await tx.query('UPDATE foxy_publications SET cleanup_error_code=NULL WHERE id=$1::uuid', claimed.id);
    });
  }
  async function sweepOne(): Promise<boolean> {
    try {
      const item = await claim(); if (!item) return false; if (item === 'conflict') return true;
      let removed = false; try { await options.storage.remove(item.storage_key); removed = true; } catch { /* bounded storage failure is recorded */ }
      await finish(item, removed); return true;
    } catch { throw Object.assign(new Error('SERVICE_UNAVAILABLE'), { code: 'SERVICE_UNAVAILABLE' }); }
  }
  return { sweep() {
    if (active) return active;
    const task = sweepOne(); active = task; void task.finally(() => { if (active === task) active = null; }).catch(() => {}); return task;
  } };
}
