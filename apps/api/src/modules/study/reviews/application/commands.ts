import type { StudyCommandPorts } from '../../application/ports.ts';
import type { FolderRow, StudyQuery } from '../../application/contracts.ts';
import { studyFail, studyId, studyObject, studyText } from '../../../../../../../src/core/domain/study/folders.ts';
import { planExam } from '../../../../../../../src/core/domain/study/engine.ts';
import { selectTopics } from '../../sources/public.ts';
export async function runReviewsCommand(tx: StudyQuery, r: FolderRow, p: Record<string, unknown>, options: StudyCommandPorts): Promise<unknown> {
    const action = String(p.action), s = r.state, topics = s.fields.units.flatMap(u => u.topics);
    if (action === 'PLAN_EXAM') {
        if (s.exams.length >= 50)
            studyFail('QUOTA_EXCEEDED');
        const selected = selectTopics(p.topicIds, topics);
        let result: ReturnType<typeof planExam>;
        try { result = planExam({ examAt: studyText(p.examAt, 100), timeZone: studyText(p.timeZone, 100), now: new Date().toISOString(), topics: selected, availability: p.availability as {
                start: string;
                minutes: number;
            }[], minutesPerTopic: Number(p.minutesPerTopic), sessionCount: p.sessionCount as number | undefined }); }
        catch (error) { if (p.sessionCount !== undefined) studyFail('INVALID_INPUT'); throw error; }
        const sessions = result.sessions.map(x => ({ ...x, id: options.newId(), reminderMinutes: null }));
        const conflicts = await options.agenda?.conflicts?.(tx,r.owner_id,String(p.timeZone),sessions) ?? [];
        const exam = { id:options.newId(),title:studyText(p.title??'Preparar examen'),examAt:studyText(p.examAt,100),timeZone:studyText(p.timeZone,100),...result,sessions,conflicts };
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
                studyFail('INVALID_INPUT'); if (reminder !== null && typeof reminder !== 'number') studyFail('INVALID_INPUT'); return { id, title: studyText(v.title ?? 'Repaso'), topicIds: v.topicIds.map(id => studyText(id,120)), startAt: start, endAt: new Date(Date.parse(start) + minutes * 60000).toISOString(), minutes, timeZone: exam.timeZone, reminderMinutes: reminder }; });
            const sessions = exam.sessions as {
                id: string;
                startAt: string;
                endAt: string;
            }[];
            if (new Set(sessions.map(x => x.id)).size !== sessions.length)
                studyFail('INVALID_INPUT');
            const ordered = [...sessions].sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
            exam.conflicts = await options.agenda?.conflicts?.(tx,r.owner_id,String(exam.timeZone),sessions) ?? [];
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
    studyFail('INVALID_INPUT');
}
