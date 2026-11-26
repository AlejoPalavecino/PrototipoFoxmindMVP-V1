/**
 * Bounds concurrent byte transfers (uploads and downloads that buffer a whole file): a ceiling for
 * the process, which bounds memory, and a share per account, so one account cannot hold every slot.
 * `acquire` returns a release function, or `undefined` when the caller must answer 503.
 */
export interface TransferGate {
  acquire(owner: string): (() => void) | undefined;
}

export const TRANSFER_LIMITS = Object.freeze({ total: 8, perOwner: 2 });
/** A body that sends nothing for this long is cut, so a deliberately slow sender frees its slot. */
export const TRANSFER_IDLE_MS = 5000;

export function createTransferGate(limits: { total: number; perOwner: number } = TRANSFER_LIMITS): TransferGate {
  if (![limits.total, limits.perOwner].every(value => Number.isSafeInteger(value) && value > 0) || limits.perOwner > limits.total) {
    throw new Error('Invalid transfer limits.');
  }
  let active = 0;
  const owners = new Map<string, number>();
  return {
    acquire(owner) {
      const held = owners.get(owner) ?? 0;
      if (active >= limits.total || held >= limits.perOwner) return undefined;
      active++; owners.set(owner, held + 1);
      let released = false;
      return () => {
        if (released) return;
        released = true; active--;
        const remaining = (owners.get(owner) ?? 1) - 1;
        if (remaining) owners.set(owner, remaining); else owners.delete(owner);
      };
    },
  };
}
