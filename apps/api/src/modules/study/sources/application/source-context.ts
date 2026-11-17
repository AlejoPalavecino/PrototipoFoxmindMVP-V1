import type { StudyQuery, FolderRow } from '../../application/contracts.ts';
import type { StudyCommandPorts } from '../../application/ports.ts';
export async function conversationSources(tx: StudyQuery, row: FolderRow, options: Pick<StudyCommandPorts, 'sources' | 'files'>, conversationId?: unknown) {
    const folder = await options.sources(tx, row, options);
    const attached = typeof conversationId === 'string' && row.state.conversations.some(c => c.id === conversationId)
        ? await options.files?.chatSources?.(tx, row.owner_id, row.id, conversationId) ?? [] : [];
    return [...folder.map(source => attached.some(item => item.id === source.id) ? { ...source, fromChatCopy: true } : source),
        ...attached.filter(source => !folder.some(material => material.id === source.id))];
}
