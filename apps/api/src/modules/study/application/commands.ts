import type { StudyCommandPorts } from './ports.ts';
import { studyFail, studyId, studyObject, studyText, validateFolder } from '../../../../../../src/core/domain/study/folders.ts';
import { publicPractice, finalizePractice, topicEvidence, planExam, type StudyPractice, type PracticeResult, type StudyAnswers, type StudyResult } from '../../../../../../src/core/domain/study/engine.ts';
import type { FolderRow, StudyState, StudyQuery, StudySource } from './contracts.ts';
function refsAvailable(item: Record<string, unknown>, sources: StudySource[]) { return !Array.isArray(item.sourceRefs) || item.sourceRefs.every(r => { const ref = r as {
    id: string;
    version: string;
}; return sources.some(s => s.id === ref.id && s.version === ref.version); }); }
function practiceView(p: Record<string, unknown>) { const { privatePractice, ...safe } = p; return { ...safe, ...publicPractice(privatePractice as StudyPractice, p.status === 'FINALIZED') }; }
export function publicState(state: StudyState, sources: StudySource[]) { return { conversations: state.conversations.map(c => ({ ...c, turns: (c.turns as Record<string, unknown>[]).map(t => ({ ...t, sourceUnavailable: !refsAvailable(t, sources) })) })), creations: state.creations.map(c => ({ ...c, sourceUnavailable: !refsAvailable(c, sources) })), practices: state.practices.map(practiceView), exams: state.exams, memory: state.memory }; }
export async function runCommand(tx: StudyQuery, r: FolderRow, p: Record<string, unknown>, options: StudyCommandPorts): Promise<unknown> {
    const action = String(p.action), s = r.state, topics = s.fields.units.flatMap(u => u.topics);
    const fields: Record<string, string[]> = { CONFIRM_FOLDER: [], ARCHIVE: [], REACTIVATE: [], DELETE: ['confirmed'], ADD_MATERIAL: ['fileId', 'title', 'topicIds'], REMOVE_MATERIAL: ['materialId'], EDIT_MATERIAL: ['materialId','title','topicIds'], NEW_CONVERSATION: ['title'], CHAT: ['conversationId', 'message', 'topicIds'], GENERATE: ['kind', 'message', 'topicIds', 'questionCount', 'difficulty'], EDIT_CREATION: ['creationId', 'title', 'body'], SAVE_ANSWERS: ['practiceId', 'answers'], FINALIZE_PRACTICE: ['practiceId', 'confirmedEmpty'], RETRY_FEEDBACK: ['practiceId'], NEW_ATTEMPT: ['practiceId'], PLAN_EXAM: ['examAt', 'timeZone', 'availability', 'minutesPerTopic', 'topicIds', 'title'], EDIT_EXAM: ['examId', 'sessions'], CONFIRM_AGENDA: ['examId', 'sessionIds'] };
    if (!Object.hasOwn(fields, action) || Object.keys(p).some(k => !['revision', 'requestId', 'action', ...fields[action]!].includes(k)))
        studyFail('INVALID_INPUT');
    if (r.status === 'DRAFT' && !['CONFIRM_FOLDER', 'DELETE', 'ADD_MATERIAL', 'REMOVE_MATERIAL', 'EDIT_MATERIAL', 'GENERATE'].includes(action))
        studyFail('CONFLICT');
    if (action === 'CONFIRM_FOLDER') {
        s.fields = validateFolder(s.fields, true);
        if (!options.files) studyFail('FILE_NOT_READY');
        await options.files.assertOwn(tx, r.owner_id, r.id, s.fields.planFileId!, 'plan');
        r.status = 'ACTIVE';
        return {};
    }
    if (action === 'ARCHIVE' || action === 'DELETE' || action === 'REACTIVATE') {
        if (action === 'DELETE' && p.confirmed !== true)
            studyFail('INVALID_INPUT');
        r.status = action === 'DELETE' ? 'DELETED' : action === 'ARCHIVE' ? 'ARCHIVED' : 'ACTIVE';
        if (r.status === 'ACTIVE') {
            s.fields = validateFolder(s.fields, true);
            if (!options.files) studyFail('FILE_NOT_READY');
            await options.files.assertOwn(tx, r.owner_id, r.id, s.fields.planFileId!, 'plan');
        } else
            await options.agenda?.cancel(tx, r.owner_id, r.id);
        return {};
    }
    if (action === 'ADD_MATERIAL') {
        if (s.materials.length >= 100)
            studyFail('QUOTA_EXCEEDED');
        const fileId = studyId(p.fileId);
        if (!options.files)
            studyFail('FILE_NOT_READY');
        await options.files.assertOwn(tx, r.owner_id, r.id, fileId, 'material');
        if (s.materials.some(m => m.fileId === fileId))
            studyFail('CONFLICT');
        const topicIds = selectTopics(p.topicIds, topics).map(t => t.id);
        const material = { id: options.newId(), fileId, title: studyText(p.title), topicIds };
        s.materials.push(material);
        return { material };
    }
    if(action==='EDIT_MATERIAL'){const material=s.materials.find(m=>m.id===studyId(p.materialId));if(!material)studyFail('FORBIDDEN');material.title=studyText(p.title);material.topicIds=selectTopics(p.topicIds,topics).map(t=>t.id);return {material};}
    if (action === 'REMOVE_MATERIAL') {
        const id = studyId(p.materialId);
        if (!s.materials.some(m => m.id === id))
            studyFail('FORBIDDEN');
        s.materials = s.materials.filter(m => m.id !== id);
        return {};
    }
    if (action === 'NEW_CONVERSATION') {
        if (s.conversations.length >= 100)
            studyFail('QUOTA_EXCEEDED');
        const conversation = { id: options.newId(), title: studyText(p.title ?? 'Nueva conversación'), turns: [] };
        s.conversations.push(conversation);
        return { conversation };
    }
    if (action === 'EDIT_CREATION') {
        const c = s.creations.find(c => c.id === studyId(p.creationId));
        if (!c)
            studyFail('FORBIDDEN');
        c.title = studyText(p.title);
        c.markdown = studyText(p.body, 80000);
        c.revision = Number(c.revision ?? 1) + 1;
        return { creation: c };
    }
    if (action === 'NEW_ATTEMPT') {
        const previous = s.practices.find(x => x.id === studyId(p.practiceId));
        if (!previous) studyFail('FORBIDDEN');
        if (previous.status !== 'FINALIZED') studyFail('CONFLICT');
        if (s.practices.length + s.creations.length >= 500) studyFail('QUOTA_EXCEEDED');
        const sources = await options.sources(tx, r, options);
        if (!refsAvailable(previous, sources)) studyFail('SOURCE_UNAVAILABLE');
        const practice = {
            id: options.newId(), kind: previous.kind, title: previous.title, version: previous.version,
            previousPracticeId: previous.id, attemptNumber: Number(previous.attemptNumber ?? 1) + 1,
            status: 'ACTIVE', sourceRefs: structuredClone(previous.sourceRefs),
            privatePractice: structuredClone(previous.privatePractice), answers: {}
        };
        s.practices.push(practice);
        return {practice: practiceView(practice)};
    }
    if (action === 'SAVE_ANSWERS' || action === 'FINALIZE_PRACTICE' || action === 'RETRY_FEEDBACK') {
        const practice = s.practices.find(x => x.id === studyId(p.practiceId));
        if (!practice)
            studyFail('FORBIDDEN');
        if (action === 'RETRY_FEEDBACK') {
            if (practice.status !== 'FINALIZED' || !options.feedback)
                studyFail('CONFLICT');
            const sources = await options.sources(tx, r, options);
            for (const source of sources) {
                source.ownerId = r.owner_id;
                source.folderId = r.id;
                source.classroomId = s.fields.linkedClassroomId ?? undefined;
                if (!source.text && options.files?.readSource)
                    Object.assign(source, await options.files.readSource(tx, source));
            }
            practice.feedback = await options.feedback({ practice: practice.privatePractice, answers: practice.answers, sources: sources.filter(x => x.text.trim() || x.document) });
            return { practice: practiceView(practice) };
        }
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
    if (action === 'PLAN_EXAM') {
        if (s.exams.length >= 50)
            studyFail('QUOTA_EXCEEDED');
        const selected = selectTopics(p.topicIds, topics);
        const result = planExam({ examAt: studyText(p.examAt, 100), timeZone: studyText(p.timeZone, 100), now: new Date().toISOString(), topics: selected, availability: p.availability as {
                start: string;
                minutes: number;
            }[], minutesPerTopic: Number(p.minutesPerTopic) });
        const exam = { id: options.newId(), title: studyText(p.title ?? 'Preparar examen'), examAt: p.examAt, timeZone: p.timeZone, ...result, sessions: result.sessions.map(x => ({ ...x, id: options.newId(), reminderMinutes: null })) };
        s.exams.push(exam);
        return { exam };
    }
    if (action === 'EDIT_EXAM' || action === 'CONFIRM_AGENDA') {
        const exam = s.exams.find(x => x.id === studyId(p.examId));
        if (!exam)
            studyFail('FORBIDDEN');
        if (action === 'EDIT_EXAM') {
            if (!Array.isArray(p.sessions) || p.sessions.length > 200)
                studyFail('INVALID_INPUT');
            exam.sessions = p.sessions.map(raw => { const v = studyObject(raw); const id = studyId(v.id), start = studyText(v.startAt ?? v.start, 100), minutes = Number(v.minutes), reminder = v.reminderMinutes ?? null; if (!Array.isArray(v.topicIds) || !v.topicIds.length || v.topicIds.some(id => !topics.some(t => t.id === id)) || !Number.isInteger(minutes) || minutes < 1 || minutes > 1440 || !Number.isFinite(Date.parse(start)) || !/(?:Z|[+-]\d{2}:\d{2})$/iu.test(start) || Date.parse(start) <= Date.now() || s.exams.some(other => other.id !== exam.id && (other.sessions as {
                id: string;
            }[]).some(x => x.id === id)) || Date.parse(start) + minutes * 60000 > Date.parse(String(exam.examAt)) || ![null, 0, 15, 60, 1440].includes(reminder as number | null))
                studyFail('INVALID_INPUT'); return { id, title: studyText(v.title ?? 'Repaso'), topicIds: v.topicIds, startAt: start, endAt: new Date(Date.parse(start) + minutes * 60000).toISOString(), minutes, timeZone: exam.timeZone, reminderMinutes: reminder }; });
            const sessions = exam.sessions as {
                id: string;
                startAt: string;
                endAt: string;
            }[];
            if (new Set(sessions.map(x => x.id)).size !== sessions.length)
                studyFail('INVALID_INPUT');
            const ordered = [...sessions].sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
            exam.warnings = ordered.some((x, i) => i > 0 && Date.parse(x.startAt) < Date.parse(ordered[i - 1]!.endAt)) ? ['OVERLAPPING_AVAILABILITY'] : [];
            return { exam };
        }
        if (!options.agenda)
            studyFail('SERVICE_UNAVAILABLE');
        if (!Array.isArray(p.sessionIds) || p.sessionIds.some(id => typeof id !== 'string'))
            studyFail('INVALID_INPUT');
        const ids = new Set(p.sessionIds), sessions = (exam.sessions as {
            id: string;
        }[]).filter(x => ids.has(x.id));
        if (!sessions.length || sessions.length !== ids.size)
            studyFail('INVALID_INPUT');
        return options.agenda.confirm(tx, r.owner_id, r.id, exam, sessions, String(p.requestId));
    }
    const kind = action === 'CHAT' ? 'CHAT' : String(p.kind);
    if (!['CHAT', 'NOTE', 'OUTLINE', 'QUIZ', 'EXERCISE', 'MOCK_EXAM', 'PLAN'].includes(kind))
        studyFail('INVALID_INPUT');
    const selected = selectTopics(p.topicIds, topics);
    const difficulty = p.difficulty ?? s.memory.preferences?.difficulty ?? 'MEDIUM';
    const questionCount = p.questionCount ?? s.memory.preferences?.questionCount ?? 5;
    if (typeof difficulty !== 'string' || !['EASY', 'MEDIUM', 'HARD'].includes(difficulty) ||
        !Number.isInteger(questionCount) || Number(questionCount) < 1 || Number(questionCount) > 30)
        studyFail('INVALID_INPUT');
    // Validate before the preparation callback reserves a request or spends AI budget.
    if (['QUIZ', 'EXERCISE', 'MOCK_EXAM'].includes(kind) && selected.length === 0)
        studyFail('INVALID_INPUT');
    if (!options.generate)
        studyFail('AI_UNAVAILABLE');
    if (s.creations.length + s.practices.length >= 500)
        studyFail('QUOTA_EXCEEDED');
    const conversation = action === 'CHAT' ? s.conversations.find(c => c.id === studyId(p.conversationId)) : null;
    if (action === 'CHAT' && !conversation)
        studyFail('FORBIDDEN');
    let sources = await options.sources(tx, r, options);
    if (kind === 'PLAN' && s.fields.planFileId) {
        if (!options.files)
            studyFail('FILE_NOT_READY');
        await options.files.assertOwn(tx, r.owner_id, r.id, s.fields.planFileId, 'plan');
        sources = [{kind:'PLAN',readable:true, id: s.fields.planFileId, version: s.fields.planFileId, title: 'Plan de estudio', fileId: s.fields.planFileId, text: '', origin: 'OWN', available: true }];
    }
    sources=sources.filter(source=>source.readable!==false);
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
    const message = studyText(p.message ?? `Generá ${kind.toLowerCase()} para los temas seleccionados.`, 5000);
    const generated = await options.generate({ action: kind, message, topics: selected, sources: sources.filter(x => x.text.trim() || x.document), history: ((conversation?.turns ?? []) as unknown[]).slice(-20), evidence: topicEvidence(selected, s.practices.filter(x => x.status === 'FINALIZED').map(x => x.result as PracticeResult)), questionCount, difficulty }) as StudyResult;
    const current = await options.sources(tx, r, options);
    if (kind === 'PLAN' && s.fields.planFileId)
        await options.files!.assertOwn(tx, r.owner_id, r.id, s.fields.planFileId, 'plan');
    else if (sources.some(old => !current.some(x => x.id === old.id && x.version === old.version)))
        studyFail('SOURCE_UNAVAILABLE');
    if (generated.status === 'INSUFFICIENT')
        return generated;
    if (kind === 'PLAN') {
        s.fields.units = (generated.units ?? []).map(u => ({ id: options.newId(), title: u.title, topics: u.topics.map(title => ({ id: options.newId(), title })) }));
        return { units: s.fields.units };
    }
    if (action === 'CHAT') {
        const turns = conversation!.turns as unknown[];
        if (turns.length >= 200)
            studyFail('QUOTA_EXCEEDED');
        turns.push({ id: options.newId(), role: 'user', text: message, sourceRefs: generated.sourceRefs }, { id: options.newId(), role: 'assistant', text: generated.markdown, sourceRefs: generated.sourceRefs });
        return { conversation };
    }
    s.memory.preferences = {difficulty: difficulty as 'EASY' | 'MEDIUM' | 'HARD', questionCount: Number(questionCount), topicIds: selected.map(topic=>topic.id), lastTool: kind as NonNullable<StudyState['memory']['preferences']>['lastTool']};
    if (generated.practice) {
        const practice = { id: options.newId(), kind, title: generated.title, version: 1, status: 'ACTIVE', sourceRefs: generated.sourceRefs, privatePractice: generated.practice, answers: {} };
        s.practices.push(practice);
        return { practice: practiceView(practice) };
    }
    const creation = { id: options.newId(), kind, title: generated.title, markdown: generated.markdown, sourceRefs: generated.sourceRefs, revision: 1 };
    s.creations.push(creation);
    return { creation };
}
function selectTopics(value: unknown, topics: {
    id: string;
    title: string;
}[]) { if (value === undefined)
    return topics; if (!Array.isArray(value) || value.length > 100 || value.some(id => !topics.some(t => t.id === id)) || new Set(value).size !== value.length)
    studyFail('INVALID_INPUT'); return topics.filter(t => value.includes(t.id)); }




