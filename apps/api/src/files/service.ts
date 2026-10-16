import { randomUUID, createHash } from 'node:crypto';
import { FileError } from './errors.ts';
import { validateUploadIntent, assertFileUsable, type UploadIntent } from './policy.ts';
import { inspectContent } from './content.ts';
import { FileStore, targetOf, uuid, type FileRow } from './store.ts';
import type { FileScope, FileDatabase, FileAccess } from './contracts.ts';
import type { ObjectStorage } from './storage.ts';
import type { FileScanner } from './scanner.ts';
import { cleanIncomplete } from './cleanup.ts';
import { promoteDraftPlan } from './promotion.ts';
import type { FileTransaction } from './contracts.ts';

export interface FileServiceOptions {
  database: FileDatabase; access: FileAccess; storage: ObjectStorage; scanner: FileScanner;
  draftQuotaBytes: bigint;
}
const digestOf = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
export function requireReady(row: FileRow): void {
  if (row.phase !== 'ready') throw new FileError('FILE_NOT_READY');
  try { assertFileUsable({ upload: row.upload_status, validation: row.validation_status, scan: row.scan_status,
    objectDigest: row.digest ?? '', validatedDigest: row.validated_digest, scannedDigest: row.scanned_digest }); }
  catch { throw new FileError('FILE_NOT_READY'); }
}
function view(row: FileRow) {
  let ready = true; try { requireReady(row); } catch { ready = false; }
  return { id: row.id, name: row.original_name, sizeBytes: Number(row.size_bytes), ready,
    upload: row.upload_status, validation: row.validation_status, scan: row.scan_status, rejectionCode: row.rejection_code };
}

