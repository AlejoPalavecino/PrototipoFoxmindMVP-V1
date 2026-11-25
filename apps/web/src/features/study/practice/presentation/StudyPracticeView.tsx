import type { StudyRun as Run } from '../../model/study-commands.ts';
import { useEffect, useRef, useState } from 'react';
import type { StudyPractice, StudySource } from '../../model/study-contracts.ts';
import { FoxmindIcon } from '../../../../../../shared-ui/FoxmindIcon';
import { Notice } from '../../../../../../shared-ui/feedback';
import { StudyConfirmation } from '../../ui/study-confirmation';
import { StudyReferencedMaterialsDialog } from '../../ui/study-referenced-materials-dialog';
import { renderStudyPracticeQuestion } from './study-practice-question.tsx';
import { renderStudyPracticeProgress } from './study-practice-progress.tsx';
import { renderStudyPracticeReview } from './study-practice-review.tsx';
import { renderStudyPracticeFeedback } from './study-practice-feedback.tsx';
import { renderStudyPracticeFooter } from './study-practice-footer.tsx';
import { completedPracticeAttempts } from './study-practice-results.ts';
import { clearChatTiming, commitChatTiming, startChatTiming, trackChatTiming } from '../../../../shared/chat-timing.ts';
export function StudyPracticeView({ practice, practices = [], busy, run, onDirtyChange, onNewAttempt, onSelectAttempt, onClose, folderName, inline = false, sources, closeLabel = 'Volver al chat' }: {
  practice: StudyPractice;
  practices?: StudyPractice[];
  busy: boolean;
  run: Run;
  onDirtyChange: (v: boolean) => void;
  onNewAttempt: () => Promise<void>;
  onSelectAttempt?: (id: string) => void;
  onClose?: () => void;
  folderName?: string;
  inline?: boolean;
  closeLabel?: string;
  sources?: { folderId: string; items: StudySource[] };
}) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>(practice.answers ?? {});
  const [index, setIndex] = useState(0), [review, setReview] = useState(false), [confirmation, setConfirmation] = useState(false);
  const [state, setState] = useState('Tus respuestas se guardan en esta carpeta'), [error, setError] = useState('');
  const [feedbackError, setFeedbackError] = useState('');
  const [checkError, setCheckError] = useState('');
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const changed = useRef(false), saving = useRef<Promise<boolean> | null>(null), confirming = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null), heading = useRef<HTMLElement>(null);
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
  const checked = new Set(practice.confirmedQuestionIds ?? []);
  const guided = practice.kind === 'QUIZ';
  const requiresCheck = guided && !!question && question.type !== 'DEVELOPMENT' && !checked.has(question.id);
  const unchecked = guided && practice.questions.some((item) => item.type !== 'DEVELOPMENT' && !checked.has(item.id));
  const completed = (item: StudyPractice['questions'][number]) => guided && item.type !== 'DEVELOPMENT' ? checked.has(item.id) : answered(item.id);
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
  function save(force = false) {
    if (saving.current) return saving.current;
    if (!force && !changed.current) return Promise.resolve(true);
    setState('Guardando respuestas…');
    const request = async () => {
      try {
        let value: typeof answers;
        do {
          value = answersRef.current;
          await run('SAVE_ANSWERS', { practiceId: practice.id, answers: value });
        } while (value !== answersRef.current);
        changed.current = false;
        onDirtyChange(false);
        setState('Respuestas guardadas');
        setError('');
        return true;
      } catch {
        setState('Respuestas sin guardar');
        setError('No pudimos guardar la respuesta. Tus respuestas se conservan; podés reintentar.');
        return false;
      }
    };
    saving.current = request().finally(() => { saving.current = null; });
    return saving.current;
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
    timer.current = setTimeout(() => void save(), 900);

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

  async function confirmAnswer() {
    const optionIds = question && answersRef.current[question.id];
    if (confirming.current || !requiresCheck || !question || !Array.isArray(optionIds) || !optionIds.length) return;
    confirming.current = true;
    if (timer.current) clearTimeout(timer.current);
    setCheckError('');
    try {
      if (!(await save())) return;
      await run('CONFIRM_PRACTICE_ANSWER', { practiceId: practice.id, questionId: question.id, optionIds });
    } catch {
      setCheckError('No pudimos confirmar la respuesta. Tu selección se conserva y podés reintentar.');
    } finally {
      confirming.current = false;
    }
  }

  async function finish() {
    if (timer.current)
      clearTimeout(timer.current);
    if (!(await save(true)))
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
  const Work = inline ? 'div' : 'main';
  return (<section className={`study-exact-practice-shell${inline ? ' study-exact-practice-inline' : ''}`} aria-label="Práctica personal">
    <header className="study-exact-focus-header">
      <button type="button" aria-label="Volver al chat de la carpeta" onClick={onClose}>
        <FoxmindIcon name="arrow-left" />
        {inline && closeLabel}
      </button>
      {!inline && <div>
        <b>Práctica personal</b>
        <small>{folderName}</small>
      </div>}
      <span>
        <FoxmindIcon name="lock" />
        Sólo para vos
      </span>
    </header>
    <Work className="study-exact-focus-content">
      <article className="study-exact-practice-work">
        <div className="study-exact-practice-heading">
          <span className="study-practice-cover-icon"><FoxmindIcon name={practice.kind === 'MOCK_EXAM' ? 'clipboard' : 'edit'} /></span>
          <div>
            <p>{practice.kind === 'MOCK_EXAM' ? 'Simulacro de evaluación' : 'Práctica personal'} · Sin nota académica</p>
            <h1>{practice.title ?? 'Práctica personal'}</h1>
          </div>
          {!!sources?.items.length && <button type="button" className="study-practice-source-button" aria-haspopup="dialog"
            onClick={() => setSourcesOpen(true)}><FoxmindIcon name="book" />{sources.items.length === 1 ? 'Ver apunte' : 'Ver fuentes'}</button>}
        </div>
        {error && (<Notice error>
          {error}
          <button disabled={busy} onClick={() => void save()}>
            Reintentar guardado
          </button>
        </Notice>)}
        {feedbackError && <Notice error>{feedbackError}</Notice>}
        {checkError && <Notice error>{checkError}</Notice>}
        {finished ? (renderStudyPracticeFeedback({
          practice,
          attempts: completedPracticeAttempts(practice, practices),
          onSelectAttempt,
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
          unchecked,
          locked: checked,
          answerText,
          busy,
          setIndex,
          setReview

        })) : (<>
          {renderStudyPracticeProgress({
            practice,
            empty: practice.questions.filter((item) => !completed(item)).length,
            index,
            answered: (id) => practice.questions.some((item) => item.id === id && completed(item)),
            guided,
            setIndex

          })}
          {question && (renderStudyPracticeQuestion({
            question,
            index,
            total: practice.questions.length,
            busy,
            checked: checked.has(question.id),
            heading,
            answers,
            change

          }))}
        </>)}
      </article>
    </Work>
    {renderStudyPracticeFooter({
      finished,
      state,
      busy,
      review,
      empty,
      unchecked,
      requiresCheck,
      canCheck: !!question && answered(question.id),
      confirmAnswer,
      index,
      practice,
      inline,
      closeLabel,
      onClose,
      onNewAttempt,
      setReview,
      setConfirmation,
      setIndex

    })}
    {confirmation && (<StudyConfirmation
      title="¿Finalizar la práctica?"
      description={guided ? 'Vas a guardar tu resultado y ver el repaso de este intento.' : 'Vas a ver las respuestas esperadas y una orientación para repasarlas.'}
      confirmLabel="Finalizar"
      busy={busy}
      onClose={() => setConfirmation(false)}
      onConfirm={finish} />)}
    {sourcesOpen && sources && <StudyReferencedMaterialsDialog {...sources} onClose={() => setSourcesOpen(false)} />}
  </section>);

}
