'use client';
import { useEffect, useState } from 'react';
import type { AnswerConfirmation, AttemptEditor, AttemptSessionData } from '../../../../../../src/core/contracts/participation.ts';
import type { ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import { QuestionnaireDraft } from '../model/questionnaire-draft.ts';
import { Dialog, Notice } from '../../../../../shared-ui/feedback.tsx';
import type { AttemptExitRef } from './AttemptExitRef.ts';
import styles from './Participation.module.css';
import { activityDate } from '../../../../../shared-ui/academic-date.ts';

export function QuestionnaireAttempt({ api, classroomId, data, editor, refresh, exitRef }: {
  api: ClassroomClient; classroomId: string; data: AttemptSessionData; editor: AttemptEditor | null; refresh: () => Promise<void>; exitRef?: AttemptExitRef;
}) {
  const [, render] = useState(0), [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<number | null>(null), [error, setError] = useState('');
  const [receipt, setReceipt] = useState<{ submittedAt: string; submittedLate: boolean; appliedDeadlineAt: string | null } | null>(null);
  const attempt = data.attempt!, questions = data.activity.questions;
  const editable = !receipt && !!editor && attempt.status === 'DRAFT' && data.canTransfer && editor.epoch === attempt.epoch;
  const [draft] = useState(() => new QuestionnaireDraft({ questionIds: questions.map(q => q.id!), answers: attempt.answers,
    revision: attempt.revision, changed: () => render(value => value + 1), save: async input => {
      if (!editor || !api.attempt) throw new Error('El guardado no está disponible en esta pestaña.');
      try { return await api.attempt<AnswerConfirmation>(`/${classroomId}/attempts/${attempt.id}/answer`, input, editor); }
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
  async function run(action: () => Promise<void>) {
    setBusy(true); setError('');
    try { await action(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const states = { saved: 'Guardado confirmado', pending: 'Cambios pendientes de guardar', saving: 'Guardando…', error: 'Error de guardado · cambios sin confirmar' };
  const unanswered = () => questions.filter(q => {
    const answer = draft.get(q.id!).value;
    return q.type === 'DEVELOPMENT' ? !answer.text.trim() : !answer.optionIds.length;
  }).length;
  return <section className={`p7-questionnaire ${styles.questionnaire}`} aria-label="Respuestas y entrega">
    {attempt.status === 'SUBMITTED' || receipt ? <Notice><strong>Entrega confirmada.</strong> Podés consultar la calificación desde «Ver devolución».
      <br />Recepción: {(receipt ?? attempt).submittedAt ? new Date((receipt ?? attempt).submittedAt!).toLocaleString('es', { timeZone: data.activity.zone }) : 'No disponible'} · {data.activity.zone}.
      {(receipt ?? attempt).submittedLate ? ' Entrega fuera de plazo.' : ' Entrega a tiempo.'} {activityDate((receipt ?? attempt).appliedDeadlineAt, data.activity.zone)}</Notice>
      : editable ? <p className="p7-save-guidance">Tus respuestas se guardan automáticamente. <strong>Guardar no entrega.</strong> Antes de salir, esperá la confirmación de guardado.</p> : null}
    {error || draft.error ? <Notice error>{error || draft.error} {receipt || attempt.status === 'SUBMITTED'
      ? 'Tu entrega ya está confirmada. No pudimos actualizar la vista; podés volver a consultar el estado.'
      : 'Las respuestas siguen en pantalla; no se confirmó su guardado.'}</Notice> : null}
    {questions.map((question,index) => {const entry=draft.get(question.id!);return <article className="brujula-answer-question" key={question.id} aria-label={`Pregunta ${index + 1}`}><h4><span>{String(index+1).padStart(2,'0')}</span>{question.prompt}</h4>
      <small>{{DEVELOPMENT:'Desarrollo',SINGLE_CHOICE:'Selección simple',MULTIPLE_CHOICE:'Selección múltiple'}[question.type]}</small>
      <fieldset disabled={!editable || busy}><legend>Respuesta a la pregunta {index + 1}</legend>
        {question.type === 'DEVELOPMENT' ? <label>Tu respuesta<textarea aria-label={`Respuesta a la pregunta ${index + 1}`} rows={7}
          value={entry.value.text} onChange={e => { draft.edit({ ...entry.value, text: e.target.value }); setConfirm(null); }} /></label>
          : <>{question.options.map(option => <label key={option.id} className="p7-choice"><input
            type={question.type === 'SINGLE_CHOICE' ? 'radio' : 'checkbox'} name={`question-${question.id}`} value={option.id}
            checked={entry.value.optionIds.includes(option.id!)} onChange={e => {
              const optionIds = question.type === 'SINGLE_CHOICE' ? [option.id!]
                : e.target.checked ? [...entry.value.optionIds, option.id!] : entry.value.optionIds.filter(id => id !== option.id);
              draft.edit({ ...entry.value, optionIds }); setConfirm(null);
            }} />{option.text}</label>)}
            <button onClick={() => { draft.edit({ ...entry.value, optionIds: [] }); setConfirm(null); }}>Limpiar selección</button></>}
      </fieldset>
      <p className={styles.answerStatus} role="status" aria-live="polite">{editable ? states[entry.state] : 'Respuesta confirmada · solo consulta'}</p>
    </article>;})}
    {editable ? <footer className="p5-form-footer">
      <button disabled={busy || (!draft.dirty && !draft.error)} onClick={() => void run(() => draft.flush())}>{draft.error ? 'Reintentar guardado' : 'Guardar borrador'}</button>
      <button className="primary" disabled={busy} onClick={() => void run(async () => { await draft.flush(); setConfirm(unanswered()); })}>Revisar entrega</button>
    </footer> : null}
    {confirm !== null && editable ? <Dialog title="Confirmar entrega" className={styles.reviewDialog} onClose={()=>{if(!busy)setConfirm(null);}}><section className="p7-submit-confirm" aria-label="Confirmar entrega de respuestas"><small>Intento {attempt.number}</small><h4>{data.activity.title}</h4>
      <p>{confirm > 0 ? `Quedan ${confirm} preguntas sin responder y obtendrán cero puntos. Confirmá si querés entregar así.` : 'Todas las preguntas tienen una respuesta guardada.'}{' '}
        Después de confirmar, las respuestas quedarán bloqueadas. El docente debe revisar y publicar el resultado.</p>
      <button aria-label="Cancelar entrega" disabled={busy} onClick={() => setConfirm(null)}>Volver a editar</button>
      <button className="primary" disabled={busy || draft.dirty || draft.saving} onClick={() => void run(async () => {
        await draft.flush();
        if (!api.attempt) throw new Error('El envío no está disponible.');
        const result = await api.attempt<{ submittedAt: string; submittedLate: boolean; appliedDeadlineAt: string | null }>(`/${classroomId}/attempts/${attempt.id}/submit-answers`,
          { revision: draft.revision, confirm: true, confirmIncomplete: confirm > 0 }, editor!);
        draft.invalidate(); setReceipt(result); setConfirm(null); await refresh();
      })} aria-label={confirm>0?'Confirmar entrega incompleta':'Confirmar envío de respuestas'}>Confirmar entrega</button>
    </section></Dialog> : null}
  </section>;
}
