'use client';
import { useEffect, useState, type ReactNode } from 'react';
import type { ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import type { PublishedResultData } from '../../../../../../src/core/contracts/grading.ts';
import { BrujulaPublishedRubric } from './brujula-grading-rubric.tsx';
import { FeedbackGrade, FeedbackSections, QuestionFeedback } from './FeedbackDisplay.tsx';
import styles from './grading.module.css';
import { FoxmindIcon } from '../../../../../shared-ui/index.ts';
import { Dialog, Notice } from '../../../../../shared-ui/feedback.tsx';

export function PublishedResult({ api, roomId, attemptId, zone, pendingContent, receipt, audience = 'student' }: {
  api: ClassroomClient; roomId: string; attemptId: string; zone?: string; pendingContent?: ReactNode; receipt?: ReactNode; audience?: 'teacher' | 'student';
}) {
  const [data, setData] = useState<PublishedResultData | null>(null), [error, setError] = useState(''), [refresh, setRefresh] = useState(0);
  const [panel, setPanel] = useState<'answers' | 'receipt' | null>(null);
  useEffect(() => {
    const controller = new AbortController(); setData(null); setError(''); setPanel(null);
    void api.call<PublishedResultData>(`/${roomId}/attempts/${attemptId}/result`, 'GET', undefined, controller.signal)
      .then(next => { if (!controller.signal.aborted) setData(next); }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [api, roomId, attemptId, refresh]);
  return <section className={`p8-result ${audience === 'student' ? 'parity-student-result' : ''} ${styles.result}`} aria-label="Resultado publicado del intento">
    {data?.status !== 'published' && !receipt ? <h4>{audience === 'teacher' ? 'Calificación y devolución del estudiante' : 'Tu calificación y devolución'}</h4> : null}
    {error ? <Notice error>{error} No se pudo consultar el resultado.</Notice> : !data ? <Notice>Cargando resultado…</Notice>
      : data.status === 'pending' ? <>{receipt}<Notice>Resultado pendiente de publicación. {audience === 'teacher' ? 'La entrega está recibida. Revisala y publicá la devolución cuando esté lista para el estudiante.' : 'Tu entrega está recibida; cuando el docente publique la devolución, la vas a encontrar acá y en tus notificaciones.'}</Notice>{pendingContent}</> : <>
        <FeedbackGrade grade={data.grade.finalGrade} title="Calificación publicada">
          <span className={styles.publishedPill}><FoxmindIcon name="check"/>Devolución publicada</span>
          <p>{data.grade.isEffective ? 'Calificación vigente de esta actividad.' : 'Resultado histórico: no es la calificación vigente.'}</p>
          <small>Publicada el <time dateTime={data.grade.publishedAt}>{new Date(data.grade.publishedAt).toLocaleString('es-AR', { timeZone: zone, hourCycle: 'h23', dateStyle: 'medium', timeStyle: 'short' })}</time></small></FeedbackGrade>
        <div className={`${styles.resultOverview} parity-result-overview`}>
          <section className={styles.result} aria-label="Devolución del docente"><h5>Devolución del docente</h5>
            <FeedbackSections value={data.grade.overallFeedback}/></section>
          {data.grade.rubricSnapshot?.length ? <BrujulaPublishedRubric snapshot={data.grade.rubricSnapshot} marks={data.grade.rubricMarks}/> : null}
        </div>
        {data.questions.length || receipt ? <div className={styles.actions}>
          {data.questions.length ? <button type="button" aria-haspopup="dialog" onClick={() => setPanel('answers')}>Ver respuestas y orientación por pregunta</button> : null}
          {receipt ? <button type="button" aria-haspopup="dialog" onClick={() => setPanel('receipt')}>Consultar comprobante de entrega</button> : null}
        </div> : null}
        {panel === 'answers' ? <Dialog title="Respuestas y orientación por pregunta" className={styles.resultAnswers} onClose={() => setPanel(null)}>{data.questions.map((q, index) => <article className={styles.resultQuestion} key={q.id}><header><h5>Pregunta {index + 1}</h5>
          <span>{q.earned.denominator === '1' ? q.earned.numerator : `${q.earned.numerator}/${q.earned.denominator}`} / {q.points.replace('.', ',')} puntos</span></header><p className="p7-multiline">{q.prompt}</p>
          <h6>{audience === 'teacher' ? 'Respuesta del estudiante' : 'Tu respuesta'}</h6>
          {q.type === 'DEVELOPMENT' ? <p className="p7-multiline">{q.answer.text || 'Sin respuesta'}</p>
            : <ul>{q.answer.selectedOptions.map(option => <li key={option.id}>{option.text}</li>)}</ul>}
          {q.feedback ? <QuestionFeedback feedback={q.feedback} /> : null}</article>)}</Dialog> : null}
        {data.attachments.length ? <><h5>Archivos entregados</h5><ul>{data.attachments.map(file => <li key={file.id}>{file.ready
          ? <a href={api.fileUrl(file.id)} target="_blank" rel="noreferrer">Descargar {file.name}</a> : `${file.name} · No disponible`}</li>)}</ul></> : null}
        {panel === 'receipt' && receipt ? <Dialog title="Comprobante de entrega" onClose={() => setPanel(null)}>{receipt}</Dialog> : null}
      </>}
    <button onClick={() => setRefresh(value => value + 1)}>Actualizar resultado</button>
  </section>;
}
