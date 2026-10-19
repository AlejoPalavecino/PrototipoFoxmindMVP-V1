'use client';
import { useEffect, useState } from 'react';
import type { ClassroomClient, PublishedResultData } from './api.ts';
import { Notice } from './components.tsx';

export function PublishedResult({ api, roomId, attemptId }: { api: ClassroomClient; roomId: string; attemptId: string }) {
  const [data, setData] = useState<PublishedResultData | null>(null), [error, setError] = useState(''), [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setData(null); setError('');
    void api.call<PublishedResultData>(`/${roomId}/attempts/${attemptId}/result`, 'GET', undefined, controller.signal)
      .then(next => { if (!controller.signal.aborted) setData(next); }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [api, roomId, attemptId, refresh]);
  return <section className="p8-result" aria-label="Resultado publicado del intento">
    <h4>Resultado del intento</h4>
    {error ? <Notice error>{error} No se pudo consultar el resultado.</Notice> : !data ? <Notice>Cargando resultado…</Notice>
      : data.status === 'pending' ? <Notice>Resultado pendiente de publicación.</Notice> : <>
        <p className="p8-final-grade">Calificación publicada: {data.grade.finalGrade.replace('.', ',')}</p>
        <p>{data.grade.isEffective ? 'Calificación vigente de esta actividad.' : 'Resultado histórico: no es la calificación vigente.'}</p>
        <p>Publicada el <time dateTime={data.grade.publishedAt}>{new Date(data.grade.publishedAt).toLocaleString('es')}</time></p>
        {data.grade.overallFeedback ? <p className="p7-multiline">{data.grade.overallFeedback}</p> : null}
        {data.questions.map((q, index) => <article key={q.id}><h5>Pregunta {index + 1}</h5><p className="p7-multiline">{q.prompt}</p>
          {q.type === 'DEVELOPMENT' ? <p className="p7-multiline">{q.answer.text || 'Sin respuesta'}</p>
            : <ul>{q.answer.selectedOptions.map(option => <li key={option.id}>{option.text}</li>)}</ul>}
          <p>Puntos obtenidos: {q.earned.denominator === '1' ? q.earned.numerator : `${q.earned.numerator}/${q.earned.denominator}`} de {q.points.replace('.', ',')}</p>
          {q.feedback ? <p className="p7-multiline">{q.feedback}</p> : null}</article>)}
        <ul>{data.attachments.map(file => <li key={file.id}>{file.ready
          ? <a href={api.fileUrl(file.id)} target="_blank" rel="noreferrer">Descargar {file.name}</a> : `${file.name} · No disponible`}</li>)}</ul>
      </>}
    <button onClick={() => setRefresh(value => value + 1)}>Actualizar resultado</button>
  </section>;
}
