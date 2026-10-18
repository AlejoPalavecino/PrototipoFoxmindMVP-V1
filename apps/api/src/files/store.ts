import { FileError } from './errors.ts';
import type { FileDatabase, FileTransaction, FileScope, FileTarget, FileAccess, FileAction } from './contracts.ts';
import type { FilePurpose } from './policy.ts';
import type { IdentityHttpError, IdentityErrorCode } from '../identity/errors.ts';

/** Trusted host rejection, kept separate from driver errors and file policy failures. */
export class FileIdentityError extends Error {
  readonly code: IdentityErrorCode;
  readonly status: number;
  readonly retryAfter?: number;
  constructor(error: Pick<IdentityHttpError, 'code' | 'status' | 'retryAfter'>) {
    super('Identity request rejected.');
    this.code = error.code; this.status = error.status; this.retryAfter = error.retryAfter;
  }
}

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
export function targetOf(row: FileRow): FileTarget {
  return { scope: row.classroom_id ? { kind: 'classroom', id: row.classroom_id } : { kind: 'draft', id: row.classroom_draft_id! },
    purpose: row.purpose, targetId: row.target_id, fileId: row.id };
}
export class FileStore {
  readonly database: FileDatabase;
  readonly access: FileAccess;
  readonly draftQuotaBytes: bigint;
  constructor(database: FileDatabase, access: FileAccess, draftQuotaBytes: bigint) {
    this.database = database; this.access = access; this.draftQuotaBytes = draftQuotaBytes;
  }
  async transaction<T>(run: (tx: FileTransaction) => Promise<T>): Promise<T> {
    try {
      return await this.database.$transaction(raw => run({ query: (sql, ...values) => raw.$queryRawUnsafe(sql, ...values) }),
        { maxWait: 2000, timeout: 4000 });
    } catch (error) { if (error instanceof FileError || error instanceof FileIdentityError) throw error; throw new FileError('SERVICE_UNAVAILABLE'); }
  }
  async now(tx: FileTransaction): Promise<Date> {
    const [row] = await tx.query<{ now: Date }>('SELECT clock_timestamp() AS now'); return row.now;
  }
  async lockScope(tx: FileTransaction, scope: FileScope): Promise<{ quota: bigint; owner: string; archived: boolean }> {
    if (!scope || !uuid(scope.id) || !['classroom', 'draft'].includes(scope.kind)) throw new FileError('INVALID_UPLOAD');
    if (scope.kind === 'classroom') {
      const [row] = await tx.query<{ storage_quota_bytes: bigint; teacher_id: string; archived_at: Date | null }>(
        'SELECT storage_quota_bytes,teacher_id,archived_at FROM classrooms WHERE id=$1::uuid FOR UPDATE', scope.id);
      if (!row) throw new FileError('FORBIDDEN');
      return { quota: row.storage_quota_bytes, owner: row.teacher_id, archived: row.archived_at !== null };
    }
    const [row] = await tx.query<{ owner_id: string; published_classroom_id: string | null }>(
      'SELECT owner_id,published_classroom_id FROM classroom_drafts WHERE id=$1::uuid FOR UPDATE', scope.id);
    if (!row) throw new FileError('FORBIDDEN');
    return { quota: this.draftQuotaBytes, owner: row.owner_id, archived: row.published_classroom_id !== null };
  }
  async authorize(tx: FileTransaction, request: unknown, target: FileTarget, action: FileAction): Promise<{ quota: bigint; userId: string }> {
    const userId = await this.access.authenticate(tx, request, action);
    if (!uuid(userId)) throw new FileError('FORBIDDEN');
    const [user] = await tx.query<{ email_verified_at: Date | null }>('SELECT email_verified_at FROM users WHERE id=$1::uuid FOR SHARE', userId);
    if (!user?.email_verified_at || await this.access.authenticate(tx, request, action) !== userId) throw new FileError('FORBIDDEN');
    const scope = await this.lockScope(tx, target.scope);
    if (action === 'upload' && scope.archived) throw new FileError('FORBIDDEN');
    if (target.scope.kind === 'draft' && (scope.owner !== userId || target.purpose !== 'plan')) throw new FileError('FORBIDDEN');
    if (target.scope.kind === 'classroom' && scope.owner !== userId) {
      const [membership] = await tx.query(`SELECT 1 AS allowed FROM enrollments e JOIN membership_periods m ON m.enrollment_id=e.id
        WHERE e.classroom_id=$1::uuid AND e.student_id=$2::uuid AND m.ended_at IS NULL FOR SHARE OF e,m`, target.scope.id, userId);
      if (!membership || (action === 'upload' && target.purpose !== 'attachment')) throw new FileError('FORBIDDEN');
    }
    if (target.scope.kind === 'classroom' && action === 'upload' && target.purpose === 'attachment' && scope.owner === userId) throw new FileError('FORBIDDEN');
    await this.access.authorize(tx, userId, target, action, request);
    return { quota: scope.quota, userId };
  }
  async load(tx: FileTransaction, id: string): Promise<FileRow> {
    if (!uuid(id)) throw new FileError('NOT_FOUND');
    const [row] = await tx.query<FileRow>(`SELECT f.*,u.status::text AS upload_status,u.completed_at,u.last_activity_at,u.reservation_released_at,
      c.purpose,c.target_id,c.phase,c.digest,c.validated_digest,c.scanned_digest,c.operation_id,c.lease_until
      FROM files f JOIN uploads u ON u.file_id=f.id JOIN file_custodies c ON c.file_id=f.id WHERE f.id=$1::uuid`, id);
    if (!row) throw new FileError('NOT_FOUND'); return row;
  }
  async loadAuthorized(tx: FileTransaction, request: unknown, id: string, action: FileAction): Promise<FileRow> {
    const row = await this.load(tx, id);
    if (row.blob_deleted_at) throw new FileError('FORBIDDEN');
    const actor = await this.authorize(tx, request, targetOf(row), action);
    if (action === 'upload' && row.uploaded_by_id !== actor.userId) throw new FileError('FORBIDDEN');
    const current = await this.load(tx, id);
    // A draft publication may have completed while this transaction waited for its source lock.
    // Retry with the new scope instead of acquiring destination locks in reverse order.
    if (current.classroom_id !== row.classroom_id || current.classroom_draft_id !== row.classroom_draft_id) throw new FileError('UPLOAD_CONFLICT');
    return current;
  }
  async usage(tx: FileTransaction, scope: FileScope): Promise<bigint> {
    const column = scope.kind === 'classroom' ? 'classroom_id' : 'classroom_draft_id';
    const [row] = await tx.query<{ used: bigint }>(`SELECT COALESCE(SUM(f.size_bytes),0)::bigint AS used FROM files f
      LEFT JOIN uploads u ON u.file_id=f.id WHERE f.${column}=$1::uuid
      AND f.blob_deleted_at IS NULL AND (u.id IS NULL OR u.status='COMPLETED' OR u.reservation_released_at IS NULL)`, scope.id);
    return row.used;
  }
}
