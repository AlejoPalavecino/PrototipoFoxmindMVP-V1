import { studyFail, studyId, studyText } from '../../../../../../../src/core/domain/study/folders.ts';
import type { FolderRow, StudyQuery, StudyImageRaster } from '../../application/contracts.ts';
import type { StudyCommandPorts } from '../../application/ports.ts';

export type PreparedStudyImage = {
    mode: 'image';
    conversationId: string;
    requestId: string;
    input: { message: string };
};

export function prepareStudyImage(row: FolderRow, command: Record<string, unknown>): PreparedStudyImage {
    if (row.status !== 'ACTIVE') studyFail('CONFLICT');
    if (command.sourceIds !== undefined || (command.topicIds !== undefined &&
        (!Array.isArray(command.topicIds) || command.topicIds.length !== 0))) studyFail('INVALID_INPUT');
    const conversationId = studyId(command.conversationId), requestId = studyId(command.requestId);
    const conversation = row.state.conversations.find(item => item.id === conversationId);
    if (!conversation) studyFail('FORBIDDEN');
    const existing = conversation.turns.some(turn => turn.generation?.requestId === requestId);
    if (conversation.turns.length + (existing ? 1 : 2) > 200
        || row.state.creations.length + row.state.practices.length >= 500) studyFail('QUOTA_EXCEEDED');
    return { mode: 'image', conversationId, requestId, input: { message: studyText(command.message, 1500) } };
}

export function reserveStudyImage(row: FolderRow, plan: PreparedStudyImage, ports: Pick<StudyCommandPorts, 'newId'>) {
    const conversation = row.state.conversations.find(item => item.id === plan.conversationId)!;
    conversation.turns.push({ id: ports.newId(), role: 'user', text: plan.input.message, sourceRefs: [],
        generation: { requestId: plan.requestId, kind: 'IMAGE', topicIds: [], questionCount: 5, difficulty: 'MEDIUM' } });
}

export async function applyStudyImage(tx: StudyQuery, row: FolderRow, plan: PreparedStudyImage, raster: StudyImageRaster,
    ports: Pick<StudyCommandPorts, 'newId' | 'images'>) {
    if (!ports.images) studyFail('AI_UNAVAILABLE');
    const conversation = row.state.conversations.find(item => item.id === plan.conversationId)!;
    const brief = plan.input.message.replace(/\s+/gu, ' ');
    const title = [...brief].length > 80 ? `${[...brief].slice(0, 79).join('')}…` : brief;
    const creation = { id: ports.newId(), kind: 'IMAGE', title, markdown: '', sourceRefs: [],
        revision: 1, conversationId: conversation.id };
    await ports.images.store(tx, row.owner_id, row.id, creation.id, raster);
    row.state.creations.push(creation);
    conversation.turns.push({ id: ports.newId(), role: 'assistant', generationRequestId: plan.requestId, creationId: creation.id, sourceRefs: [] });
    return { creation };
}
