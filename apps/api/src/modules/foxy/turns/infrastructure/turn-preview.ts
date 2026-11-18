import type { SqlTransaction } from '../../../../../../../src/core/contracts/sql.ts';
import type { FoxyTurnLease } from '../application/queue-contracts.ts';

type Entry = { lease: FoxyTurnLease; controller: AbortController; markdown?: string; revalidate(tx: SqlTransaction): Promise<boolean> };
function owned(entry: Entry | undefined, ownerId: string, conversationId: string): entry is Entry {
  return !!entry && entry.lease.ownerId === ownerId && entry.lease.conversationId === conversationId;
}

/** Each entry belongs to a live worker lease and is removed as soon as generation ends. */
export function createFoxyTurnPreviews() {
  const entries = new Map<string, Entry>();
  const cancelledByOwner = new WeakSet<AbortSignal>();
  return {
    wasCancelled(signal: AbortSignal) { return cancelledByOwner.has(signal); },
    open(lease: FoxyTurnLease, controller: AbortController, revalidate: Entry['revalidate']) {
      const entry: Entry = { lease, controller, revalidate };
      entries.set(lease.turnId, entry);
      return {
        publish(markdown: string | undefined): boolean {
          if (controller.signal.aborted || entries.get(lease.turnId) !== entry) return false;
          const first = !!markdown && entry.markdown === undefined;
          entry.markdown = markdown;
          return first;
        },
        close() {
          if (entries.get(lease.turnId) === entry) entries.delete(lease.turnId);
        },
      };
    },
    cancel(ownerId: string, conversationId: string, turnId: string) {
      const entry = entries.get(turnId);
      if (!owned(entry, ownerId, conversationId)) return;
      entries.delete(turnId);
      if (!entry.controller.signal.aborted) cancelledByOwner.add(entry.controller.signal);
      entry.controller.abort();
    },
    async read(tx: SqlTransaction, ownerId: string, conversationId: string, turnId: string) {
      const entry = entries.get(turnId);
      if (!owned(entry, ownerId, conversationId) || !entry.markdown || entry.controller.signal.aborted) return;
      try { if (!await entry.revalidate(tx)) return; }
      catch (error) { if ((error as { code?: unknown })?.code === 'FORBIDDEN') return; throw error; }
      if (!entry.controller.signal.aborted && entries.get(turnId) === entry) return entry.markdown;
    },
  };
}
