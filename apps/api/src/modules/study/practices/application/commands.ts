import type { StudyCommandPorts } from '../../application/ports.ts';
import type { FolderRow, StudyQuery } from '../../application/contracts.ts';
import { studyFail, studyId, studyObject, studyText } from '../../../../../../../src/core/domain/study/folders.ts';
import { finalizePractice, topicEvidence, type StudyPractice, type PracticeResult, type StudyAnswers } from '../../../../../../../src/core/domain/study/engine.ts';
import { refsAvailable, conversationSources } from '../../sources/public.ts';
import { practiceView } from './projections.ts';
export async function runPracticesCommand(tx: StudyQuery, r: FolderRow, p: Record<string, unknown>, options: StudyCommandPorts): Promise<unknown> {
    const action = String(p.action), s = r.state, topics = s.fields.units.flatMap(u => u.topics);
    if (action === 'NEW_ATTEMPT') {
        const previous = s.practices.find(x => x.id === studyId(p.practiceId));
        if (!previous) studyFail('FORBIDDEN');
        if (previous.status !== 'FINALIZED') studyFail('CONFLICT');
        if (s.practices.length + s.creations.length >= 500) studyFail('QUOTA_EXCEEDED');
        const sources = await conversationSources(tx, r, options, previous.conversationId);
        if (!refsAvailable(previous, sources)) studyFail('SOURCE_UNAVAILABLE');
        const practice = {
            id: options.newId(), kind: previous.kind, title: previous.title, version: previous.version,
            previousPracticeId: previous.id, attemptNumber: Number(previous.attemptNumber ?? 1) + 1,
            status: 'ACTIVE', sourceRefs: structuredClone(previous.sourceRefs),
            privatePractice: structuredClone(previous.privatePractice), answers: {},
            ...(previous.conversationId ? { conversationId: previous.conversationId } : {})
        };
        s.practices.push(practice);
        return {practice: practiceView(practice)};
    }
    if (action === 'SAVE_ANSWERS' || action === 'FINALIZE_PRACTICE') {
        const practice = s.practices.find(x => x.id === studyId(p.practiceId));
        if (!practice)
            studyFail('FORBIDDEN');
        if (practice.status === 'FINALIZED') {
            if (action === 'SAVE_ANSWERS')
                studyFail('CONFLICT');
            return { practice: practiceView(practice) };
        }
        if (action === 'SAVE_ANSWERS') {
            const answers: StudyAnswers = {};
            if (Array.isArray(p.answers)) {
                for (const raw of p.answers) {
                    const a = studyObject(raw);
                    const id = studyText(a.questionId, 120);
                    if (Object.hasOwn(answers, id))
                        studyFail('INVALID_INPUT');
                    answers[id] = (a.text ?? a.selectedOptionIds ?? []) as string | string[];
                }
            }
            else
                Object.assign(answers, studyObject(p.answers));
            try {
                finalizePractice(practice.privatePractice as StudyPractice, answers, true);
            }
            catch {
                studyFail('INVALID_INPUT');
            }
            practice.answers = answers;
        }
        else {
            let result: PracticeResult;
            try {
                result = finalizePractice(practice.privatePractice as StudyPractice, practice.answers as StudyAnswers, p.confirmedEmpty === true);
            }
            catch (error) {
                studyFail(error instanceof Error && error.message === 'EMPTY_ANSWERS' ? 'EMPTY_ANSWERS' : 'INVALID_INPUT');
            }
            practice.result = result;
            practice.status = 'FINALIZED';
            practice.feedback = { status: 'PENDING' };
            practice.finalizedAt = new Date().toISOString();
            s.memory = { ...s.memory, topics: topicEvidence(topics, s.practices.filter(x => x.status === 'FINALIZED').map(x => x.result as PracticeResult)) };
        }
        return { practice: practiceView(practice) };
    }
    studyFail('INVALID_INPUT');
}
