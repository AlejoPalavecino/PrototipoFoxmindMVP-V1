'use client';
import { useEffect, useState, type ReactNode } from 'react';
import type { ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import type { PublishedResultData } from '../../../../../../src/core/contracts/grading.ts';
import { BrujulaPublishedRubric } from './brujula-grading-rubric.tsx';
import { Notice } from '../../../../../shared-ui/feedback.tsx';

export function PublishedResult({ api, roomId, attemptId, zone, pendingContent }: {
  api: ClassroomClient; roomId: string; attemptId: string; zone?: string; pendingContent?: ReactNode;
}) {
  const [data, setData] = useState<PublishedResultData | null>(null), [error, setError] = useState(''), [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setData(null); setError('');
    void api.call<PublishedResultData>(`/${roomId}/attempts/${attemptId}/result`, 'GET', undefined, controller.signal)
      .then(next => { if (!controller.signal.aborted) setData(next); }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [api, roomId, attemptId, refresh]);
  return <section className="p8-result" aria-label="Resultado publicado del intento">
    <h4>Tu calificación y devolución</h4>
    {error ? <Notice error>{error} No se pudo consultar el resultado.</Notice> : !data ? <Notice>Cargando resultado…</Notice>
      : data.status === 'pending' ? <><Notice>Resultado pendiente de publicación. Tu entrega está recibida; cuando el docente publique la devolución, la vas a encontrar acá y en tus notificaciones.</Notice>{pendingContent}</> : <>
        <div className="student-grade-summary"><p className="p8-final-grade"><span>Calificación publicada</span><strong>{data.grade.finalGrade.replace('.', ',')} <small>/ 10</small></strong></p>
          <p>{data.grade.isEffective ? 'Calificación vigente de esta actividad.' : 'Resultado histórico: no es la calificación vigente.'}</p>
          <small>Publicada el <time dateTime={data.grade.publishedAt}>{new Date(data.grade.publishedAt).toLocaleString('es-AR', { timeZone: zone, hourCycle: 'h23', dateStyle: 'medium', timeStyle: 'short' })}</time></small></div>
        <BrujulaPublishedRubric snapshot={data.grade.rubricSnapshot} marks={data.grade.rubricMarks}/>
        {data.grade.overallFeedback ? <div className="student-feedback"><h5>Devolución del docente</h5><p className="p7-multiline">{data.grade.overallFeedback}</p></div> : null}
        {data.questions.map((q, index) => <article className="student-result-question" key={q.id}><header><h5>Pregunta {index + 1}</h5>
          <span>{q.earned.denominator === '1' ? q.earned.numerator : `${q.earned.numerator}/${q.earned.denominator}`} / {q.points.replace('.', ',')} puntos</span></header><p className="p7-multiline">{q.prompt}</p>
          <h6>Tu respuesta</h6>
          {q.type === 'DEVELOPMENT' ? <p className="p7-multiline">{q.answer.text || 'Sin respuesta'}</p>
            : <ul>{q.answer.selectedOptions.map(option => <li key={option.id}>{option.text}</li>)}</ul>}
          {q.feedback ? <div className="student-feedback"><h6>Para seguir aprendiendo</h6><p className="p7-multiline">{q.feedback}</p></div> : null}</article>)}
        {data.attachments.length ? <><h5>Archivos entregados</h5><ul>{data.attachments.map(file => <li key={file.id}>{file.ready
          ? <a href={api.fileUrl(file.id)} target="_blank" rel="noreferrer">Descargar {file.name}</a> : `${file.name} · No disponible`}</li>)}</ul></> : null}
      </>}
    <button onClick={() => setRefresh(value => value + 1)}>Actualizar resultado</button>
  </section>;
}
