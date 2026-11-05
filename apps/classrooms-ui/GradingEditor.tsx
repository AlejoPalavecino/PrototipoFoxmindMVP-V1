'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClassroomClient, GradingData } from './api.ts';
import { Notice } from './components.tsx';
import { PublishedGradeCorrection } from './PublishedGradeCorrection.tsx';
import { GradingAiReview } from './GradingAiReview.tsx';
import { BrujulaRubricScoring, BrujulaPublishedRubric, liveRubricSuggestion, rubricInputs, validRubricScore } from './brujula-grading-rubric.tsx';

export function GradingEditor({ api, roomId, attemptId, onClose, onChanged }: {
  api: ClassroomClient; roomId: string; attemptId: string; onClose: () => void; onChanged: () => Promise<void>;
}) {
  const path = `/${roomId}/attempts/${attemptId}/grading`;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [attemptId]);
  const [data, setData] = useState<GradingData | null>(null), [overall, setOverall] = useState(''), [feedback, setFeedback] = useState('');
  const [marks, setMarks] = useState<Record<number, string>>({}), [override, setOverride] = useState<string | null>(null);
  const [points, setPoints] = useState<Record<string, string>>({}), [comments, setComments] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [saved, setSaved] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [dirty, setDirty] = useState(false), [confirming, setConfirming] = useState(false);
  const restore = useCallback((next: GradingData) => {
    setData(next); setOverall((next.grade.calculatedGrade !== undefined ? next.grade.calculatedGrade : next.grade.finalGrade) ?? ''); setFeedback(next.grade.overallFeedback ?? '');
    setMarks(Object.fromEntries((next.grade.rubricMarks ?? []).map(mark => [mark.criterionIndex, mark.score ?? ''])));
    setOverride(next.grade.finalGradeOverride ?? null);
    setPoints(Object.fromEntries(next.activity.questions.map(q => [q.id, q.manualPoints ?? ''])));
    setComments(Object.fromEntries(next.activity.questions.map(q => [q.id, q.feedback ?? ''])));
    setDirty(false); setConfirming(false);
  }, []);
  const load = useCallback(async (signal?: AbortSignal) => restore(await api.call<GradingData>(path, 'GET', undefined, signal)), [api, path, restore]);
  useEffect(() => { const controller = new AbortController(); setData(null); setSaved(false);
    void load(controller.signal).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort(); }, [load]);
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
  return <section className="p8-grading brujula-grading" aria-label="Corrección privada del intento">
    <header><h4 ref={heading} tabIndex={-1}>Corrección del intento {data?.attempt.number ?? ''}</h4><button disabled={busy || aiBusy} onClick={onClose}>Volver al historial</button></header>
    {error ? <Notice error>{error} Tus cambios no se han confirmado. Podés revisar o recargar la corrección.</Notice> : null}
    {!data ? <Notice>Cargando corrección…</Notice> : <>
      <h4>{data.activity.title} · {data.attempt.firstName} {data.attempt.lastName}</h4>
      <div className="brujula-grading-layout"><section className="brujula-grading-proof" aria-label="Trabajo entregado"><h5>Trabajo entregado</h5>
      <ul>{data.attempt.attachments.map(file => <li key={file.id}>{file.ready
        ? <a href={api.fileUrl(file.id)} target="_blank" rel="noreferrer">Descargar {file.name}</a> : `${file.name} · No disponible`}</li>)}</ul>
      {data.activity.type === 'ASSIGNMENT' ? supportsFinal ? null : <label>Calificación general · 0 a 10<input aria-label="Calificación general" inputMode="decimal" placeholder="Pendiente" value={overall.replace('.', ',')}
        disabled={!writable} onChange={e => { setOverall(e.target.value.replace(',', '.')); change(); }} /></label> : data.activity.questions.map((question, index) => <article key={question.id}>
        <h5>Pregunta {index + 1} · {question.points.replace('.', ',')} puntos disponibles</h5><p className="p7-multiline">{question.prompt}</p>
        {question.type === 'DEVELOPMENT' ? <p className="p7-multiline">{question.answer.text || 'Sin respuesta · cero puntos'}</p>
          : <ul>{question.options.map(option => <li key={option.id}>{question.answer.optionIds.includes(option.id!) ? 'Seleccionada · ' : ''}{option.text}{option.correct ? ' · Correcta' : ''}</li>)}</ul>}
        {question.manual ? <label>Puntos de la pregunta {index + 1}<input aria-label={`Puntos de la pregunta ${index + 1}`} inputMode="decimal" placeholder="Pendiente" value={(points[question.id] ?? '').replace('.', ',')}
          disabled={!writable} onChange={e => { setPoints(previous => ({ ...previous, [question.id]: e.target.value.replace(',', '.') })); change(); }} /></label>
          : <p>Puntos automáticos: {question.earned ? question.earned.denominator === '1' ? question.earned.numerator : `${question.earned.numerator}/${question.earned.denominator}` : 'Pendiente'}</p>}
        <label>Devolución de la pregunta {index + 1}<textarea aria-label={`Devolución de la pregunta ${index + 1}`} maxLength={5000} value={comments[question.id] ?? ''}
          disabled={!writable} onChange={e => { setComments(previous => ({ ...previous, [question.id]: e.target.value })); change(); }} /></label>
      </article>)}
      </section><div className="brujula-grading-panel">
      {data.grade.isPublished ? <BrujulaPublishedRubric snapshot={data.grade.rubricSnapshot} marks={data.grade.rubricMarks}/> : hasRubric ? <BrujulaRubricScoring criteria={criteria} marks={marks} disabled={!writable}
        onChange={(index, score) => { setMarks(previous => ({ ...previous, [index]: score })); change(); }}/> : null}
      {!data.grade.isPublished && supportsFinal ? <div className="brujula-final-editor"><label>Nota final · 0 a 10<input aria-label="Nota final" inputMode="decimal" disabled={!writable}
        aria-invalid={!!override && !validRubricScore(override) || undefined} value={displayedFinal.replace('.', ',')} placeholder="Pendiente"
        onChange={event => { setOverride(event.target.value.replace(',', '.')); change(); }}/></label>
        <p>{override !== null ? 'Nota definida por vos. La sugerencia y los puntajes se conservan.' : hasRubric ? 'La sugerencia no cambia la nota final hasta que elijas usarla. También podés escribir tu nota.' : 'Podés definir la nota final sin modificar los puntos de las preguntas.'}</p>
        {hasRubric ? <button type="button" disabled={!writable || suggested === null} onClick={() => { if (suggested !== null) { setOverride(suggested); change(); } }}>Usar nota sugerida</button> : null}
        {override !== null ? <button type="button" disabled={!writable} onClick={() => { setOverride(null); change(); }}>Usar nota calculada</button> : null}
        {!!override && !validRubricScore(override) ? <p role="alert">Ingresá una nota de 0 a 10, con hasta dos decimales.</p> : null}
      </div> : null}
      <Notice>{data.grade.isPublished ? 'Calificación publicada · solo consulta.' : 'Corrección privada: el estudiante no ve esta calificación. Guardar no publica ni envía notificaciones.'}</Notice>
      {data.archived ? <Notice>Aula archivada · la corrección es de solo consulta.</Notice> : null}
      {data.canSave ? <GradingAiReview api={api} roomId={roomId} attemptId={attemptId} revision={data.revision} dirty={dirty}
        disabled={busy} onBusyChange={setAiBusy} onApplied={async () => { await load(); await onChanged(); }} /> : null}
      <p className="p8-final-grade">{data.grade.finalGrade === null ? 'Calificación pendiente de corrección manual' : `${data.grade.isPublished ? 'Calificación publicada' : 'Nota guardada'}: ${data.grade.finalGrade.replace('.', ',')}`}</p>
      <label>Devolución general opcional<textarea aria-label="Devolución general opcional" maxLength={5000} value={feedback} disabled={!writable}
        onChange={e => { setFeedback(e.target.value); change(); }} /></label>
      <p>Los puntos y la calificación manual admiten hasta dos decimales. Dejá un campo vacío si la corrección sigue pendiente. Un cero es una calificación válida.</p>
      <footer className="p5-form-footer"><button disabled={busy || aiBusy} onClick={() => void run(() => load())}>Recargar corrección</button>
        {data.canSave ? <button className="primary" disabled={busy || aiBusy || !validInputs} onClick={() => void run(async () => {
          const next = await api.call<GradingData>(path, 'POST', { revision: data.revision, overallGrade: data.activity.type === 'ASSIGNMENT' ? overall || null : null,
            overallFeedback: feedback || null, ...(hasRubric ? { rubricMarks: rubricInputs(criteria, marks) } : {}),
            ...(supportsFinal ? { finalGradeOverride: override || null } : {}), questions: data.activity.questions.map(q => ({ questionId: q.id, points: q.manual ? points[q.id] || null : null, feedback: comments[q.id] || null })) });
          restore(next); setSaved(true); await onChanged();
        })}>{busy ? 'Guardando…' : 'Guardar corrección privada'}</button> : null}
        {data.canSave ? <button disabled={!canPublish} onClick={() => setConfirming(true)}>Publicar calificación</button> : null}</footer>
      {dirty ? <Notice>Hay cambios sin guardar. Guarda la corrección privada antes de publicar.</Notice> : null}
      {saved ? <Notice>Corrección privada guardada. No se ha publicado.</Notice> : null}
      {confirming ? <section aria-label="Confirmar publicación de calificación"><h4>Publicar calificación y devolución</h4>
        <p>El estudiante verá la calificación guardada y su devolución. Esta publicación reemplaza la calificación vigente de la actividad, aunque sea menor.</p>
        <div className="p5-actions"><button disabled={busy} onClick={() => setConfirming(false)}>Cancelar publicación</button>
          <button className="primary" disabled={!canPublish} onClick={() => void run(async () => {
            const next = await api.call<GradingData>(`/${roomId}/attempts/${attemptId}/publish-grade`, 'POST', { revision: data.revision, confirm: true });
            restore(next); await onChanged();
          })}>Confirmar publicación</button></div>
      </section> : null}
      {data.grade.isPublished ? <PublishedGradeCorrection api={api} roomId={roomId} attemptId={attemptId}
        onChanged={async () => { await load(); await onChanged(); }} /> : null}
      </div></div>
    </>}
  </section>;
}
