import type { StudyCommandPorts } from '../../application/ports.ts';
import type { FolderRow, StudyQuery, StudySource, StudyGenerationIntent, StudyState } from '../../application/contracts.ts';
import { studyFail, studyId, studyObject, studyText } from '../../../../../../../src/core/domain/study/folders.ts';
import { parseStudyOutline, topicEvidence, usesStudyPracticeEvidence, type StudyInput, type StudyResult, type StudyAction, type PracticeResult, type SourceRef } from '../../../../../../../src/core/domain/study/engine.ts';
import { refsAvailable, conversationSources, selectTopics } from '../../sources/public.ts';
import { practiceView } from '../../practices/public.ts';
import { applyGeneratedReviewSessions, prepareReviewPlan } from '../../reviews/public.ts';

export type PreparedStudyGeneration = {
    mode: 'generate'; action: string; kind: StudyAction; conversationId?: string;
    linkedGeneration: boolean; generationRequestId?: string; generationIntent?: StudyGenerationIntent;
    sources: StudySource[]; attachmentIds: string[];
    reviewPlan?: ReturnType<typeof prepareReviewPlan>;
    input: StudyInput & { questionCount: number; difficulty: 'EASY' | 'MEDIUM' | 'HARD' };
};
type ContextPorts = Pick<StudyCommandPorts, 'sources' | 'files'>;
/** Reads an authorized input snapshot; never dispatches or creates a persisted resource. */
export async function prepareStudyGeneration(tx: StudyQuery, r: FolderRow, p: Record<string, unknown>, options: ContextPorts): Promise<PreparedStudyGeneration> {
    const action = String(p.action), s = r.state, topics = s.fields.units.flatMap(u => u.topics);
    const kind = action === 'CHAT' ? 'CHAT' : String(p.kind);
    if (!isStudyAction(kind))
        studyFail('INVALID_INPUT');
    const linkedGeneration = action === 'GENERATE' && p.conversationId !== undefined;
    if (linkedGeneration && !['NOTE', 'EXPLANATION', 'OUTLINE', 'QUIZ', 'EXERCISE', 'MOCK_EXAM', 'REVIEW_PLAN'].includes(kind)) studyFail('INVALID_INPUT');
    if (linkedGeneration && r.status !== 'ACTIVE') studyFail('CONFLICT');
    const selected = selectTopics(p.topicIds, topics);
    const reviewPlan = kind === 'REVIEW_PLAN' ? prepareReviewPlan(p.review, selected) : undefined;
    if (reviewPlan && r.status !== 'ACTIVE') studyFail('CONFLICT');
    if (reviewPlan && s.exams.length >= 50) studyFail('QUOTA_EXCEEDED');
    const difficulty = p.difficulty ?? s.memory.preferences?.difficulty ?? 'MEDIUM';
    const questionCount = p.questionCount ?? s.memory.preferences?.questionCount ?? 5;
    if ((difficulty !== 'EASY' && difficulty !== 'MEDIUM' && difficulty !== 'HARD') ||
        typeof questionCount !== 'number' || !Number.isInteger(questionCount) || Number(questionCount) < 1 || Number(questionCount) > 30)
        studyFail('INVALID_INPUT');
    // Validate before durable reservation or AI admission.
    if (['QUIZ', 'EXERCISE', 'MOCK_EXAM'].includes(kind) && selected.length === 0)
        studyFail('INVALID_INPUT');
    if (!reviewPlan && s.creations.length + s.practices.length >= 500)
        studyFail('QUOTA_EXCEEDED');
    const conversation = action === 'CHAT' || linkedGeneration ? s.conversations.find(c => c.id === studyId(p.conversationId)) : null;
    if ((action === 'CHAT' || linkedGeneration) && !conversation)
        studyFail('FORBIDDEN');
    const generationRequestId = linkedGeneration ? studyId(p.requestId) : undefined;
    const conversationTurns = conversation?.turns;
    if (action === 'CHAT' && conversationTurns!.length + 2 > 200) studyFail('QUOTA_EXCEEDED');
    const hasGenerationRequest = linkedGeneration && conversationTurns!.some(turn => turn.generation?.requestId === generationRequestId);
    if (linkedGeneration && conversationTurns!.length + (hasGenerationRequest ? 1 : 2) > 200) studyFail('QUOTA_EXCEEDED');
    const loadSources = () => conversationSources(tx, r, options, conversation?.id);
    let sources = await loadSources();
    if (kind === 'PLAN' && s.fields.planFileId) {
        if (!options.files)
            studyFail('FILE_NOT_READY');
        await options.files.assertOwn(tx, r.owner_id, r.id, s.fields.planFileId, 'plan');
        sources = [{kind:'PLAN',readable:true, id: s.fields.planFileId, version: s.fields.planFileId, title: 'Plan de estudio', fileId: s.fields.planFileId, text: '', origin: 'OWN', available: true }];
    }
    sources=sources.filter(source=>source.readable!==false);
    if (p.sourceIds !== undefined && kind !== 'PLAN') {
        if (!Array.isArray(p.sourceIds) || p.sourceIds.length > 20) studyFail('INVALID_INPUT');
        const selectedIds = new Set(p.sourceIds.map(studyId));
        if (selectedIds.size !== p.sourceIds.length) studyFail('INVALID_INPUT');
        if ([...selectedIds].some(id=>!sources.some(source=>source.id===id))) studyFail('SOURCE_UNAVAILABLE');
        sources = sources.filter(source=>selectedIds.has(source.id));
    }
    if(sources.length>20)studyFail('AI_INPUT_LIMIT');
    for (const source of sources) {
        source.ownerId = r.owner_id;
        source.folderId = r.id;
        if (source.origin === 'CLASSROOM')
            source.classroomId = s.fields.linkedClassroomId ?? undefined;
        if (!source.text && options.files?.readSource)
            Object.assign(source, await options.files.readSource(tx, source));
        else if (!source.text && options.files?.readText)
            source.text = await options.files.readText(tx, source);
    }
    const message = studyText(linkedGeneration ? p.message : p.message ?? `Generá ${kind.toLowerCase()} para los temas seleccionados.`, 5000);
    const attachmentIds = sources.filter(source => source.conversationId || source.fromChatCopy).map(source => source.id);
    // Requests and resource cards are operation records, not provider dialogue. In particular,
    // persisting PENDING must not change the authorized input snapshot.
    const history = (conversation?.turns ?? []).filter(turn =>
        !turn.generation && !turn.generationRequestId && refsAvailable(turn, sources) && (!Array.isArray(turn.attachmentIds) || turn.attachmentIds.every(id => sources.some(source => source.id === id)))).slice(-20);
    const generationIntent: StudyGenerationIntent | undefined = linkedGeneration && !hasGenerationRequest ? {
        requestId: generationRequestId!, kind: kind as StudyGenerationIntent['kind'],
        topicIds: selected.map(topic => topic.id), ...(p.sourceIds !== undefined ? { sourceIds: (Array.isArray(p.sourceIds) ? p.sourceIds : []).map(studyId) } : {}),
        ...(reviewPlan ? { review: reviewPlan.request } : {}),
        questionCount, difficulty,
    } : undefined;
    const input: PreparedStudyGeneration['input'] = { action: kind, message, topics: selected, sources: sources.filter(x => x.text.trim() || x.document), history: history.map(turn => {
        if (typeof turn.role !== 'string' || typeof turn.text !== 'string' || !Array.isArray(turn.sourceRefs)) throw new Error('INVALID_STUDY_INPUT');
        const sourceRefs: SourceRef[] = turn.sourceRefs.map(ref => { const value = studyObject(ref); if (typeof value.id !== 'string' || typeof value.version !== 'string') throw new Error('INVALID_STUDY_INPUT'); return { id: value.id, version: value.version }; });
        return { ...turn, role: turn.role, text: turn.text, sourceRefs };
    }), questionCount, difficulty, ...(reviewPlan ? { reviewMinutes: reviewPlan.schedule.sessions.map(session => session.minutes) } : {}) };
    if (usesStudyPracticeEvidence(kind)) {
        input.evidence = topicEvidence(selected, s.practices.filter(x => x.status === 'FINALIZED').map(x => x.result as PracticeResult));
    }
    return { mode: 'generate', action, kind, reviewPlan, conversationId: conversation?.id, linkedGeneration, generationRequestId,
        generationIntent, sources, attachmentIds, input };
}

