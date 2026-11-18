import type { StudyRun as Run } from '../../model/study-commands.ts';
import { useEffect, useRef, useState } from 'react';
import type { StudyPractice } from '../../model/study-contracts.ts';
import { FoxmindIcon } from '../../../../../../shared-ui/FoxmindIcon';
import { Notice } from '../../../../../../shared-ui/feedback';
import { StudyConfirmation } from '../../ui/study-confirmation';
import { renderStudyPracticeQuestion } from './study-practice-question.tsx';
import { renderStudyPracticeProgress } from './study-practice-progress.tsx';
import { renderStudyPracticeReview } from './study-practice-review.tsx';
import { renderStudyPracticeFeedback } from './study-practice-feedback.tsx';
import { renderStudyPracticeFooter } from './study-practice-footer.tsx';
import { clearChatTiming, commitChatTiming, startChatTiming, trackChatTiming } from '../../../../shared/chat-timing.ts';
export function StudyPracticeView({ practice, busy, run, onDirtyChange, onNewAttempt, onClose, folderName, }: {
  practice: StudyPractice;
  busy: boolean;
  run: Run;
  onDirtyChange: (v: boolean) => void;
  onNewAttempt: () => Promise<void>;
  onClose?: () => void;
  folderName?: string;
}) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>(practice.answers ?? {});
  const [index, setIndex] = useState(0), [review, setReview] = useState(false), [confirmation, setConfirmation] = useState(false);
  const [state, setState] = useState('Tus respuestas se guardan en esta carpeta'), [error, setError] = useState('');
  const [feedbackError, setFeedbackError] = useState('');
  const changed = useRef(false), saving = useRef(false), timer = useRef<ReturnType<typeof setTimeout> | null>(null), heading = useRef<HTMLElement>(null);
  const finished = practice.status === 'FINALIZED', answersRef = useRef(answers);
  answersRef.current = answers;
  const answered = (id: string) => Array.isArray(answers[id])
    ? answers[id].length > 0
    : typeof answers[id] === 'string' && !!answers[id].trim();
  const hasDevelopmentAnswers = practice.questions.some((question) => question.type === 'DEVELOPMENT' && answered(question.id));
  const feedbackComplete = !!practice.feedback &&
    typeof practice.feedback === 'object' &&
    'status' in practice.feedback &&
    practice.feedback.status === 'COMPLETE';
  useEffect(() => {
    if (finished && hasDevelopmentAnswers && feedbackComplete) {
      commitChatTiming('study.feedback', practice.id, 'first_text');
      commitChatTiming('study.feedback', practice.id, 'final');
    }
  }, [finished, hasDevelopmentAnswers, feedbackComplete, practice.id]);
  useEffect(() => () => clearChatTiming('study.feedback', practice.id), [practice.id]);
  const empty = practice.questions.filter((question) => !answered(question.id)).length, question = practice.questions[index];
  useEffect(() => {
    heading.current?.focus();

  }, [index, review, finished]);
  useEffect(() => () => {
    if (timer.current)
      clearTimeout(timer.current);

  }, []);
  useEffect(() => {
    const before = (event: BeforeUnloadEvent) => {
      if (changed.current)
        event.preventDefault();

    };
    window.addEventListener('beforeunload', before);
    return () => window.removeEventListener('beforeunload', before);

  }, []);
  async function save(value = answersRef.current) {
    if (saving.current)
      return false;
    saving.current = true;
    setState('Guardando respuestas…');
    try {
      await run('SAVE_ANSWERS', {
        practiceId: practice.id,
        answers: value

      });
      if (value === answersRef.current) {
        changed.current = false;
        onDirtyChange(false);
        setState('Respuesta guardada');

      }
      setError('');
      return true;

    }
    catch {
      setState('Respuestas sin guardar');
      setError('No pudimos guardar la respuesta. Tus respuestas se conservan; podés reintentar.');
      return false;

    }
    finally {
      saving.current = false;

    }

  }
  function change(id: string, value: string | string[]) {
    const next = {
      ...answersRef.current,
      [id]: value

    };
    answersRef.current = next;
    setAnswers(next);
    changed.current = true;
    onDirtyChange(true);
    setState('Guardando respuestas…');
    if (timer.current)
      clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(next), 900);

  }
  async function requestFeedback() {
    setFeedbackError('');
    trackChatTiming('study.feedback', practice.id, startChatTiming());
    try {
      const response = await run('RETRY_FEEDBACK', { practiceId: practice.id });
      const feedback = response.result?.practice?.feedback as { status?: unknown } | undefined;
      if (feedback?.status !== 'COMPLETE') clearChatTiming('study.feedback', practice.id);
    } catch (failure) {
      clearChatTiming('study.feedback', practice.id);
      const message = failure instanceof Error ? failure.message : 'No pudimos completar la devolución.';
      setFeedbackError(`${message} Tus respuestas siguen guardadas.`);
    }
  }

  async function finish() {
    if (timer.current)
      clearTimeout(timer.current);
    if (!(await save()))
      throw new Error('Guardá las respuestas antes de finalizar.');
    try {
      await run('FINALIZE_PRACTICE', {
        practiceId: practice.id,
        confirmedEmpty: false

      });
      setState('Práctica guardada');
      setConfirmation(false);
      if (practice.questions.some((q) => q.type === 'DEVELOPMENT' && answered(q.id)))
        await requestFeedback();

    }
    catch (error) {
      setError('Tus respuestas se conservaron. Podés reintentar la finalización.');
      throw error;

    }

  }
  function answerText(id: string) {
    const value = answers[id];
    if (!value || !answered(id))
      return 'Todavía sin responder';
    if (Array.isArray(value))
      return (practice.questions
        .find((q) => q.id === id)
        ?.options?.filter((option) => value.includes(option.id))
        .map((option) => option.text)
        .join(' · ') ?? '');
    return value;

  }
  return (<section className="study-exact-practice-shell" aria-label="Práctica personal">
    <header className="study-exact-focus-header">
      <button type="button" aria-label="Volver al chat de la carpeta" onClick={onClose}>
        <FoxmindIcon name="arrow-left" />
      </button>
      <div>
        <b>Práctica personal</b>
        <small>{folderName}</small>
      </div>
      <span>
        <FoxmindIcon name="lock" />
        Sólo para vos
      </span>
    </header>
    <main className="study-exact-focus-content">
      <article className="study-exact-practice-work">
        <div className="study-exact-practice-heading">
          <p>Práctica personal · Sin nota académica</p>
          <h1>{practice.title ?? 'Práctica personal'}</h1>
        </div>
        {error && (<Notice error>
          {error}
          <button disabled={busy} onClick={() => void save()}>
            Reintentar guardado
          </button>
        </Notice>)}
        {feedbackError && <Notice error>{feedbackError}</Notice>}
        {finished ? (renderStudyPracticeFeedback({
          practice,
          heading,
          hasDevelopmentAnswers,
          answerText,
          feedbackComplete,
          busy,
          onRetryFeedback: requestFeedback

        })) : review ? (renderStudyPracticeReview({
          practice,
          heading,
          empty,
          answerText,
          busy,
          setIndex,
          setReview

        })) : (<>
          {renderStudyPracticeProgress({
            practice,
            empty,
            index,
            answered,
            setIndex

          })}
          {question && (renderStudyPracticeQuestion({
            question,
            index,
            total: practice.questions.length,
            busy,
            heading,
            answers,
            change

          }))}
        </>)}
      </article>
    </main>
    {renderStudyPracticeFooter({
      finished,
      state,
      busy,
      review,
      empty,
      index,
      practice,
      onClose,
      onNewAttempt,
      setReview,
      setConfirmation,
      setIndex

    })}
    {confirmation && (<StudyConfirmation
      title="¿Finalizar la práctica?"
      description="Vas a ver las respuestas esperadas y una orientación para repasarlas."
      confirmLabel="Finalizar"
      busy={busy}
      onClose={() => setConfirmation(false)}
      onConfirm={finish} />)}
  </section>);

}
