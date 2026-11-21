import { renderStudyExamSetup } from './study-exam-setup.tsx';
import { renderStudyExamOverview } from './study-exam-overview.tsx';
import { renderStudyExamSessions } from './study-exam-sessions.tsx';
import { renderStudyExamSessionEditor } from './study-exam-session-editor.tsx';
import { renderStudyExamAgendaConfirmation } from './study-exam-agenda-confirmation.tsx';
import type { StudyRun as Run, StudyAction, StudyCommandData } from '../../model/study-commands.ts';
import type { StudyGenerationInput } from '../../model/study-generation.ts';
import { useEffect, useState } from 'react';
import type { StudyDetail } from '../../model/study-contracts.ts';
import { FoxmindIcon } from '../../../../../../shared-ui/FoxmindIcon';
import { Notice } from '../../../../../../shared-ui/feedback';
import { FoxyMarkdown } from '../../../../../../shared-ui/markdown';
import { studyInstant, studyLocalMinute, studyReviewAvailability, studyReviewStartDate } from '../../model/study-time';
import { studyReviewActivities } from '../../../../../../../src/core/domain/study/review.ts';

const defaultReviewTime = '17:00';
export function StudyExamPlanner({ detail, busy, run, onDirtyChange, examId, onClose, onGenerate, initialRequest }: {
  detail: StudyDetail;
  examId?: string;
  busy: boolean;
  run: Run;
  onDirtyChange: (v: boolean) => void;
  onClose?: () => void;
  onGenerate: (data: StudyGenerationInput) => void;
  initialRequest?: StudyGenerationInput;
}) {
  const previous = initialRequest?.review;
  const zone = previous?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const previousSlot = previous?.availability[0];
  const allTopics = detail.folder.units.flatMap((unit) => unit.topics);
  const [title, setTitle] = useState(initialRequest?.message ?? '');
  const [date, setDate] = useState(() => previous && Date.parse(previous.examAt) > Date.now() ? studyLocalMinute(previous.examAt, zone).slice(0, 10) : '');
  const [time, setTime] = useState(() => previousSlot ? studyLocalMinute(previousSlot.start, zone).slice(11) : defaultReviewTime);
  const [start, setStart] = useState(() => previousSlot && Date.parse(previousSlot.start) > Date.now()
    ? studyLocalMinute(previousSlot.start, zone).slice(0, 10)
    : studyReviewStartDate(new Date().toISOString(), zone, time));
  const [count, setCount] = useState(previous?.availability.length ?? 3);
  const [minutes, setMinutes] = useState(previousSlot?.minutes ?? 25);
  const [topics, setTopics] = useState(() => initialRequest?.topicIds.filter(id => allTopics.some(topic => topic.id === id)) ?? []);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false), [selection, setSelection] = useState<string[]>([]), [agendaNotice, setAgendaNotice] = useState('');
  const exam = detail.exams.find((item) => item.id === examId);
  const [sessions, setSessions] = useState<StudyDetail['exams'][number]['sessions']>([]), [editing, setEditing] = useState<StudyDetail['exams'][number]['sessions'][number]>();
  const [confirmation, setConfirmation] = useState(false), [saving, setSaving] = useState(false);
  const activities = studyReviewActivities(sessions, exam?.timeZone ?? zone);
  const scheduled = new Map(detail.scheduledReviewSessions?.map(({ sessionId, eventId }) => [sessionId, eventId]));
  const pendingSelection = selection.filter(id => !scheduled.has(id));
  useEffect(() => onDirtyChange(dirty || saving), [dirty, saving, onDirtyChange]);
  useEffect(() => {
    if (exam) {
      setSessions(exam.sessions);
      setSelection(exam.sessions.filter(session => !scheduled.has(session.id)).map(session => session.id));
      setDirty(false);

    }

  }, [exam?.id]);
  async function act<A extends StudyAction>(action: A, data: StudyCommandData[A]) {
    setError('');
    setSaving(true);
    try {
      return await run(action, data);

    }
    catch (error) {
      setError(error instanceof Error ? error.message : 'No pudimos guardar el plan.');
      throw error;

    }
    finally {
      setSaving(false);

    }

  }
  function generate() {
    if (!title.trim()) {
      setError('Contá para qué te estás preparando.');
      return;

    }
    if (!topics.length) {
      setError('Elegí al menos un tema para tu repaso.');
      return;

    }
    try {
      const availability = studyReviewAvailability({
        start,
        exam: date,
        count,
        time,
        minutes,
        zone,

      });
      onGenerate({
        kind: 'REVIEW_PLAN',
        message: title.trim(),
        topicIds: topics,
        questionCount: 5,
        difficulty: 'MEDIUM',
        review: { examAt: studyInstant(date + 'T' + time, zone), timeZone: zone, availability },
      });
      setDirty(false);

    }
    catch (error) {
      setError(error instanceof Error ? error.message : 'No pudimos preparar el plan.');

    }

  }
  async function save() {
    if (!exam)
      return;
    await act('EDIT_EXAM', {
      examId: exam.id,
      sessions

    });
    setDirty(false);

  }
  const local = (instant: string) => studyLocalMinute(instant, exam?.timeZone ?? zone), longDate = (instant: string) => new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: exam?.timeZone ?? zone,

  }).format(new Date(instant));
  const confirmAgenda = () => void (async () => {
    try {
      if (!exam)
        return;
      if (dirty)
        await save();
      await act('CONFIRM_AGENDA', {
        examId: exam.id,
        sessionIds: pendingSelection

      });
      setConfirmation(false);
      setSelection([]);
      setAgendaNotice('Tus sesiones ya están en la Agenda.');

    }
    catch {
      /* Keep the confirmation and selected sessions for retry. */
    }

  })();
  return (<div className="study-exact-planner">
    {!exam && error && <Notice error>{error}</Notice>}
    {!exam ? (renderStudyExamSetup({
      title,
      start,
      date,
      time,
      count,
      minutes,
      topics,
      allTopics,
      folderName: detail.folder.name,
      busy,
      saving,
      setTitle,
      setStart,
      setDate,
      setTime,
      setCount,
      setMinutes,
      setTopics,
      onClose,
      onDirty: () => setDirty(true),
      onGenerate: generate

    })) : (<>
      <div className="study-exact-plan-scroller">
        {error && <Notice error>{error}</Notice>}
        <p className="study-exact-subtitle">
          Una propuesta flexible. Ajustala a tu ritmo antes de agendar.
        </p>
        {renderStudyExamOverview({ exam, sessions, longDate })}
        {exam.warnings?.map((warning, index) => (<Notice key={index}>
          {({
            EXAM_IN_PAST: 'La fecha del examen ya pasó. Elegí una nueva fecha.',
            INSUFFICIENT_TIME: 'El tiempo disponible no alcanza para cubrir todos los temas.',
            OVERLAPPING_AVAILABILITY: 'Hay horarios que se superponen. Revisá las sesiones.',
            OVERLAP: 'Hay horarios que se superponen. Revisá las sesiones.',
          } as Record<string, string>)[warning] ?? warning}
        </Notice>))}
        <div className={exam.guidance ? 'study-exact-plan-content' : undefined}>
          {renderStudyExamSessions({
            exam,
            sessions,
            activities,
            selection: pendingSelection,
            scheduled,
            busy,
            saving,
            setSelection,
            setEditing,
            longDate,
            local,
            allTopics,
          })}
          {exam.guidance && <aside className="study-exact-plan-advice">
            <FoxmindIcon name="spark" />
            <h4>Un poco, con intención</h4>
            <FoxyMarkdown markdown={exam.guidance} />
          </aside>}
        </div>
        {agendaNotice && <Notice>{agendaNotice} <a href="/agenda">Abrir Agenda</a></Notice>}
      </div>
      <footer className="study-exact-dialog-footer">
        <button disabled={busy || saving} onClick={onClose}>
          Cerrar
        </button>
        <button disabled={busy || saving || !dirty} onClick={() => void save().catch(() => { })}>
          Guardar plan
        </button>
        <button className="primary" disabled={busy || saving || !pendingSelection.length} onClick={() => setConfirmation(true)}>
          <FoxmindIcon name="calendar" />
          Revisar Agenda
        </button>
      </footer>
    </>)}
    {editing && exam && (renderStudyExamSessionEditor({
      editing,
      suggestedActivity: activities.get(editing.id),
      timeZone: exam.timeZone,
      local,
      setEditing,
      setSessions,
      setDirty,
      setError

    }))}
    {confirmation && exam && (renderStudyExamAgendaConfirmation({
      sessions,
      activities,
      selection: pendingSelection,
      saving,
      busy,
      error,
      longDate,
      local,
      setConfirmation,
      onConfirm: confirmAgenda

    }))}
  </div>);

}
