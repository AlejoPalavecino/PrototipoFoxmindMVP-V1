'use client';
import { useEffect, useRef, useState } from 'react';
import type { GradingEditingOperations, GradingPublicationOperations, GradingAiReviewOperations, GradeCorrectionsOperations } from '../model/grading-operations.ts';
import { FoxmindIcon } from '../../../../../shared-ui/index.ts';
import { Dialog, Notice } from '../../../../../shared-ui/feedback.tsx';
import { PublishedGradeCorrection } from '../publication/PublishedGradeCorrection.tsx';
import { GradingAiReview } from '../ai-review/GradingAiReview.tsx';
import { BrujulaRubricScoring, BrujulaPublishedRubric, liveRubricSuggestion, rubricInputs, validRubricScore } from '../ui/brujula-grading-rubric.tsx';

import { FeedbackGrade, FeedbackSections, QuestionFeedback } from '../ui/FeedbackDisplay.tsx';
import { feedbackSections, serializeFeedback } from '../ui/overall-feedback.ts';
import styles from '../ui/grading.module.css';
import { useGradingDraft } from './use-grading-draft.ts';
import { useGradingPersistence } from './use-grading-persistence.ts';

export function GradingEditor({ operations, publication, aiReview, corrections, roomId, attemptId, onClose, onChanged, onPrevious, onNext, onHistory, onReopen }: {
  operations: GradingEditingOperations; publication: GradingPublicationOperations; aiReview: GradingAiReviewOperations; corrections: GradeCorrectionsOperations; roomId: string; attemptId: string; onClose: () => void; onChanged: () => Promise<void>;
  onPrevious?: () => void; onNext?: () => void; onHistory?: () => void; onReopen?: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [panel, setPanel] = useState<'rubric' | 'feedback'>('rubric');
  const [guideOpen, setGuideOpen] = useState(false);
  const { data, clear, overall, setOverall, feedback, setFeedback, marks, setMarks, override, setOverride,
    points, setPoints, comments, setComments, dirty, confirming, setConfirming, leave, setLeave, restore,
    change: changeDraft, leaveEditor } = useGradingDraft();
  const { load, run, busy, error, saved, setSaved } = useGradingPersistence(operations, restore, clear);
  const [aiBusy, setAiBusy] = useState(false);
  const loadedAttempt = data?.attempt.id;
  const published = data?.grade.isPublished;
  useEffect(() => { if (loadedAttempt) heading.current?.focus(); }, [loadedAttempt, published]);
  const change = () => { setSaved(false); changeDraft(); }, writable = !!data?.canSave && !busy && !aiBusy;
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
  const activeQuestion = data?.activity.questions[questionIndex];
  const submittedAt = data?.attempt.submittedAt;
  const savedNotes = data?.activity.questions.flatMap((question, index) => question.feedback?.trim()
    ? [{ number: index + 1, id: question.id, prompt: question.prompt, feedback: question.feedback }] : []) ?? [];

  return <section className={`p8-grading ${styles.workspace}`} aria-label="Corrección privada del intento">
    <header className="parity-focus-top"><button disabled={!canNavigate} aria-label="Volver al historial" onClick={() => leaveEditor(onClose)}><FoxmindIcon name="arrow-left"/></button><div><strong>Corregir entrega</strong><small>{data?.activity.title}</small></div></header>
    <nav className={styles.navigation} aria-label="Navegar entre entregas">
      <div className={styles.actions}>
        <button disabled={busy || aiBusy} onClick={() => leaveEditor(() => void run(() => load()))}>Recargar corrección</button>
        {onReopen ? <button disabled={!canNavigate} onClick={() => leaveEditor(onReopen)}>Habilitar otro intento</button> : null}
        {onHistory ? <button disabled={!canNavigate} onClick={() => leaveEditor(onHistory)}>Ver intentos de este estudiante</button> : null}
        {onPrevious ? <button disabled={!canNavigate} onClick={() => leaveEditor(onPrevious)}>Anterior</button> : null}
        {onNext ? <button disabled={!canNavigate} onClick={() => leaveEditor(onNext)}>Siguiente</button> : null}
      </div>
    </nav>
    {error && !confirming ? <Notice error>{error} Tus cambios no se han confirmado. Revisá los datos o recargá la corrección.</Notice> : null}
    {!data ? error ? <button disabled={busy} onClick={() => void run(() => load())}>Recargar corrección</button> : <Notice>Cargando corrección…</Notice> : <>
      <header className={styles.reviewHeading}>
        <div className={styles.reviewPerson}><span aria-hidden="true">{data.attempt.firstName.charAt(0)}{data.attempt.lastName.charAt(0)}</span>
          <div><h4 ref={heading} tabIndex={-1}>Entrega de {data.attempt.firstName} {data.attempt.lastName}</h4>
          <p>{data.activity.title} · Intento {data.attempt.number}</p>
          {submittedAt ? <p>Recibida el <time dateTime={submittedAt}>{new Date(submittedAt).toLocaleString('es-AR', {
            timeZone: data.activity.zone, hourCycle: 'h23', dateStyle: 'medium', timeStyle: 'short',
          })}</time>{data.attempt.submittedLate ? ' · Fuera de plazo' : ''}</p> : null}
        </div></div>
        <span className={styles.state} data-tone={data.grade.isPublished ? 'published' : undefined}>
          <FoxmindIcon name={data.grade.isPublished ? 'check' : 'lock'}/>{data.grade.isPublished ? 'Publicada' : 'Corrección privada'}
        </span>
      </header>
      {data.archived ? <Notice>Aula archivada · la corrección es de solo consulta.</Notice> : null}
      <div className={styles.columns}>
        <section className={`${styles.evidence} ${styles.workEvidence}`} aria-label="Trabajo entregado">
          <h5><FoxmindIcon name="file"/>Trabajo entregado</h5>
          {data.activity.objective || data.activity.instructions ? <button type="button" className={styles.secondaryAction}
            aria-haspopup="dialog" onClick={() => setGuideOpen(true)}>Consigna y objetivo de la actividad</button> : null}
          {data.activity.type === 'ASSIGNMENT' || data.attempt.attachments.length ? <section className={styles.panel}>
            {data.attempt.practicalResponse ? <div className={styles.answerBox}><small>Respuesta escrita</small>
              <p className={styles.multiline}>{data.attempt.practicalResponse}</p></div> : null}
            {data.attempt.attachments.length ? <ul>{data.attempt.attachments.map(file => <li key={file.id}>{file.ready
              ? <a href={operations.fileUrl(file.id)} target="_blank" rel="noreferrer">Descargar {file.name}</a> : `${file.name} · No disponible`}</li>)}</ul> : null}
            {!data.attempt.practicalResponse && !data.attempt.attachments.length ? <p>Sin texto ni archivos adjuntos.</p> : null}
          </section> : null}
          {data.activity.questions.length ? <nav className={styles.gradingQuestionNav} aria-label="Respuestas del estudiante">
            {data.activity.questions.map((question, index) => <button key={question.id} type="button"
              aria-label={`Pregunta ${index + 1}`} aria-current={index === questionIndex ? 'step' : undefined}
              onClick={() => setQuestionIndex(index)}>{index + 1}</button>)}
          </nav> : null}
          {activeQuestion ? <article className={styles.answerCard} key={activeQuestion.id}>
            <h5>Pregunta {questionIndex + 1} · {activeQuestion.points.replace('.', ',')} puntos disponibles</h5>
            <p className={styles.multiline}>{activeQuestion.prompt}</p>
            <div className={styles.answerBox}><small>Respuesta del estudiante</small>
              {activeQuestion.type === 'DEVELOPMENT' ? <p className={styles.multiline}>{activeQuestion.answer.text || 'Sin respuesta'}</p>
                : <ul>{activeQuestion.options.map(option => <li key={option.id}>{option.text}{activeQuestion.answer.optionIds.includes(option.id) ? ' · Seleccionada' : ''}{option.correct ? ' · Clave correcta' : ''}</li>)}</ul>}
            </div>
            {activeQuestion.manual ? <label className={styles.scoreInput}>Puntos de la pregunta {questionIndex + 1}
              <input aria-label={`Puntos de la pregunta ${questionIndex + 1}`} inputMode="decimal" placeholder="Pendiente"
                value={(points[activeQuestion.id] ?? '').replace('.', ',')} disabled={!writable}
                onChange={e => { setPoints(previous => ({ ...previous, [activeQuestion.id]: e.target.value.replace(',', '.') })); change(); }} />
            </label> : <p>Puntos automáticos: {activeQuestion.earned
              ? activeQuestion.earned.denominator === '1' ? activeQuestion.earned.numerator : `${activeQuestion.earned.numerator}/${activeQuestion.earned.denominator}`
              : 'Pendiente'}</p>}
            {data.grade.isPublished ? activeQuestion.feedback ? <QuestionFeedback feedback={activeQuestion.feedback} /> : null
              : <label>Devolución de la pregunta {questionIndex + 1}<textarea aria-label={`Devolución de la pregunta ${questionIndex + 1}`}
                  maxLength={5000} value={comments[activeQuestion.id] ?? ''} disabled={!writable}
                  onChange={e => { setComments(previous => ({ ...previous, [activeQuestion.id]: e.target.value })); change(); }} /></label>}
          </article> : null}
        </section>

        <aside className={styles.review} aria-label="Corrección y devolución">
          <h5><FoxmindIcon name="edit"/>Evaluación</h5>
          <div className={styles.gradingTabs} role="group" aria-label="Secciones de evaluación">
            <button type="button" aria-pressed={panel === 'rubric'} onClick={() => setPanel('rubric')}>Rúbrica y nota</button>
            <button type="button" aria-pressed={panel === 'feedback'} onClick={() => setPanel('feedback')}>Devolución</button>
          </div>
          {data.canSave ? <GradingAiReview operations={aiReview} roomId={roomId} attemptId={attemptId} revision={data.revision} dirty={dirty}
            disabled={busy} onBusyChange={setAiBusy} onApplied={async () => { await load(); setSaved(true); await onChanged(); }} /> : null}

          <div className={styles.reviewPanel} hidden={panel !== 'rubric'}>
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
          </div>
          <section className={styles.evidence} hidden={panel !== 'feedback'} aria-label="Devolución para el estudiante">
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
          {data.grade.isPublished ? <PublishedGradeCorrection operations={corrections} roomId={roomId} attemptId={attemptId}
            onChanged={async () => { await load(); await onChanged(); }} /> : null}
        </aside>
      </div>
      <footer className={`${styles.footer} parity-work-footer parity-grading-footer`}>
        <p role="status">{data.grade.isPublished ? 'Calificación publicada · solo consulta.' : saved ? 'Corrección privada guardada. No se ha publicado.'
          : dirty ? 'Hay cambios sin guardar.' : 'Corrección privada: el estudiante no ve esta calificación.'}</p>
        <div className={styles.actions}>
          {data.canSave ? <button disabled={busy || aiBusy || !validInputs || feedbackLength > 5000} onClick={() => void run(async () => {
            const next = await operations.save( { revision: data.revision, overallGrade: data.activity.type === 'ASSIGNMENT' ? overall || null : null,
              overallFeedback: storedFeedback, ...(hasRubric ? { rubricMarks: rubricInputs(criteria, marks) } : {}),
              ...(supportsFinal ? { finalGradeOverride: override || null } : {}), questions: data.activity.questions.map(q => ({ questionId: q.id, points: q.manual ? points[q.id] || null : null, feedback: comments[q.id] || null })) });
            restore(next); setSaved(true); await onChanged();
          })}>{busy ? 'Guardando…' : 'Guardar corrección privada'}</button> : null}
          {data.canSave ? <button className="primary" disabled={!canPublish} onClick={() => setConfirming(true)}>Publicar calificación</button> : null}
        </div>
      </footer>
      {guideOpen ? <Dialog title="Consigna y objetivo de la actividad" onClose={() => setGuideOpen(false)}>
        {data.activity.objective ? <p className={styles.multiline}>{data.activity.objective}</p> : null}
        {data.activity.instructions ? <p className={styles.multiline}>{data.activity.instructions}</p> : null}
      </Dialog> : null}
      {confirming && data.grade.finalGrade !== null ? <Dialog className={styles.previewDialog} title="Así verá la devolución el estudiante" onClose={() => { if (!busy) setConfirming(false); }}>
        <section aria-label="Confirmar publicación de calificación" className={styles.result}>
          <FeedbackGrade grade={data.grade.finalGrade} title="Calificación"><p>Vista previa de la corrección guardada</p></FeedbackGrade>
          <FeedbackSections value={data.grade.overallFeedback} />
          <BrujulaPublishedRubric snapshot={data.grade.rubricSnapshot} marks={data.grade.rubricMarks}/>
          {savedNotes.length ? <section aria-label="Orientaciones por pregunta"><h5>Orientaciones por pregunta</h5><ol className={styles.previewNotes}>
            {savedNotes.map(note => <li key={note.id} value={note.number}><p className={styles.multiline}>{note.prompt}</p>
              <QuestionFeedback feedback={note.feedback}/></li>)}
          </ol></section> : null}
          {error ? <Notice error>{error}</Notice> : null}
          <Notice>Al publicar, el estudiante verá esta nota y devolución. La nota reemplaza la vigente de esta actividad, aunque sea menor.</Notice>
          <div className={styles.actions}><button disabled={busy} onClick={() => setConfirming(false)}>Cancelar publicación</button>
            <button className="primary" disabled={!canPublish} onClick={() => void run(async () => {
              const next = await publication.publish(data.revision);
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
