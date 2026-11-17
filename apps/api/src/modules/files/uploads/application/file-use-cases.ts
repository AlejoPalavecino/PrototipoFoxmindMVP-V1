import { FileError } from '../../domain/errors.ts';
import { validateUploadIntent, type UploadIntent } from '../../domain/policy.ts';
import { uuid } from '../../domain/file-record.ts';
import { view } from '../../domain/file-view.ts';
import type { FileScope, FileTransaction } from '../../custody/public.ts';
import type { FileCustodyPort } from '../../custody/public.ts';

/** Admission and authorized projections; infrastructure supplies transactional custody and byte processing. */
export abstract class FileUseCases<TStore extends FileCustodyPort = FileCustodyPort> {
  constructor(readonly store: TStore) {}
  abstract beginInTransaction(tx: FileTransaction, request: unknown, scope: FileScope, intent: UploadIntent, targetId?: string | null): Promise<ReturnType<typeof view>>;
  async begin(request: unknown, scope: FileScope, intent: UploadIntent, targetId: string | null = null) {
    validateUploadIntent(intent);
    const snapshot = { purpose: intent.purpose, name: intent.name, bytes: intent.bytes }, scopeSnapshot = { ...scope };
    if ((targetId !== null && !uuid(targetId)) || (['instructions', 'attachment'].includes(snapshot.purpose) && !targetId)) {
      throw new FileError('INVALID_UPLOAD');
    }
    return this.store.transaction(tx => this.beginInTransaction(tx, request, scopeSnapshot, snapshot, targetId));
  }
  async authorizeReceive(request: unknown, id: string): Promise<{ expectedBytes: number }> {
    return this.store.transaction(async tx => {
      const current = await this.store.loadAuthorized(tx, request, id, 'upload');
      return { expectedBytes: Number(current.size_bytes) };
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
}