/** This is the sole pre-provider mutation, committed together with the PENDING receipt by the folder UoW. */
export function reserveStudyGeneration(r: FolderRow, plan: PreparedStudyGeneration, options: Pick<StudyCommandPorts, 'newId'>): void {
    if (!plan.generationIntent) return;
    const conversation = r.state.conversations.find(item => item.id === plan.conversationId);
    if (!conversation) studyFail('FORBIDDEN');
    if (conversation.turns.some(turn => turn.generation?.requestId === plan.generationIntent!.requestId)) return;
    conversation.turns.push({ id: options.newId(), role: 'user', text: plan.input.message, sourceRefs: [], generation: plan.generationIntent });
}

/** Applies only the provider result; the caller owns revision/receipt CAS and persistence. */
export async function applyStudyGeneration(tx: StudyQuery, r: FolderRow, plan: PreparedStudyGeneration, generated: StudyResult,
    options: Pick<StudyCommandPorts, 'newId' | 'sources' | 'files' | 'agenda'>) {
    const { kind, action, conversationId, linkedGeneration, generationRequestId, sources, attachmentIds } = plan;
    const { message, topics: selected, difficulty, questionCount } = plan.input;
    const s = r.state, conversation = s.conversations.find(item => item.id === conversationId);
    const conversationTurns = conversation?.turns;
    const current = await conversationSources(tx, r, options, conversationId);
    if (kind === 'PLAN' && s.fields.planFileId)
        await options.files!.assertOwn(tx, r.owner_id, r.id, s.fields.planFileId, 'plan');
    else if (sources.some(old => !current.some(x => x.id === old.id && x.version === old.version)))
        studyFail('SOURCE_UNAVAILABLE');
    if (generated.status === 'INSUFFICIENT')
        return generated;
    let diagram: StudyResult['diagram'];
    if (kind === 'OUTLINE') {
        try { diagram = parseStudyOutline(generated.diagram); }
        catch { studyFail('AI_UNAVAILABLE'); }
    }
    if (plan.reviewPlan) {
        const { request, schedule } = plan.reviewPlan;
        const sessions = applyGeneratedReviewSessions(plan.reviewPlan, generated.reviewSessions, options.newId);
        const conflicts = await options.agenda?.conflicts?.(tx, r.owner_id, request.timeZone, sessions) ?? [];
        const exam = { id: options.newId(), title: generated.title, examAt: request.examAt, timeZone: request.timeZone,
            sessions, warnings: schedule.warnings, conflicts, guidance: generated.markdown };
        s.exams.push(exam);
        if (linkedGeneration) conversationTurns!.push({ id: options.newId(), role: 'assistant', generationRequestId, examId: exam.id, sourceRefs: generated.sourceRefs });
        return { exam };
    }
    if (kind === 'PLAN') {
        s.fields.units = (generated.units ?? []).map(u => ({ id: options.newId(), title: u.title, topics: u.topics.map(title => ({ id: options.newId(), title })) }));
        return { units: s.fields.units };
    }
    if (action === 'CHAT') {
        const turns = conversation!.turns;
        const references = { sourceRefs: generated.sourceRefs, ...(attachmentIds.length ? { attachmentIds } : {}) };
        turns.push({ id: options.newId(), role: 'user', text: message, ...references },
            { id: options.newId(), role: 'assistant', text: generated.markdown, ...references });
        return { conversation };
    }
    s.memory.preferences = {difficulty: difficulty as 'EASY' | 'MEDIUM' | 'HARD', questionCount: Number(questionCount), topicIds: selected.map(topic=>topic.id), lastTool: kind as NonNullable<StudyState['memory']['preferences']>['lastTool']};
    if (generated.practice && kind !== 'OUTLINE') {
        const practice = { id: options.newId(), kind, title: generated.title, version: 1, status: 'ACTIVE', sourceRefs: generated.sourceRefs, privatePractice: generated.practice, answers: {}, ...(linkedGeneration ? { conversationId: studyId(conversation!.id) } : {}) };
        s.practices.push(practice);
        if (linkedGeneration) conversationTurns!.push({ id: options.newId(), role: 'assistant', generationRequestId, practiceId: practice.id, sourceRefs: generated.sourceRefs });
        return { practice: practiceView(practice) };
    }
    const creation = { id: options.newId(), kind, title: generated.title, markdown: generated.markdown, sourceRefs: generated.sourceRefs, revision: 1,
        ...(diagram ? { diagram } : {}),
        ...(linkedGeneration ? { conversationId: studyId(conversation!.id) } : {}) };
    s.creations.push(creation);
    if (linkedGeneration) conversationTurns!.push({ id: options.newId(), role: 'assistant', generationRequestId, creationId: creation.id, sourceRefs: generated.sourceRefs });
    return { creation };
}
function isStudyAction(value: string): value is StudyAction { return ['CHAT', 'NOTE', 'EXPLANATION', 'OUTLINE', 'QUIZ', 'EXERCISE', 'MOCK_EXAM', 'PLAN', 'REVIEW_PLAN'].includes(value); }
