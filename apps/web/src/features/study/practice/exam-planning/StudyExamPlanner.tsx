import { renderStudyExamSetup } from './study-exam-setup.tsx';
import { renderStudyExamOverview } from './study-exam-overview.tsx';
import { renderStudyExamSessions } from './study-exam-sessions.tsx';
import { renderStudyExamSessionEditor } from './study-exam-session-editor.tsx';
import { renderStudyExamAgendaConfirmation } from './study-exam-agenda-confirmation.tsx';
import type { StudyRun as Run, StudyAction, StudyCommandData } from '../../model/study-commands.ts';
import { useEffect, useState } from 'react';
import type { StudyDetail } from '../../model/study-contracts.ts';
import { FoxmindIcon } from '../../../../../../shared-ui/FoxmindIcon';
import { Notice } from '../../../../../../shared-ui/feedback';
import { studyInstant, studyLocalMinute, studyReviewAvailability } from '../../model/study-time';
export function StudyExamPlanner({ detail, busy, run, onDirtyChange, examId, onClose, onPrepared, }: {
  detail: StudyDetail;
  examId?: string;
  busy: boolean;
  run: Run;
  onDirtyChange: (v: boolean) => void;
  onClose?: () => void;
  onPrepared?: (id: string) => void;
}) {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [title, setTitle] = useState(''), [start, setStart] = useState(new Date().toLocaleDateString('en-CA')), [date, setDate] = useState(''), [time, setTime] = useState('17:00');
  const [count, setCount] = useState(3), [minutes, setMinutes] = useState(25), [topics, setTopics] = useState<string[]>([]), [error, setError] = useState('');
  const [createdId, setCreatedId] = useState(''), [dirty, setDirty] = useState(false), [selection, setSelection] = useState<string[]>([]), [agendaNotice, setAgendaNotice] = useState('');
  const exam = detail.exams.find((item) => item.id === (examId ?? createdId));
  const [sessions, setSessions] = useState<StudyDetail['exams'][number]['sessions']>([]), [editing, setEditing] = useState<StudyDetail['exams'][number]['sessions'][number]>();
  const [confirmation, setConfirmation] = useState(false), [saving, setSaving] = useState(false);
  const allTopics = detail.folder.units.flatMap((unit) => unit.topics);
  useEffect(() => onDirtyChange(dirty || saving), [dirty, saving, onDirtyChange]);
  useEffect(() => {
    if (exam) {
      setSessions(exam.sessions);
      setSelection(exam.sessions.map((session) => session.id));
      setDirty(false);

    }

  }, [exam?.id]);
  async function act<A extends StudyAction>(action: A, data: StudyCommandData[A]) {
    setError('');
    setSaving(true);
    try {
      return (await run(action, data)) as {
        result?: {
          exam?: {
            id?: string;
          };
        };
      };

    }
    catch (error) {
      setError(error instanceof Error ? error.message : 'No pudimos guardar el plan.');
      throw error;

    }
    finally {
      setSaving(false);

    }

  }
  async function generate() {
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
      const result = await act('PLAN_EXAM', {
        title: title.trim(),
        examAt: studyInstant(date + 'T' + time, zone),
        timeZone: zone,
        topicIds: topics,
        availability,
        sessionCount: count,
        minutesPerTopic: minutes,

      });
      if (result?.result?.exam?.id) {
        setCreatedId(result.result.exam.id);
        onPrepared?.(result.result.exam.id);

      }
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
        sessionIds: selection

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
    {error && <Notice error>{error}</Notice>}
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
      onGenerate: () => void generate()

    })) : (<>
      <p className="study-exact-subtitle">
        Una propuesta flexible. Ajustala a tu ritmo antes de agendar.
      </p>
      {renderStudyExamOverview({
        exam,
        sessions,
        longDate

      })}
      {exam.warnings?.map((warning, index) => (<Notice key={index}>
        {({
          EXAM_IN_PAST: 'La fecha del examen ya pasó. Elegí una nueva fecha.',
          INSUFFICIENT_TIME: 'El tiempo disponible no alcanza para cubrir todos los temas.',
          OVERLAPPING_AVAILABILITY: 'Hay horarios que se superponen. Revisá las sesiones.',
          OVERLAP: 'Hay horarios que se superponen. Revisá las sesiones.',

        } as Record<string, string>)[warning] ?? warning}
      </Notice>))}
      {renderStudyExamSessions({
        exam,
        sessions,
        selection,
        busy,
        saving,
        setSelection,
        setEditing,
        longDate,
        local,
        allTopics

      })}
      {agendaNotice && <Notice>{agendaNotice}</Notice>}
      <footer className="study-exact-dialog-footer">
        <button disabled={busy || saving} onClick={onClose}>
          Cerrar
        </button>
        <button disabled={busy || saving || !dirty} onClick={() => void save().catch(() => { })}>
          Guardar plan
        </button>
        <button className="primary" disabled={busy || saving || !selection.length} onClick={() => setConfirmation(true)}>
          <FoxmindIcon name="calendar" />
          Revisar Agenda
        </button>
      </footer>
    </>)}
    {editing && exam && (renderStudyExamSessionEditor({
      editing,
      timeZone: exam.timeZone,
      local,
      setEditing,
      setSessions,
      setDirty,
      setError

    }))}
    {confirmation && exam && (renderStudyExamAgendaConfirmation({
      sessions,
      selection,
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
