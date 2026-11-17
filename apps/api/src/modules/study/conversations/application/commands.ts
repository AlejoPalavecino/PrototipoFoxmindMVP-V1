import type { StudyCommandPorts } from '../../application/ports.ts';
import type { FolderRow, StudyQuery } from '../../application/contracts.ts';
import { studyFail, studyId, studyText } from '../../../../../../../src/core/domain/study/folders.ts';
export async function runConversationsCommand(tx: StudyQuery, r: FolderRow, p: Record<string, unknown>, options: StudyCommandPorts): Promise<unknown> {
    const action = String(p.action), s = r.state, topics = s.fields.units.flatMap(u => u.topics);
    if (action === 'NEW_CONVERSATION') {
        if (s.conversations.length >= 100)
            studyFail('QUOTA_EXCEEDED');
        const conversation = { id: options.newId(), title: studyText(p.title ?? 'Nueva conversación'), turns: [] };
        s.conversations.push(conversation);
        return { conversation };
    }
    if (action === 'RENAME_CONVERSATION') {
        const id = studyId(p.conversationId), title = studyText(p.title);
        const conversation = s.conversations.find(c => c.id === id);
        if (!conversation) studyFail('FORBIDDEN');
        conversation.title = title;
        return { conversation: { id, title } };
    }
    studyFail('INVALID_INPUT');
}
