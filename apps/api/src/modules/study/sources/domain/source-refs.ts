export function refsAvailable(item: Record<string, unknown>, sources: { id: string; version: string }[]) { return !Array.isArray(item.sourceRefs) || item.sourceRefs.every(r => { const ref = r as {
    id: string;
    version: string;
}; return sources.some(s => s.id === ref.id && s.version === ref.version); }); }
