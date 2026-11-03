import { randomUUID } from 'node:crypto';
import type { FileDatabase, FileTransaction } from '../files/contracts.ts';
import type { ObjectStorage } from '../files/storage.ts';

/** Explicit teacher-requested deletion only. One bounded object per tick; no general retention cleanup. */
export class LibraryCleanupWorker {
  private timer?: ReturnType<typeof setInterval>;
  private busy?: Promise<void>;
  private stopped = false;
  constructor(private readonly database: FileDatabase, private readonly storage: Pick<ObjectStorage, 'remove'>) {}
  private tx<T>(run: (tx: FileTransaction) => Promise<T>): Promise<T> {
    return this.database.$transaction(raw => run({ query: (sql, ...args) => raw.$queryRawUnsafe(sql, ...args) }), { maxWait: 2000, timeout: 4000 });
  }
  sweep(): Promise<void> {
    if (this.stopped) return Promise.resolve();
    return this.busy ??= this.removeOne().finally(() => { this.busy = undefined; });
  }
  private async removeOne(): Promise<void> {
    const token = randomUUID();
    const claim = await this.tx(async tx => {
      const [candidate] = await tx.query<{ id: string; classroom_id: string }>(`SELECT m.id,m.classroom_id FROM materials m
        JOIN files f ON f.id=m.file_id WHERE m.deleted_at IS NOT NULL AND f.blob_deleted_at IS NULL
        AND (m.deletion_lease_until IS NULL OR m.deletion_lease_until<=clock_timestamp())
        AND (m.deletion_retry_at IS NULL OR m.deletion_retry_at<=clock_timestamp())
        ORDER BY m.deleted_at,m.id LIMIT 1`);
      if (!candidate) return;
      await tx.query('SELECT id FROM classrooms WHERE id=$1::uuid FOR UPDATE', candidate.classroom_id);
      const [row] = await tx.query<{ file_id: string; storage_key: string }>(`SELECT m.file_id,f.storage_key FROM materials m JOIN files f ON f.id=m.file_id
        WHERE m.id=$1::uuid AND m.deleted_at IS NOT NULL AND f.blob_deleted_at IS NULL
        AND (m.deletion_lease_until IS NULL OR m.deletion_lease_until<=clock_timestamp())
        AND (m.deletion_retry_at IS NULL OR m.deletion_retry_at<=clock_timestamp())
        FOR UPDATE OF m,f`, candidate.id);
      if (!row) return;
      const [linked] = await tx.query(`SELECT 1 FROM activity_materials WHERE material_id=$1::uuid
        UNION ALL SELECT 1 FROM materials WHERE file_id=$2::uuid AND id<>$1::uuid
        UNION ALL SELECT 1 FROM study_plan_versions WHERE file_id=$2::uuid
        UNION ALL SELECT 1 FROM activity_instruction_files WHERE file_id=$2::uuid
        UNION ALL SELECT 1 FROM attempt_attachments WHERE file_id=$2::uuid LIMIT 1`, candidate.id, row.file_id);
      if (linked) return; // Conservatively retain bytes and quota for any historical/shared reference.
      await tx.query(`UPDATE materials SET deletion_claim_token=$2::uuid,deletion_lease_until=clock_timestamp()+interval '60 seconds'
        WHERE id=$1::uuid RETURNING id`, candidate.id, token);
      return { ...candidate, ...row };
    });
    if (!claim) return;
    let removed = false;
    try { await this.storage.remove(claim.storage_key); removed = true; }
    catch { /* No storage diagnostics, keys or object names in public/durable errors. */ }
    await this.tx(async tx => {
      await tx.query('SELECT id FROM classrooms WHERE id=$1::uuid FOR UPDATE', claim.classroom_id);
      const [owned] = await tx.query(`SELECT id FROM materials WHERE id=$1::uuid AND deleted_at IS NOT NULL
        AND deletion_claim_token=$2::uuid FOR UPDATE`, claim.id, token);
      if (!owned) return;
      if (removed) await tx.query('UPDATE files SET blob_deleted_at=clock_timestamp(),updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id', claim.file_id);
      // Retry after 10, 20, 40, 80, 160, then at most 300 seconds. Persist independently of the claim lease.
      await tx.query(`UPDATE materials SET deletion_claim_token=NULL,deletion_lease_until=NULL,
        deletion_error_code=$2,
        deletion_retry_at=CASE WHEN $2::text IS NULL THEN NULL ELSE
          clock_timestamp()+LEAST(300, 10 * (1 << deletion_retry_step))*interval '1 second' END,
        deletion_retry_step=CASE WHEN $2::text IS NULL THEN 0 ELSE LEAST(5, deletion_retry_step+1) END,
        updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id`, claim.id, removed ? null : 'STORAGE_UNAVAILABLE');
    });
  }
  onModuleInit(): void {
    if (this.stopped || this.timer) return;
    this.timer = setInterval(() => { void this.sweep().catch(() => {}); }, 5000);
    this.timer.unref();
    void this.sweep().catch(() => {});
  }
  async onModuleDestroy(): Promise<void> {
    this.stopped = true;
    if (this.timer) { clearInterval(this.timer); this.timer = undefined; }
    await this.busy;
  }
}
