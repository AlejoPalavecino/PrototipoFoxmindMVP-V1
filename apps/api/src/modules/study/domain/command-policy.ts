import { studyFail } from '../../../../../../src/core/domain/study/folders.ts';
import type { FolderRow } from './state.ts';
export function validateStudyCommand(r: FolderRow, p: Record<string, unknown>): void {
    const action = String(p.action);
    const fields: Record<string, string[]> = {
        IMPORT_CLASSROOM_PLAN: ['classroomId'], CONFIRM_FOLDER: [], ARCHIVE: [], REACTIVATE: [], DELETE: ['confirmed'],
        ADD_MATERIAL: ['fileId', 'title', 'topicIds'], REMOVE_MATERIAL: ['materialId'], EDIT_MATERIAL: ['materialId', 'title', 'topicIds'],
        NEW_CONVERSATION: ['title'], RENAME_CONVERSATION: ['conversationId', 'title'], CHAT: ['conversationId', 'message', 'topicIds', 'sourceIds'],
        GENERATE: ['conversationId', 'kind', 'message', 'topicIds', 'sourceIds', 'questionCount', 'difficulty'], EDIT_CREATION: ['creationId', 'title', 'body'],
        SAVE_ANSWERS: ['practiceId', 'answers'], FINALIZE_PRACTICE: ['practiceId', 'confirmedEmpty'], RETRY_FEEDBACK: ['practiceId'], NEW_ATTEMPT: ['practiceId'],
        PLAN_EXAM: ['examAt', 'timeZone', 'availability', 'minutesPerTopic', 'topicIds', 'title', 'sessionCount'],
        EDIT_EXAM: ['examId', 'sessions'], CONFIRM_AGENDA: ['examId', 'sessionIds'],
    };
    if (!Object.hasOwn(fields, action) || Object.keys(p).some(k => !['revision', 'requestId', 'action', ...fields[action]!].includes(k)))
        studyFail('INVALID_INPUT');
    if (r.status === 'DRAFT' && !['CONFIRM_FOLDER', 'IMPORT_CLASSROOM_PLAN', 'DELETE', 'ADD_MATERIAL', 'REMOVE_MATERIAL', 'EDIT_MATERIAL', 'GENERATE'].includes(action))
        studyFail('CONFLICT');
}