/** No HTTP installation, session implementation or permissive authorization fallback. */
export class FileService {
  readonly store: FileStore;
  readonly storage: ObjectStorage;
  readonly scanner: FileScanner;
  private busy = false;
  constructor(options: FileServiceOptions) {
    if (!options?.database || typeof options.access?.authenticate !== 'function' || typeof options.access?.authorize !== 'function'
      || !options.storage || !options.scanner || typeof options.draftQuotaBytes !== 'bigint' || options.draftQuotaBytes < 0n) {
      throw new FileError('SERVICE_UNAVAILABLE');
    }
    this.store = new FileStore(options.database, options.access, options.draftQuotaBytes);
    this.storage = options.storage; this.scanner = options.scanner;
  }
  private async slot<T>(run: () => Promise<T>): Promise<T> {
    // Do not retain an unbounded queue of up-to-50MB request bodies.
    if (this.busy) throw new FileError('SERVICE_UNAVAILABLE');
    this.busy = true; try { return await run(); } finally { this.busy = false; }
  }
  async begin(request: unknown, scope: FileScope, intent: UploadIntent, targetId: string | null = null) {
    const admitted = validateUploadIntent(intent);
    intent = { purpose: intent.purpose, name: intent.name, bytes: intent.bytes };
    scope = { ...scope };
    if ((targetId !== null && !uuid(targetId)) || (['instructions', 'attachment'].includes(intent.purpose) && !targetId)) {
      throw new FileError('INVALID_UPLOAD');
    }
    return this.store.transaction(async tx => {
      const { quota, userId } = await this.store.authorize(tx, request, { scope, purpose: intent.purpose, targetId }, 'upload');
      if (await this.store.usage(tx, scope) + BigInt(intent.bytes) > quota) throw new FileError('QUOTA_EXCEEDED');
      const id = randomUUID(), uploadId = randomUUID();
      await tx.query(`INSERT INTO files(id,updated_at,classroom_id,classroom_draft_id,uploaded_by_id,storage_key,original_name,extension,size_bytes)
        VALUES($1::uuid,clock_timestamp(),$2::uuid,$3::uuid,$4::uuid,$5,$6,$7,$8::bigint) RETURNING id`, id,
        scope.kind === 'classroom' ? scope.id : null, scope.kind === 'draft' ? scope.id : null, userId,
        `p4/${id}/blob`, intent.name, admitted.extension, BigInt(intent.bytes));
      await tx.query(`INSERT INTO uploads(id,updated_at,file_id,reserved_bytes)
        VALUES($1::uuid,clock_timestamp(),$2::uuid,$3::bigint) RETURNING id`, uploadId, id, BigInt(intent.bytes));
      await tx.query(`INSERT INTO file_custodies(file_id,purpose,target_id) VALUES($1::uuid,$2,$3::uuid) RETURNING file_id`, id, intent.purpose, targetId);
      return view(await this.store.load(tx, id));
    });
  }
  async status(request: unknown, id: string) {
    return this.store.transaction(async tx => view(await this.store.loadAuthorized(tx, request, id, 'status')));
  }
  async usage(request: unknown, scope: FileScope) {
    scope = { ...scope };
    return this.store.transaction(async tx => {
      const { quota } = await this.store.authorize(tx, request, { scope, purpose: 'plan', targetId: null }, 'usage');
      const usedBytes = await this.store.usage(tx, scope);
      return { usedBytes, quotaBytes: quota, availableBytes: quota > usedBytes ? quota - usedBytes : 0n };
    });
  }
  async receive(request: unknown, id: string, input: Buffer) {
    if (!Buffer.isBuffer(input) || input.length < 1 || input.length > 50_000_000) throw new FileError('INVALID_UPLOAD');
    return this.slot(async () => {
      const bytes = Buffer.from(input), digest = digestOf(bytes), operation = randomUUID();
      const row = await this.store.transaction(async tx => {
        const current = await this.store.loadAuthorized(tx, request, id, 'upload');
        if (Number(current.size_bytes) !== bytes.length || (current.digest !== null && current.digest !== digest)) throw new FileError('UPLOAD_CONFLICT');
        if (current.phase === 'ready') return current;
        const now = await this.store.now(tx);
        if (['rejected', 'deleting', 'deleted'].includes(current.phase)
          || (current.lease_until && current.lease_until > now)) throw new FileError('UPLOAD_CONFLICT');
        await tx.query(`UPDATE file_custodies SET phase='receiving',digest=$2,operation_id=$3::uuid,
          lease_until=clock_timestamp()+interval '90 seconds' WHERE file_id=$1::uuid RETURNING file_id`, id, digest, operation);
        await tx.query(`UPDATE uploads SET status='UPLOADING',last_activity_at=clock_timestamp(),updated_at=clock_timestamp()
          WHERE file_id=$1::uuid RETURNING id`, id);
        return current;
      });
      if (row.phase === 'ready') return view(row);
      let validated = false;
      try {
        try { await this.storage.put(row.storage_key, bytes); }
        catch (error) {
          if (!(error instanceof FileError) || error.code !== 'UPLOAD_CONFLICT') throw error;
          if (digestOf(await this.storage.get(row.storage_key, bytes.length)) !== digest) throw new FileError('FILE_NOT_READY');
        }
        const mime = await inspectContent(bytes, row.extension);
        await this.store.transaction(async tx => {
          const current = await this.store.loadAuthorized(tx, request, id, 'upload');
          if (current.operation_id !== operation || current.phase !== 'receiving') throw new FileError('UPLOAD_CONFLICT');
          await tx.query(`UPDATE files SET validation_status='APPROVED',validated_at=clock_timestamp(),detected_mime_type=$2,
            scan_status='RUNNING',rejection_code=NULL,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id`, id, mime);
          await tx.query(`UPDATE file_custodies SET validated_digest=$2,phase='inspecting' WHERE file_id=$1::uuid RETURNING file_id`, id, digest);
        });
        validated = true;
        await this.scanner.scan(bytes);
        if (digestOf(await this.storage.get(row.storage_key, bytes.length)) !== digest) throw new FileError('FILE_NOT_READY');
        return await this.store.transaction(async tx => {
          const current = await this.store.loadAuthorized(tx, request, id, 'upload');
          const now = await this.store.now(tx);
          if (current.operation_id !== operation || current.phase !== 'inspecting' || !current.lease_until || current.lease_until <= now) throw new FileError('UPLOAD_CONFLICT');
          await tx.query(`UPDATE files SET scan_status='CLEAN',scanned_at=clock_timestamp(),rejection_code=NULL,
            updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id`, id);
          await tx.query(`UPDATE uploads SET status='COMPLETED',completed_at=clock_timestamp(),last_activity_at=clock_timestamp(),
            reserved_bytes=0,reservation_released_at=clock_timestamp(),updated_at=clock_timestamp() WHERE file_id=$1::uuid RETURNING id`, id);
          await tx.query(`UPDATE file_custodies SET phase='ready',scanned_digest=$2,operation_id=NULL,lease_until=NULL
            WHERE file_id=$1::uuid RETURNING file_id`, id, digest);
          return view(await this.store.load(tx, id));
        });
      } catch (error) {
        const rejected = error instanceof FileError && error.code === 'FILE_REJECTED';
        await this.failOperation(id, operation, rejected, validated);
        if (error instanceof FileError) throw error;
        throw new FileError('SERVICE_UNAVAILABLE');
      }
    });
  }
  private async failOperation(id: string, operation: string, rejected: boolean, validated: boolean): Promise<void> {
    await this.store.transaction(async tx => {
      const initial = await this.store.load(tx, id); await this.store.lockScope(tx, targetOf(initial).scope);
      const current = await this.store.load(tx, id);
      if (current.operation_id !== operation || !['receiving', 'inspecting'].includes(current.phase)) return;
      await tx.query(`UPDATE file_custodies SET phase=$2,operation_id=NULL,lease_until=NULL WHERE file_id=$1::uuid RETURNING file_id`,
        id, rejected ? 'rejected' : 'reserved');
      await tx.query(`UPDATE files SET validation_status=CASE WHEN $2 AND NOT $3 THEN 'REJECTED'::"ValidationStatus" ELSE validation_status END,
        scan_status=CASE WHEN $2 AND $3 THEN 'REJECTED'::"ScanStatus" ELSE 'ERROR'::"ScanStatus" END,
        rejection_code=$4,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id`, id, rejected, validated, rejected ? 'FILE_REJECTED' : 'PROCESSING_UNAVAILABLE');
    });
  }
  async read(request: unknown, id: string, mode: 'download' | 'preview' = 'download') {
    if (!['download', 'preview'].includes(mode)) throw new FileError('INVALID_UPLOAD');
    return this.slot(async () => {
      const row = await this.store.transaction(tx => this.store.loadAuthorized(tx, request, id, 'read'));
      requireReady(row);
      const bytes = await this.storage.get(row.storage_key, Number(row.size_bytes));
      if (bytes.length !== Number(row.size_bytes) || digestOf(bytes) !== row.digest) throw new FileError('FILE_NOT_READY');
      await this.store.transaction(async tx => {
        const current = await this.store.loadAuthorized(tx, request, id, 'read'); requireReady(current);
        if (current.digest !== row.digest) throw new FileError('FILE_NOT_READY');
      });
      const inline = mode === 'preview' && ['pdf', 'png', 'jpg', 'jpeg'].includes(row.extension);
      return { bytes, headers: {
        'Content-Type': row.detected_mime_type ?? 'application/octet-stream', 'Content-Length': String(bytes.length),
        'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="file.${row.extension}"; filename*=UTF-8''${encodeURIComponent(row.original_name).replace(/['()*]/g, value => '%' + value.charCodeAt(0).toString(16).toUpperCase())}`,
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'same-origin',
        'Content-Security-Policy': "sandbox; default-src 'none'",
      } };
    });
  }
  async cleanup(limit = 100) { return cleanIncomplete(this.store, this.storage, limit); }
  async promoteDraftPlan(request: unknown, id: string, classroomId: string): Promise<void> {
    return this.store.transaction(tx => this.promoteDraftPlanInTransaction(tx, request, id, classroomId));
  }
  async promoteDraftPlanInTransaction(tx: FileTransaction, request: unknown, id: string, classroomId: string): Promise<void> {
    return promoteDraftPlan(this.store, tx, request, id, classroomId);
  }
}
