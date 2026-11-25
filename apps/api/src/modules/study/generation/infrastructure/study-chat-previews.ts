type Entry = { markdown?: string };

/** In-process partial answers for a running study chat request; removed when it ends. */
export function createStudyChatPreviews() {
  const entries = new Map<string, Entry>();
  const key = (ownerId: string, folderId: string, requestId: string) => JSON.stringify([ownerId, folderId, requestId]);
  return {
    open(ownerId: string, folderId: string, requestId: string) {
      const id = key(ownerId, folderId, requestId), entry: Entry = {};
      entries.set(id, entry);
      return {
        publish(markdown: string | undefined) { if (entries.get(id) === entry) entry.markdown = markdown; },
        close() { if (entries.get(id) === entry) entries.delete(id); },
      };
    },
    read(ownerId: string, folderId: string, requestId: string): string | undefined {
      return entries.get(key(ownerId, folderId, requestId))?.markdown;
    },
  };
}
