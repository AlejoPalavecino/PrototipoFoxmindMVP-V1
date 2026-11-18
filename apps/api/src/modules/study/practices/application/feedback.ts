import type { StudyCommandPorts } from '../../application/ports.ts';
import type { FolderRow, StoredStudyPractice, StudyQuery, StudyFeedbackInput, StudyFeedbackResult } from '../../application/contracts.ts';
import { studyFail, studyId } from '../../../../../../../src/core/domain/study/folders.ts';
import { refsAvailable, conversationSources } from '../../sources/public.ts';
import { practiceView } from './projections.ts';
export type PreparedPracticeFeedback = {
    mode: 'feedback'; practiceId: string; input: StudyFeedbackInput; sources: StudyFeedbackInput['sources'];
    buildInput: () => StudyFeedbackInput;
};
export async function preparePracticeFeedback(tx: StudyQuery, r: FolderRow, p: Record<string, unknown>,
    options: Pick<StudyCommandPorts, 'sources' | 'files'>): Promise<PreparedPracticeFeedback> {
    const practice = r.state.practices.find(item => item.id === studyId(p.practiceId));
    if (!practice) studyFail('FORBIDDEN');
    if (practice.status !== 'FINALIZED') studyFail('CONFLICT');
    const sources = await conversationSources(tx, r, options, practice.conversationId);
    if (!refsAvailable(practice, sources)) studyFail('SOURCE_UNAVAILABLE');
    for (const source of sources) {
        source.ownerId = r.owner_id;
        source.folderId = r.id;
        source.classroomId = r.state.fields.linkedClassroomId ?? undefined;
        if (!source.text && options.files?.readSource)
            Object.assign(source, await options.files.readSource(tx, source));
    }
    const conversation = r.state.conversations.find(item => item.id === practice.conversationId);
    const buildInput = () => feedbackInput(practice, sources, conversation);
    return { mode: 'feedback', practiceId: practice.id, sources, input: buildInput(), buildInput };
}

function feedbackInput(practice: StoredStudyPractice, sources: StudyFeedbackInput['sources'],
    conversation: FolderRow['state']['conversations'][number] | undefined): StudyFeedbackInput {
    const readable = sources.filter(source => source.text.trim() || source.document);
    const history = conversation?.turns.flatMap(turn => {
        if (turn.generation || turn.generationRequestId || !['user', 'assistant'].includes(turn.role)
            || typeof turn.text !== 'string' || !turn.text.trim() || /<\/?[a-z][^>]*>/iu.test(turn.text)
            || !Array.isArray(turn.sourceRefs) || !turn.sourceRefs.length || turn.sourceRefs.length > 20
            || turn.sourceRefs.some(ref => !ref) || !refsAvailable(turn, readable)
            || (turn.attachmentIds !== undefined && (!Array.isArray(turn.attachmentIds)
                || turn.attachmentIds.some(id => !readable.some(source => source.id === id))))) return [];
        return [{ role: turn.role, text: turn.text, sourceRefs: turn.sourceRefs }];
    }).slice(-4).map(turn => ({ ...turn, text: [...turn.text].slice(0, 800).join('').trim() })).filter(turn => turn.text);
    return { practice: practice.privatePractice, answers: practice.answers, sources: readable,
        ...(history?.length ? { history } : {}) };
}
export function applyPracticeFeedback(r: FolderRow, plan: PreparedPracticeFeedback, result: StudyFeedbackResult) {
    const practice = r.state.practices.find(item => item.id === plan.practiceId);
    if (!practice) studyFail('FORBIDDEN');
    practice.feedback = result;
    return { practice: practiceView(practice) };
}
