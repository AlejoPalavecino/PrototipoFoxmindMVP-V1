'use client';
import { useEffect, useState } from 'react';
import type { AnswerConfirmation, AttemptEditor, AttemptSessionData, ClassroomClient } from './api.ts';
import { QuestionnaireDraft } from './questionnaire-draft.ts';
import { Notice } from './components.tsx';
import { activityDate } from './ActivityAuthoring.tsx';

export function QuestionnaireAttempt({ api, classroomId, data, editor, refresh }: {
  api: ClassroomClient; classroomId: string; data: AttemptSessionData; editor: AttemptEditor | null; refresh: () => Promise<void>;
}) {
  const [, render] = useState(0), [index, setIndex] = useState(0), [busy, setBusy] = useState(false);
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
  async function run(action: () => Promise<void>) {
    setBusy(true); setError('');
    try { await action(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const question = questions[index], entry = question ? draft.get(question.id!) : null;
  const states = { saved: 'Guardado confirmado', pending: 'Cambios pendientes de guardar', saving: 'Guardando…', error: 'Error de guardado · cambios sin confirmar' };
  const unanswered = () => questions.filter(q => {
    const answer = draft.get(q.id!).value;
    return q.type === 'DEVELOPMENT' ? !answer.text.trim() : !answer.optionIds.length;
  }).length;
  function navigate(next: number) {
    setIndex(next); setConfirm(null);
    if (editable) void draft.flush().catch(e => setError(e.message));
  }
  return <section className="p7-questionnaire" aria-label="Respuestas y entrega">
    {attempt.status === 'SUBMITTED' || receipt ? <Notice>Comprobante de entrega · pendiente de corrección. No hay una calificación publicada en este comprobante.
      <br />Recepción: {(receipt ?? attempt).submittedAt ? new Date((receipt ?? attempt).submittedAt!).toLocaleString('es', { timeZone: data.activity.zone }) : 'No disponible'} · {data.activity.zone}.
      {(receipt ?? attempt).submittedLate ? ' Entrega fuera de plazo.' : ' Entrega a tiempo.'} {activityDate((receipt ?? attempt).appliedDeadlineAt, data.activity.zone)}</Notice>
      : <p className="p7-save-guidance">Intentamos guardar a los 2 segundos sin cambios y al cambiar de pregunta. <strong>Guardar no entrega.</strong> Si cerrás o recargás sin conexión, podés perder los cambios sin confirmar.</p>}
    {error || draft.error ? <Notice error>{error || draft.error} Las respuestas siguen en pantalla; no se confirmó su guardado.</Notice> : null}
    <nav className="p7-question-navigation" aria-label="Navegación de preguntas">{questions.map((q, position) =>
      <button key={q.id} aria-current={position === index ? 'step' : undefined} onClick={() => navigate(position)}>Pregunta {position + 1}</button>)}</nav>
    {question && entry ? <article aria-label={`Pregunta ${index + 1}`}><h4>Pregunta {index + 1} · {question.points} puntos</h4>
      <p className="p7-multiline">{question.prompt}</p>
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
      <p role="status" aria-live="polite">{editable ? states[entry.state] : 'Respuesta confirmada · solo consulta'}</p>
    </article> : null}
    {editable ? <footer className="p5-form-footer">
      <button disabled={busy} onClick={() => void run(() => draft.flush())}>Reintentar guardado</button>
      <button className="primary" disabled={busy} onClick={() => void run(async () => { await draft.flush(); setConfirm(unanswered()); })}>Enviar respuestas</button>
    </footer> : null}
    {confirm !== null && editable ? <section className="p7-submit-confirm" aria-label="Confirmar entrega de respuestas"><h4>Confirmar entrega</h4>
      <p>Quedan {confirm} preguntas sin responder. {confirm > 0 ? 'Las preguntas sin responder obtendrán cero puntos en este intento. Debes confirmar explícitamente la entrega incompleta.' : 'Todas las preguntas tienen una respuesta confirmada.'}
        Después de confirmar, las respuestas quedarán bloqueadas. El docente debe revisar y publicar el resultado.</p>
      <button disabled={busy} onClick={() => setConfirm(null)}>Cancelar entrega</button>
      <button className="primary" disabled={busy || draft.dirty || draft.saving} onClick={() => void run(async () => {
        await draft.flush();
        if (!api.attempt) throw new Error('El envío no está disponible.');
        const result = await api.attempt<{ submittedAt: string; submittedLate: boolean; appliedDeadlineAt: string | null }>(`/${classroomId}/attempts/${attempt.id}/submit-answers`,
          { revision: draft.revision, confirm: true, confirmIncomplete: confirm > 0 }, editor!);
        draft.invalidate(); setReceipt(result); setConfirm(null); await refresh();
      })}>{confirm > 0 ? 'Confirmar entrega incompleta' : 'Confirmar envío de respuestas'}</button>
    </section> : null}
  </section>;
}
