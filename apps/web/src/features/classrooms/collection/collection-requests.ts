export type CollectionPart = 'rooms' | 'drafts' | 'invitations';

/** Independent request identities keep each collection current without coupling its refresh. */
export function createCollectionRequests() {
  const requests: Partial<Record<CollectionPart, symbol>> = {};
  return {
    begin(part: CollectionPart, signal?: AbortSignal) {
      const token = Symbol(part);
      requests[part] = token;
      return { current: () => !signal?.aborted && requests[part] === token };
    },
    invalidate(part: CollectionPart) { requests[part] = Symbol(part); },
  };
}
