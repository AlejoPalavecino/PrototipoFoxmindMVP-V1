import { FileError } from './errors.ts';
import { assertFileUsable } from './policy.ts';
import type { FileSafety } from './policy.ts';

export interface ReadinessSnapshot {
  phase: string;
  upload_status: FileSafety['upload'];
  validation_status: FileSafety['validation'];
  scan_status: FileSafety['scan'];
  digest: string | null;
  validated_digest: string | null;
  scanned_digest: string | null;
}

export function requireReady(row: ReadinessSnapshot): void {
  if (row.phase !== 'ready') throw new FileError('FILE_NOT_READY');
  try { assertFileUsable({ upload: row.upload_status, validation: row.validation_status, scan: row.scan_status,
    objectDigest: row.digest ?? '', validatedDigest: row.validated_digest, scannedDigest: row.scanned_digest }); }
  catch { throw new FileError('FILE_NOT_READY'); }
}
