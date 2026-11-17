import type { StudyCommandPorts } from '../../application/ports.ts';
import type { FolderRow, StudyQuery, StudyFeedbackInput, StudyFeedbackResult } from '../../application/contracts.ts';
import { studyFail, studyId } from '../../../../../../../src/core/domain/study/folders.ts';
import { refsAvailable, conversationSources } from '../../sources/public.ts';
import { practiceView } from './projections.ts';
export type PreparedPracticeFeedback = { mode: 'feedback'; practiceId: string; input: StudyFeedbackInput };
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
    return { mode: 'feedback', practiceId: practice.id, input: { practice: practice.privatePractice, answers: practice.answers,
        sources: sources.filter(source => source.text.trim() || source.document) } };
}
export function applyPracticeFeedback(r: FolderRow, plan: PreparedPracticeFeedback, result: StudyFeedbackResult) {
    const practice = r.state.practices.find(item => item.id === plan.practiceId);
    if (!practice) studyFail('FORBIDDEN');
    practice.feedback = result;
    return { practice: practiceView(practice) };
}
