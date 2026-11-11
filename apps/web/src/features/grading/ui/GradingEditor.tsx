'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import type { GradingData } from '../../../../../../src/core/contracts/grading.ts';
import { Dialog, Notice } from '../../../../../shared-ui/feedback.tsx';
import { PublishedGradeCorrection } from './PublishedGradeCorrection.tsx';
import { GradingAiReview } from './GradingAiReview.tsx';
import { BrujulaRubricScoring, BrujulaPublishedRubric, liveRubricSuggestion, rubricInputs, validRubricScore } from './brujula-grading-rubric.tsx';

import { FeedbackGrade, FeedbackSections, QuestionFeedback } from './FeedbackDisplay.tsx';
import { feedbackSections, parseFeedback, serializeFeedback } from './overall-feedback.ts';
import styles from './grading.module.css';

export function GradingEditor({ api, roomId, attemptId, onClose, onChanged, onPrevious, onNext }: {
  api: ClassroomClient; roomId: string; attemptId: string; onClose: () => void; onChanged: () => Promise<void>;
  onPrevious?: () => void; onNext?: () => void;
}) {
  const path = `/${roomId}/attempts/${attemptId}/grading`;
  const heading = useRef<HTMLHeadingElement>(null);
  const [data, setData] = useState<GradingData | null>(null), [overall, setOverall] = useState(''), [feedback, setFeedback] = useState(() => parseFeedback(null));
  const [leave, setLeave] = useState<(() => void) | null>(null);
  const [marks, setMarks] = useState<Record<number, string>>({}), [override, setOverride] = useState<string | null>(null);
  const [points, setPoints] = useState<Record<string, string>>({}), [comments, setComments] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [dirty, setDirty] = useState(false), [confirming, setConfirming] = useState(false);
  const restore = useCallback((next: GradingData) => {
    setData(next); setOverall((next.grade.calculatedGrade !== undefined ? next.grade.calculatedGrade : next.grade.finalGrade) ?? ''); setFeedback(parseFeedback(next.grade.overallFeedback));
    setMarks(Object.fromEntries((next.grade.rubricMarks ?? []).map(mark => [mark.criterionIndex, mark.score ?? ''])));
    setOverride(next.grade.finalGradeOverride ?? null);
    setPoints(Object.fromEntries(next.activity.questions.map(q => [q.id, q.manualPoints ?? ''])));
    setComments(Object.fromEntries(next.activity.questions.map(q => [q.id, q.feedback ?? ''])));
    setDirty(false); setConfirming(false);
  }, []);
  const load = useCallback(async (signal?: AbortSignal) => {
    const next = await api.call<GradingData>(path, 'GET', undefined, signal);
    if (!signal?.aborted) restore(next);
  }, [api, path, restore]);
  useEffect(() => { const controller = new AbortController(); setData(null); setSaved(false); setError('');
    void load(controller.signal).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort(); }, [load]);
  const loadedAttempt = data?.attempt.id;
  const published = data?.grade.isPublished;
  useEffect(() => { if (loadedAttempt) heading.current?.focus(); }, [loadedAttempt, published]);
  async function run(work: () => Promise<void>) {
    setBusy(true); setError(''); setSaved(false);
    try { await work(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const change = () => { setSaved(false); setDirty(true); setConfirming(false); }, writable = !!data?.canSave && !busy && !aiBusy;
  const criteria = data?.grade.rubricSnapshot ?? data?.activity.evaluationRubric ?? [];
  const hasRubric = criteria.length > 0;
  const supportsFinal = !!data && (hasRubric || 'finalGradeOverride' in data.grade || 'calculatedGrade' in data.grade);
  const suggested = liveRubricSuggestion(criteria, marks);
  const calculated = data?.grade.calculatedGrade !== undefined ? data.grade.calculatedGrade : data?.grade.finalGrade;
  const displayedFinal = override ?? calculated ?? '';
  const validInputs = Object.values(marks).every(value => !value || validRubricScore(value)) && (!override || validRubricScore(override));
  const canPublish = !!data?.canSave && !!data.grade.id && !data.grade.pending && !dirty && !busy && !aiBusy;

  const storedFeedback = serializeFeedback(feedback);
  const feedbackLength = [...(storedFeedback ?? '')].length;
  const canNavigate = !busy && !aiBusy;
  function leaveEditor(action: () => void) {
    if (dirty) setLeave(() => action);
    else action();
  }
  const submittedAt = data?.attempt.submittedAt;
  const savedNotes = data?.activity.questions.flatMap((question, index) => question.feedback?.trim()
    ? [{ number: index + 1, id: question.id, prompt: question.prompt, feedback: question.feedback }] : []) ?? [];

  return <section className={`p8-grading ${styles.workspace}`} aria-label="Corrección privada del intento">
    <nav className={styles.navigation} aria-label="Navegar entre entregas">
      <button disabled={!canNavigate} onClick={() => leaveEditor(onClose)}>Volver al historial</button>
      <div className={styles.actions}>
        {onPrevious ? <button disabled={!canNavigate} onClick={() => leaveEditor(onPrevious)}>Anterior</button> : null}
        {onNext ? <button disabled={!canNavigate} onClick={() => leaveEditor(onNext)}>Siguiente</button> : null}
      </div>
    </nav>
    {error && !confirming ? <Notice error>{error} Tus cambios no se han confirmado. Revisá los datos o recargá la corrección.</Notice> : null}
    {!data ? error ? <button disabled={busy} onClick={() => void run(() => load())}>Recargar corrección</button> : <Notice>Cargando corrección…</Notice> : <>
      <header className={styles.reviewHeading}>
        <div><h4 ref={heading} tabIndex={-1}>{data.attempt.firstName} {data.attempt.lastName}</h4>
          <p>{data.activity.title} · Intento {data.attempt.number}</p>
          {submittedAt ? <p>Recibida el <time dateTime={submittedAt}>{new Date(submittedAt).toLocaleString('es-AR', {
            timeZone: data.activity.zone, hourCycle: 'h23', dateStyle: 'medium', timeStyle: 'short',
          })}</time>{data.attempt.submittedLate ? ' · Fuera de plazo' : ''}</p> : null}
        </div>
        <span className={styles.state} data-tone={data.grade.isPublished ? 'published' : undefined}>
          {data.grade.isPublished ? 'Publicada' : 'Corrección privada'}
        </span>
      </header>
      {data.archived ? <Notice>Aula archivada · la corrección es de solo consulta.</Notice> : null}
      <div className={styles.columns}>
        <section className={styles.evidence} aria-label="Trabajo entregado">
          {data.activity.objective || data.activity.instructions ? <details className={styles.panel}>
            <summary>Consigna y objetivo de la actividad</summary>
            {data.activity.objective ? <p className={styles.multiline}>{data.activity.objective}</p> : null}
            {data.activity.instructions ? <p className={styles.multiline}>{data.activity.instructions}</p> : null}
          </details> : null}
          {data.activity.type === 'ASSIGNMENT' || data.attempt.attachments.length ? <section className={styles.panel}>
            <h5>Trabajo entregado</h5>
            {data.attempt.practicalResponse ? <div className={styles.answerBox}><small>Respuesta escrita</small>
              <p className={styles.multiline}>{data.attempt.practicalResponse}</p></div> : null}
            {data.attempt.attachments.length ? <ul>{data.attempt.attachments.map(file => <li key={file.id}>{file.ready
              ? <a href={api.fileUrl(file.id)} target="_blank" rel="noreferrer">Descargar {file.name}</a> : `${file.name} · No disponible`}</li>)}</ul> : null}
            {!data.attempt.practicalResponse && !data.attempt.attachments.length ? <p>Sin texto ni archivos adjuntos.</p> : null}
          </section> : null}
          {data.activity.questions.length ? <h5>Respuestas y puntajes</h5> : null}
          {data.activity.questions.map((question, index) => <article className={styles.answerCard} key={question.id}>
            <h5>Pregunta {index + 1} · {question.points.replace('.', ',')} puntos disponibles</h5>
            <p className={styles.multiline}>{question.prompt}</p>
            <div className={styles.answerBox}><small>Respuesta del estudiante</small>
              {question.type === 'DEVELOPMENT' ? <p className={styles.multiline}>{question.answer.text || 'Sin respuesta'}</p>
                : <ul>{question.options.map(option => <li key={option.id}>{option.text}{question.answer.optionIds.includes(option.id) ? ' · Seleccionada' : ''}{option.correct ? ' · Clave correcta' : ''}</li>)}</ul>}
            </div>
            {question.manual ? <label className={styles.scoreInput}>Puntos de la pregunta {index + 1}
              <input aria-label={`Puntos de la pregunta ${index + 1}`} inputMode="decimal" placeholder="Pendiente"
                value={(points[question.id] ?? '').replace('.', ',')} disabled={!writable}
                onChange={e => { setPoints(previous => ({ ...previous, [question.id]: e.target.value.replace(',', '.') })); change(); }} />
            </label> : <p>Puntos automáticos: {question.earned
              ? question.earned.denominator === '1' ? question.earned.numerator : `${question.earned.numerator}/${question.earned.denominator}`
              : 'Pendiente'}</p>}
            {data.grade.isPublished ? question.feedback ? <QuestionFeedback feedback={question.feedback} /> : null
              : <label>Devolución de la pregunta {index + 1}<textarea aria-label={`Devolución de la pregunta ${index + 1}`}
                  maxLength={5000} value={comments[question.id] ?? ''} disabled={!writable}
                  onChange={e => { setComments(previous => ({ ...previous, [question.id]: e.target.value })); change(); }} /></label>}
          </article>)}
        </section>

        <aside className={styles.review} aria-label="Corrección y devolución">
          {data.canSave ? <GradingAiReview api={api} roomId={roomId} attemptId={attemptId} revision={data.revision} dirty={dirty}
            disabled={busy} onBusyChange={setAiBusy} onApplied={async () => { await load(); setSaved(true); await onChanged(); }} /> : null}

          {data.grade.isPublished ? <BrujulaPublishedRubric snapshot={data.grade.rubricSnapshot} marks={data.grade.rubricMarks}/>
            : hasRubric ? <BrujulaRubricScoring criteria={criteria} marks={marks} disabled={!writable}
              onChange={(index, score) => { setMarks(previous => ({ ...previous, [index]: score })); change(); }}/> : null}

          {data.grade.isPublished ? <FeedbackGrade grade={data.grade.finalGrade ?? ''} title="Calificación publicada" />
            : <section className={styles.evidence} aria-label="Valoración final">
              <h5>Nota final</h5>
              {hasRubric ? <div className={styles.suggestion}>
                <span>Podés usar la nota ponderada o ingresar otra.</span>
                <button type="button" disabled={!writable || suggested === null}
                  onClick={() => { if (suggested !== null) { setOverride(suggested); change(); } }}>Usar nota sugerida</button>
              </div> : null}
              {!hasRubric && data.activity.type !== 'ASSIGNMENT' ? <p>
                {calculated === null || calculated === undefined ? 'La nota por puntos aparece cuando se completan los puntajes.'
                  : `Nota calculada por puntos · ${calculated.replace('.', ',')} / 10`}
                {dirty ? ' Guardá para actualizar el cálculo.' : ''}
              </p> : null}
              {supportsFinal ? <label className={styles.scoreInput}>Tu nota · 0 a 10<input aria-label="Nota final" inputMode="decimal"
                disabled={!writable} aria-invalid={!!override && !validRubricScore(override) || undefined}
                value={displayedFinal.replace('.', ',')} placeholder="Pendiente"
                onChange={event => { setOverride(event.target.value.replace(',', '.')); change(); }}/></label>
                : data.activity.type === 'ASSIGNMENT' ? <label className={styles.scoreInput}>Calificación general · 0 a 10
                  <input aria-label="Calificación general" inputMode="decimal" placeholder="Pendiente" value={overall.replace('.', ',')}
                    disabled={!writable} onChange={e => { setOverall(e.target.value.replace(',', '.')); change(); }} />
                </label> : null}
              {supportsFinal && override !== null ? <div><p>Nota definida por vos.</p>
                <button type="button" disabled={!writable} onClick={() => { setOverride(null); change(); }}>Usar nota calculada</button>
              </div> : null}
              {!!override && !validRubricScore(override) ? <p role="alert">Ingresá una nota de 0 a 10, con hasta dos decimales.</p> : null}
              <small>{data.grade.finalGrade === null ? 'Calificación pendiente de corrección manual' : `Nota guardada: ${data.grade.finalGrade.replace('.', ',')}`}</small>
            </section>}
          <section className={styles.evidence} aria-label="Devolución para el estudiante">
            <h5>Devolución para el estudiante</h5>
            {data.grade.isPublished ? <FeedbackSections value={data.grade.overallFeedback} /> : <>
              {feedbackSections.map(([key, label]) => <label key={key}>
                {key === 'general' ? 'Devolución general opcional' : label}
                <textarea aria-label={key === 'general' ? 'Devolución general opcional' : label} rows={2} value={feedback[key]} disabled={!writable} aria-describedby="grading-feedback-limit"
                  aria-invalid={feedbackLength > 5000 || undefined}
                  onChange={e => { setFeedback(previous => ({ ...previous, [key]: e.target.value })); change(); }} />
              </label>)}
              <small id="grading-feedback-limit">Devolución general y secciones · {feedbackLength} / 5000 caracteres</small>
              {feedbackLength > 5000 ? <Notice error>Acortá la devolución antes de guardar. Se cuentan los títulos de las secciones.</Notice> : null}
            </>}
          </section>
          {data.grade.isPublished ? <PublishedGradeCorrection api={api} roomId={roomId} attemptId={attemptId}
            onChanged={async () => { await load(); await onChanged(); }} /> : null}
        </aside>
      </div>
      <footer className={styles.footer}>
        <p role="status">{data.grade.isPublished ? 'Calificación publicada · solo consulta.' : saved ? 'Corrección privada guardada. No se ha publicado.'
          : dirty ? 'Hay cambios sin guardar.' : 'Corrección privada: el estudiante no ve esta calificación.'}</p>
        <div className={styles.actions}>
          <button disabled={busy || aiBusy} onClick={() => void run(() => load())}>Recargar corrección</button>
          {data.canSave ? <button disabled={busy || aiBusy || !validInputs || feedbackLength > 5000} onClick={() => void run(async () => {
            const next = await api.call<GradingData>(path, 'POST', { revision: data.revision, overallGrade: data.activity.type === 'ASSIGNMENT' ? overall || null : null,
              overallFeedback: storedFeedback, ...(hasRubric ? { rubricMarks: rubricInputs(criteria, marks) } : {}),
              ...(supportsFinal ? { finalGradeOverride: override || null } : {}), questions: data.activity.questions.map(q => ({ questionId: q.id, points: q.manual ? points[q.id] || null : null, feedback: comments[q.id] || null })) });
            restore(next); setSaved(true); await onChanged();
          })}>{busy ? 'Guardando…' : 'Guardar corrección privada'}</button> : null}
          {data.canSave ? <button className="primary" disabled={!canPublish} onClick={() => setConfirming(true)}>Publicar calificación</button> : null}
        </div>
      </footer>
      {confirming && data.grade.finalGrade !== null ? <Dialog className={styles.previewDialog} title="Así verá la devolución el estudiante" onClose={() => { if (!busy) setConfirming(false); }}>
        <section aria-label="Confirmar publicación de calificación" className={styles.result}>
          <FeedbackGrade grade={data.grade.finalGrade} title="Calificación"><p>Vista previa de la corrección guardada</p></FeedbackGrade>
          <FeedbackSections value={data.grade.overallFeedback} />
          <BrujulaPublishedRubric snapshot={data.grade.rubricSnapshot} marks={data.grade.rubricMarks}/>
          {savedNotes.length ? <details><summary>Orientaciones por pregunta</summary><ol className={styles.previewNotes}>
            {savedNotes.map(note => <li key={note.id} value={note.number}><p className={styles.multiline}>{note.prompt}</p>
              <QuestionFeedback feedback={note.feedback}/></li>)}
          </ol></details> : null}
          {error ? <Notice error>{error}</Notice> : null}
          <Notice>Al publicar, el estudiante verá esta nota y devolución. La nota reemplaza la vigente de esta actividad, aunque sea menor.</Notice>
          <div className={styles.actions}><button disabled={busy} onClick={() => setConfirming(false)}>Cancelar publicación</button>
            <button className="primary" disabled={!canPublish} onClick={() => void run(async () => {
              const next = await api.call<GradingData>(`/${roomId}/attempts/${attemptId}/publish-grade`, 'POST', { revision: data.revision, confirm: true });
              restore(next); await onChanged();
            })}>Confirmar publicación</button></div>
        </section>
      </Dialog> : null}
    </>}
    {leave ? <Dialog title="Tenés cambios sin guardar" onClose={() => setLeave(null)}>
      <p>Podés volver a la corrección y guardar, o continuar y descartar los cambios.</p>
      <div className={styles.actions}><button onClick={() => setLeave(null)}>Volver a la corrección</button>
        <button onClick={() => { setLeave(null); leave(); }}>Descartar cambios</button></div>
    </Dialog> : null}
  </section>;
}
