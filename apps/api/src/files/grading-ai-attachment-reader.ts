import { createHash } from 'node:crypto';
import { FileError } from './errors.ts';

export interface GradingAttachmentGrant {
  ownerId: string; classroomId: string; attemptId: string; fileId: string; digest: string;
}
export interface GradingAttachmentSnapshot {
  classroomId: string; attemptId: string; fileId: string; digest: string;
  extension: string; approved: boolean; clean: boolean;
}
export interface GradingAttachmentPorts<T> {
  authorize(grant: GradingAttachmentGrant, signal: AbortSignal): Promise<void>;
  snapshot(grant: GradingAttachmentGrant, signal: AbortSignal): Promise<GradingAttachmentSnapshot>;
  readBytes(grant: GradingAttachmentGrant, signal: AbortSignal): Promise<Uint8Array>;
  parse(bytes: Uint8Array, extension: 'pdf' | 'docx', signal: AbortSignal): Promise<T>;
}

function check(signal: AbortSignal, grant: GradingAttachmentGrant, snapshot: GradingAttachmentSnapshot): 'pdf' | 'docx' {
  if (signal.aborted) throw new FileError('FORBIDDEN');
  if (!snapshot || !snapshot.approved || !snapshot.clean || snapshot.classroomId !== grant.classroomId
    || snapshot.attemptId !== grant.attemptId || snapshot.fileId !== grant.fileId || snapshot.digest !== grant.digest
    || !/^[a-f0-9]{64}$/.test(grant.digest) || (snapshot.extension !== 'pdf' && snapshot.extension !== 'docx')) {
    throw new FileError('FILE_NOT_READY');
  }
  return snapshot.extension;
}

/** Port-level guard; production adapters must bind grants to the claimed job and file custody. */
export function createGradingAiAttachmentReader<T>(ports: GradingAttachmentPorts<T>) {
  async function verify(grant: GradingAttachmentGrant, signal: AbortSignal): Promise<'pdf' | 'docx'> {
    if (signal.aborted) throw new FileError('FORBIDDEN');
    await ports.authorize(grant, signal);
    return check(signal, grant, await ports.snapshot(grant, signal));
  }
  return {
    async read(grant: GradingAttachmentGrant, signal: AbortSignal): Promise<T> {
      const extension = await verify(grant, signal);
      const bytes = await ports.readBytes(grant, signal);
      if (signal.aborted) throw new FileError('FORBIDDEN');
      if (!bytes.length || bytes.length > 20_000_000 || createHash('sha256').update(bytes).digest('hex') !== grant.digest) {
        throw new FileError('FILE_NOT_READY');
      }
      if (await verify(grant, signal) !== extension) throw new FileError('FILE_NOT_READY');
      const result = await ports.parse(bytes, extension, signal);
      if (await verify(grant, signal) !== extension) throw new FileError('FILE_NOT_READY');
      return result;
    },
  };
}
