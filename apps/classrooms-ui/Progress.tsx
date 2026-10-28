'use client';
import { useEffect, useState } from 'react';
import type { ClassroomClient, ProgressData } from './api.ts';
import { Notice } from './components.tsx';

const decimal = (value: string) => value.replace('.', ',');
export function Progress({ api, classroomId, studentId }: { api: ClassroomClient; classroomId: string; studentId?: string }) {
  const [data, setData] = useState<ProgressData | null>(null), [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0), [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setData(null); setError('');
    const path = studentId ? `/${classroomId}/members/${studentId}/progress` : `/${classroomId}/progress`;
    void api.call<ProgressData>(path, undefined, undefined, controller.signal).then(value => {
      if (!controller.signal.aborted) setData(value);
    }).catch((e: Error) => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [api, classroomId, studentId, refresh]);
  return <section className="p8-progress" aria-label="Seguimiento del aprendizaje" aria-busy={loading}>
    <header className="p5-section-head">
      <h2>{studentId ? 'Progreso individual' : data?.scope === 'classroom' ? 'Progreso del aula' : 'Mi progreso'}</h2>
      <button disabled={loading} onClick={() => setRefresh(value => value + 1)}>Actualizar progreso</button>
    </header>
    {loading ? <Notice>Cargando progreso…</Notice> : null}
    {error ? <Notice error>{error} <button onClick={() => setRefresh(value => value + 1)}>Reintentar progreso</button></Notice> : null}
    {data ? <>
      {data.scope === 'member' && !data.currentMember ? <Notice>Registro histórico: no se incluye en los indicadores actuales del aula.</Notice> : null}
      <div className="p8-progress-metrics">
        <section aria-label="Cumplimiento de entregas">
          <h3>Cumplimiento de entregas</h3>
          {data.completion.percentage === null ? <p>{data.completion.emptyLabel}</p> : <>
            <p className="p8-progress-value">{decimal(data.completion.percentage)}%</p>
            <p>{data.completion.delivered} de {data.completion.expected} actividades esperadas entregadas</p>
            <p>Pendientes: {data.completion.pending}</p>
          </>}
          <p>A tiempo: {data.completion.onTime} · Tarde: {data.completion.late}</p>
          <p>Reentregas pendientes: {data.completion.pendingResubmissions}</p>
          <small>Se cuenta cada actividad una vez. La puntualidad corresponde a su primera entrega confirmada.</small>
        </section>
        <section aria-label="Rendimiento académico">
          <h3>Rendimiento académico</h3>
          <p className="p8-progress-value">{data.performance.average === null ? 'Sin calificaciones publicadas' : `Promedio: ${decimal(data.performance.average)}`}</p>
          <p>{data.scope === 'classroom' ? `${data.performance.gradedStudents} estudiantes con calificaciones publicadas` : `${data.performance.graded} ${data.performance.graded === 1 ? 'actividad' : 'actividades'} con calificación publicada`}</p>
          <small>Solo calificaciones publicadas vigentes. El trabajo pendiente no equivale a cero.</small>
        </section>
        <section aria-label="Avance del plan de estudio">
          <h3>Avance del plan de estudio</h3>
          <p>{data.plan.taught} de {data.plan.total} temas dictados{data.plan.percentage === null ? '' : ` · ${decimal(data.plan.percentage)}%`}</p>
          <small>Los temas dictados son independientes de las entregas y las calificaciones.</small>
        </section>
      </div>
      {data.scope === 'classroom' ? <section aria-label="Estudiantes actuales">
        <h3>Estudiantes actuales ({data.studentCount})</h3>
        {!data.students.length ? <p>No hay estudiantes actuales.</p> : <ul className="p8-progress-students">
          {data.students.map(student => <li key={student.studentId}>
            <strong>{student.firstName} {student.lastName}</strong>
            <p>{student.completion.percentage === null ? student.completion.emptyLabel
              : `${student.completion.delivered}/${student.completion.expected} entregadas · ${decimal(student.completion.percentage)}%`}</p>
            <p>{student.performance.average === null ? 'Sin calificaciones publicadas' : `Promedio: ${decimal(student.performance.average)}`}</p>
          </li>)}
        </ul>}
        <p>Las salidas y sus registros se consultan por separado en Historial.</p>
      </section> : <section aria-label="Actividades del seguimiento">
        <h3>Actividades del seguimiento</h3>
        {!data.activities.length ? <p>No hay actividades publicadas para este seguimiento.</p> : <ul className="p8-progress-activities">
          {data.activities.map(activity => <li key={activity.id}>
            <strong>{activity.title}</strong>
            <p>{!activity.expected ? 'Solo consulta: no se cuenta como pendiente' : activity.firstSubmission
              ? `Entregada · ${activity.firstSubmission.late ? 'Tarde' : 'A tiempo'}` : 'Pendiente de entrega'}</p>
            {activity.firstSubmission ? <p>Primera entrega: {new Date(activity.firstSubmission.submittedAt).toLocaleString('es-AR', { hourCycle: 'h23', dateStyle: 'short', timeStyle: 'short' })}</p> : null}
            {activity.pendingResubmission ? <p>Reentrega pendiente; la entrega anterior se conserva.</p> : null}
            <p>{activity.grade === null ? 'Sin calificación publicada' : `Calificación vigente: ${decimal(activity.grade)}`}</p>
          </li>)}
        </ul>}
      </section>}
    </> : null}
  </section>;
}
