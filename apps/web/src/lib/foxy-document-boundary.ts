const entries = new WeakMap<object, string>();
export function captureDocumentEntry(document: object, pathname: string): void {
  if (!entries.has(document)) entries.set(document, pathname);
}
export function getDocumentEntryPath(document: object): string | null { return entries.get(document) ?? null; }
export function isFoxyDocument(document: object): boolean {
  const path = getDocumentEntryPath(document); return path === '/foxy-ai' || path === '/foxy-ai/';
}
