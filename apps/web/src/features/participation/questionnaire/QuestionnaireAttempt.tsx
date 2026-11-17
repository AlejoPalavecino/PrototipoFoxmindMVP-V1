'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AttemptEditor, AttemptSessionData } from '../../../../../../src/core/contracts/participation.ts';
import type { AttemptReadingOperations, QuestionnaireAttemptOperations } from '../model/participation-operations.ts';
import { QuestionnaireDraft } from './questionnaire-draft.ts';
import { Dialog, Notice } from '../../../../../shared-ui/feedback.tsx';
import type { AttemptExitRef } from '../model/AttemptExitRef.ts';
import styles from '../ui/Participation.module.css';
import { FoxmindIcon } from '../../../../../shared-ui/index.ts';
import { AttemptAnswers } from '../review/AttemptAnswers.tsx';
import { AttemptReceipt } from '../receipts/AttemptReceipt.tsx';

const developmentLimit = 20_000;

export function QuestionnaireAttempt({ operations, reading, data, editor, refresh, exitRef, onClose }: {
  operations: QuestionnaireAttemptOperations; reading: AttemptReadingOperations; data: AttemptSessionData; editor: AttemptEditor | null; refresh: () => Promise<void>; exitRef?: AttemptExitRef; onClose?: () => void;
}) {
  const [, render] = useState(0), [busy, setBusy] = useState(false);
  const [index, setIndex] = useState(0), [reviewIndex, setReviewIndex] = useState(0);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const measureFooter = useCallback((footer: HTMLElement | null) => {
    const screen = footer?.closest<HTMLElement>('.brujula-activity-screen[data-focused]');
    if (!footer || !screen) return;
    const measure = () => screen.style.setProperty('--questionnaire-footer-height', `${Math.ceil(footer.getBoundingClientRect().height)}px`);
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(footer);
    return () => { observer?.disconnect(); screen.style.removeProperty('--questionnaire-footer-height'); };
  }, []);
  const focusQuestion = useRef(false);
  const operation = useRef(false);
  const [confirm, setConfirm] = useState<number | null>(null), [error, setError] = useState('');
  const [receipt, setReceipt] = useState<{ submittedAt: string; submittedLate: boolean; appliedDeadlineAt: string | null } | null>(null);
  const attempt = data.attempt!, questions = data.activity.questions;
  const editable = !receipt && !!editor && attempt.status === 'DRAFT' && data.canTransfer && editor.epoch === attempt.epoch;
  const [draft] = useState(() => new QuestionnaireDraft({ questionIds: questions.map(q => q.id!), answers: attempt.answers,
    revision: attempt.revision, changed: () => render(value => value + 1), save: async input => {
      try { return await operations.saveAnswer(input); }
      catch (e) {
        // A lost response may follow a committed save. Refresh only confirmed authority/CAS; retain dirty values for explicit retry.
        await refresh().catch(() => {});
        throw e;
      }
    } }));
  useEffect(() => { draft.receive(attempt.revision, attempt.answers); }, [draft, attempt.revision, attempt.answers]);
  useEffect(() => { if (editable) draft.activate(); else draft.invalidate(); return () => draft.invalidate(); }, [draft, editable]);
  useEffect(() => {
    if (!exitRef) return;
    exitRef.current = { dirty: editable && draft.dirty, busy, save: editable ? () => draft.flush() : undefined };
    return () => { exitRef.current = null; };
  });
  useEffect(() => {
    if (focusQuestion.current) { questionHeading.current?.focus(); focusQuestion.current = false; }
  }, [index, confirm]);
  function goTo(next: number) {
    focusQuestion.current = next !== index || confirm !== null;
    setConfirm(null); setIndex(next);
  }
  async function run(action: () => Promise<void>) {
    if (operation.current) return;
    operation.current = true;
    setBusy(true); setError('');
    try { await action(); } catch (e) { setError((e as Error).message); } finally { operation.current = false; setBusy(false); }
  }
  const states = { pending: 'Cambios pendientes de guardar', saving: 'Guardando…', error: 'Error de guardado · cambios sin confirmar' };
  const answered = (question: (typeof questions)[number]) => {
    const answer = draft.get(question.id!).value;
    return question.type === 'DEVELOPMENT' ? !!answer.text.trim() : answer.optionIds.length > 0;
  };
  const count = questions.filter(answered).length;
  const question = questions[index], reviewed = questions[reviewIndex];
  const entry = question ? draft.get(question.id!) : null;
  const submitted = attempt.status === 'SUBMITTED' || receipt !== null;
  const reviewAnswer = reviewed ? draft.get(reviewed.id!).value : null;
  const nav = (selected: number, select: (value: number) => void, label: string) => <nav className={styles.questionNav} aria-label={label}>
    {questions.map((item, position) => <button key={item.id} type="button" disabled={busy} aria-current={position === selected ? 'step' : undefined}
      aria-label={`Pregunta ${position + 1}, ${answered(item) ? 'respondida' : 'sin responder'}`}
      data-answered={answered(item) || undefined} onClick={() => select(position)}>{position + 1}
      {answered(item) ? <FoxmindIcon name="check"/> : null}</button>)}
  </nav>;
  if (submitted) return <div className="parity-receipt-screen"><AttemptReceipt delivery={receipt ?? attempt} title={data.activity.title} zone={data.activity.zone} number={attempt.number} content={`${count} ${count === 1 ? 'respuesta' : 'respuestas'}`}/><div className="parity-receipt-actions"><AttemptAnswers operations={reading} data={{ ...data, attempt: { ...attempt, answers: questions.map(question => ({ ...draft.get(question.id!).value, savedAt: receipt?.submittedAt ?? attempt.submittedAt ?? attempt.answers.find(answer => answer.questionId === question.id)?.savedAt ?? '' })) } }}/>{onClose ? <button className="primary" onClick={onClose}>Volver a actividades</button> : null}</div></div>;
  return <section className={`p7-questionnaire ${styles.questionnaire}`} aria-label="Respuestas y entrega">
    {error || draft.error ? <Notice error>{error || draft.error} {submitted
      ? 'Tu entrega ya está confirmada. Podés consultarla en el historial.'
      : 'Tus respuestas siguen en pantalla. Podés reintentar el guardado.'}</Notice> : null}
    {submitted ? <AttemptReceipt delivery={receipt ?? attempt} title={data.activity.title} zone={data.activity.zone}
      number={attempt.number} content={`${count} ${count === 1 ? 'respuesta' : 'respuestas'}`} /> : null}
    {questions.length ? <div className={styles.questionProgress}>
      <p role="status">{count} de {questions.length} respondidas</p>
      {nav(index, goTo, 'Preguntas')}
    </div> : null}
    {question && entry ? <article className={`brujula-answer-question ${styles.question}`} aria-label={`Pregunta ${index + 1}`}>
      <div className={styles.questionPosition}><span>Pregunta {index + 1} de {questions.length}</span>
        <small>{{DEVELOPMENT: 'Con tus palabras', SINGLE_CHOICE: 'Elegí una respuesta', MULTIPLE_CHOICE: 'Elegí una o más'}[question.type]}</small></div>
      <h3 ref={questionHeading} tabIndex={-1}>{question.prompt}</h3>
      <fieldset disabled={!editable || busy}>
        <legend className="sr-only">Respuesta a la pregunta {index + 1}</legend>
        {question.type === 'DEVELOPMENT' ? <label>Tu respuesta<textarea aria-label={`Respuesta a la pregunta ${index + 1}`} rows={5}
          placeholder="Escribí tu respuesta…" value={entry.value.text}
          onChange={event => {
            const characters = [...event.target.value];
            if (characters.length > developmentLimit) {
              setError('La respuesta admite hasta 20.000 caracteres.');
              return;
            }
            draft.edit({ ...entry.value, text: event.target.value }); setError(''); setConfirm(null);
          }} /></label>
          : <>{question.options.map(option => <label key={option.id} className="p7-choice"><input
            type={question.type === 'SINGLE_CHOICE' ? 'radio' : 'checkbox'} name={`question-${question.id}`} value={option.id}
            checked={entry.value.optionIds.includes(option.id!)} onChange={e => {
              const optionIds = question.type === 'SINGLE_CHOICE' ? [option.id!]
                : e.target.checked ? [...entry.value.optionIds, option.id!] : entry.value.optionIds.filter(id => id !== option.id);
              draft.edit({ ...entry.value, optionIds }); setConfirm(null);
            }} />{option.text}</label>)}
            {editable && entry.value.optionIds.length ? <button type="button" onClick={() => { draft.edit({ ...entry.value, optionIds: [] }); setConfirm(null); }}>Limpiar selección</button> : null}</>}
      </fieldset>
    </article> : <Notice>Esta actividad todavía no tiene preguntas.</Notice>}
    {editable ? <footer ref={measureFooter} className={`${styles.workFooter} parity-work-footer`}>
      <p className={styles.answerStatus} role="status" data-error={!!draft.error || undefined}>
        <FoxmindIcon name={draft.error ? 'warning' : 'check'}/>{draft.error ? states.error : draft.saving ? states.saving : draft.dirty ? states.pending : 'Borrador guardado'}
      </p>
      <div className={styles.workActions}>
        <button type="button" disabled={busy} onClick={() => void run(async () => { await draft.flush(); onClose?.(); })}>{draft.error ? 'Reintentar guardado' : onClose ? 'Guardar y salir' : 'Guardar borrador'}</button>
        {index > 0 ? <button type="button" disabled={busy} onClick={() => goTo(index - 1)}>Anterior</button> : null}
        {index < questions.length - 1 ? <button type="button" disabled={busy} onClick={() => goTo(index + 1)}>Siguiente</button> : null}
        <button type="button" className="primary" disabled={busy || !questions.length} onClick={() => void run(async () => {
          await draft.flush(); setReviewIndex(index); setConfirm(questions.filter(item => !answered(item)).length);
        })}>Revisar entrega</button>
      </div>
    </footer> : null}
    {confirm !== null && editable ? <Dialog title="Revisá antes de entregar" className={styles.reviewDialog} onClose={()=>{if(!busy)setConfirm(null);}}>
      <section className="p7-submit-confirm" aria-label="Confirmar entrega de respuestas">
      <small>Intento {attempt.number} · {data.activity.title}</small><h4>{count} de {questions.length} preguntas respondidas</h4>
      {confirm > 0 ? <Notice>{`Quedan ${confirm} ${confirm === 1 ? 'pregunta sin responder' : 'preguntas sin responder'}. Las respuestas vacías recibirán cero puntos.`}</Notice> : null}
      {nav(reviewIndex, setReviewIndex, 'Revisar respuestas')}
      {reviewed && reviewAnswer ? <article className={styles.reviewAnswer}>
        <small>Pregunta {reviewIndex + 1} de {questions.length}</small><h4>{reviewed.prompt}</h4>
        <p className="p7-multiline">{(reviewed.type === 'DEVELOPMENT' ? reviewAnswer.text :
          reviewed.options.filter(option => reviewAnswer.optionIds.includes(option.id!)).map(option => option.text).join(' · ')) || 'Sin responder'}</p>
        <button type="button" disabled={busy} onClick={() => goTo(reviewIndex)}>Editar esta respuesta</button>
      </article> : null}
      <p>Al confirmar, tu docente recibe las respuestas y el intento queda disponible para consultar.</p>
      {error ? <Notice error>{error}</Notice> : null}
      <button aria-label="Cancelar entrega" disabled={busy} onClick={() => setConfirm(null)}>Volver a editar</button>
      <button className="primary" disabled={busy || draft.dirty || draft.saving} onClick={() => void run(async () => {
        await draft.flush();
        const result = await operations.submitAnswers(draft.revision, confirm > 0);
        draft.invalidate(); setReceipt(result); setConfirm(null); await refresh();
      })} aria-label={confirm>0?'Confirmar entrega incompleta':'Confirmar envío de respuestas'}>Confirmar entrega</button>
    </section></Dialog> : null}
  </section>;
}
