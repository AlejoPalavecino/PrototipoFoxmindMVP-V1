'use client';
import { useEffect, useState } from 'react';
import type { ClassroomClient, ProgressData } from './api.ts';
import { Notice } from './components.tsx';
import { EntryIcon } from '../shared-ui/EntryIcon';

const decimal = (value: string) => value.replace('.', ',');
const bounded = (value: string | null) => Math.max(0, Math.min(100, Number(value) || 0));
function Ring({ value, label, percent = true }: { value: string; label: string; percent?: boolean }) {
  return <div className="classroom-progress-value">
    <strong>{decimal(value)}{percent ? '%' : <small> / 10</small>}</strong><span>{label}</span>
    {percent ? <progress max={100} value={bounded(value)} aria-label={label} /> : null}
  </div>;
}
export function Progress({ api, classroomId, studentId, onOpenActivity, onOpenStudent }: { api: ClassroomClient; classroomId: string; studentId?: string; onOpenActivity?: (id: string) => void; onOpenStudent?: (studentId: string) => void }) {
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
      <div><h2><EntryIcon name="list" /> {studentId ? 'Progreso individual' : data?.scope === 'classroom' ? 'Progreso del aula' : 'Mi progreso'}</h2><p>Tres miradas distintas para acompañar el aprendizaje.</p></div>
      <button disabled={loading} onClick={() => setRefresh(value => value + 1)}>Actualizar progreso</button>
    </header>
    {loading ? <Notice>Cargando progreso…</Notice> : null}
    {error ? <Notice error>{error} <button onClick={() => setRefresh(value => value + 1)}>Reintentar progreso</button></Notice> : null}
    {data ? <>
      {data.scope === 'member' && !data.currentMember ? <Notice>Registro histórico: no se incluye en los indicadores actuales del aula.</Notice> : null}
      <div className="p8-progress-metrics">
        <section aria-label="Cumplimiento de entregas">
          <h3><EntryIcon name="grid" /> Cumplimiento de entregas</h3>
          <div className="p8-metric-body">
            {data.completion.percentage === null ? <p>{data.completion.emptyLabel}</p> : <Ring value={data.completion.percentage} label="entregadas" />}
            <div className="p8-metric-details">
              <p>{data.completion.delivered} de {data.completion.expected} actividades esperadas entregadas</p>
              <p><span className="p8-dot is-green" /> Entregadas <b>{data.completion.delivered}</b></p>
              <p><span className="p8-dot is-yellow" /> Pendientes <b>{data.completion.pending}</b></p>
              <p><span className="p8-dot is-orange" /> A tiempo <b>{data.completion.onTime}</b></p>
              <p><span className="p8-dot is-red" /> Tarde <b>{data.completion.late}</b></p>
              <p><span className="p8-dot" /> Reentregas pendientes <b>{data.completion.pendingResubmissions}</b></p>
            </div>
          </div>
          <small>Se cuenta cada actividad una vez. La puntualidad corresponde a su primera entrega confirmada.</small>
        </section>
        <section aria-label="Rendimiento académico">
          <h3><EntryIcon name="plus-circle-fill" /> Rendimiento académico</h3>
          <p className="classroom-metric-caption">Calificaciones publicadas</p>
          <div className="p8-metric-body">
            {data.performance.average === null ? <p>Sin calificaciones publicadas</p> : <Ring value={data.performance.average} label="promedio" percent={false} />}
            <div className="p8-metric-details"><p>{data.scope === 'classroom' ? `${data.performance.gradedStudents} estudiantes con calificaciones publicadas` : `${data.performance.graded} ${data.performance.graded === 1 ? 'actividad' : 'actividades'} con calificación publicada`}</p></div>
          </div>
          <small>Solo calificaciones publicadas vigentes. El trabajo pendiente no equivale a cero.</small>
        </section>
        <section aria-label="Avance del plan de estudio">
          <h3><EntryIcon name="list" /> Avance del plan de estudio</h3>
          <p>{data.plan.taught} de {data.plan.total} temas dictados{data.plan.percentage === null ? '' : ` · ${decimal(data.plan.percentage)}%`}</p>
          {data.plan.percentage !== null ? <progress className="p8-plan-bar" max={100} value={bounded(data.plan.percentage)} aria-label="Temas dictados" /> : null}
          <p>Temas dictados: {data.plan.taught}</p><p>Temas pendientes: {data.plan.total - data.plan.taught}</p>
          <small>Los temas dictados son independientes de las entregas y las calificaciones.</small>
        </section>
      </div>
      {data.scope === 'classroom' ? <section aria-label="Estudiantes actuales"><div className="p8-progress-lower"><div>
        <h3>Estudiantes actuales ({data.studentCount})</h3>
        {!data.students.length ? <p>No hay estudiantes actuales.</p> : <><div className="p8-students-head" aria-hidden="true"><span>Estudiante</span><span>Cumplimiento de entregas</span><span>Promedio</span><span>Estado de entregas</span></div><ul className="p8-progress-students">
          {data.students.map(student => <li key={student.studentId}>
            <strong><span className="p8-student-avatar">{student.firstName.charAt(0)}{student.lastName.charAt(0)}</span>{student.firstName} {student.lastName}</strong>
            <div className="p8-student-completion">{student.completion.percentage === null ? student.completion.emptyLabel : <>
              <progress max={100} value={bounded(student.completion.percentage)} aria-label={`Entregas de ${student.firstName} ${student.lastName}`} />
              <span>{student.completion.delivered}/{student.completion.expected} · {decimal(student.completion.percentage)}%</span>
            </>}</div>
            <p>{student.performance.average === null ? 'Sin calificaciones publicadas' : `Promedio: ${decimal(student.performance.average)}`}</p>
            <p><span className={`p8-student-state ${student.completion.pending || student.completion.pendingResubmissions ? 'is-pending' : student.completion.expected === 0 ? 'is-empty' : 'is-current'}`}>
              {student.completion.pending || student.completion.pendingResubmissions ? 'Pendiente' : student.completion.expected === 0 ? 'Sin actividades' : 'Al día'}
            </span>{onOpenStudent && student.studentId ? <button onClick={() => onOpenStudent(student.studentId)}>Ver seguimiento</button> : null}</p>
          </li>)}
        </ul></>}
        <p>Las salidas y sus registros se consultan por separado en Historial.</p>
      </div><aside className="p8-progress-guidance"><h3>Sugerencia para acompañar</h3><p>{data.plan.total === 0 ? 'Todavía no hay temas en el plan de estudio.' : data.plan.taught === 0 ? 'Aún no se dictaron temas del plan de estudio en esta aula.' : `Se dictaron ${data.plan.taught} de ${data.plan.total} temas del plan de estudio.`}</p><p>Consultá el plan para acompañar el avance de tus estudiantes.</p></aside></div></section> : <section aria-label="Actividades del seguimiento">
        <h3>Actividades del seguimiento</h3>
        {!data.activities.length ? <p>No hay actividades publicadas para este seguimiento.</p> : <ul className="p8-progress-activities">
          {data.activities.map(activity => <li key={activity.id}>
            <strong>{activity.title}</strong>
            <p>{!activity.expected ? 'Solo consulta: no se cuenta como pendiente' : activity.firstSubmission
              ? `Entregada · ${activity.firstSubmission.late ? 'Tarde' : 'A tiempo'}` : 'Pendiente de entrega'}</p>
            {activity.firstSubmission ? <p>Primera entrega: {new Date(activity.firstSubmission.submittedAt).toLocaleString('es-AR', { hourCycle: 'h23', dateStyle: 'short', timeStyle: 'short' })}</p> : null}
            {activity.pendingResubmission ? <p>Reentrega pendiente; la entrega anterior se conserva.</p> : null}
            <p>{activity.grade === null ? 'Sin calificación publicada' : `Calificación vigente: ${decimal(activity.grade)}`}</p>
            {onOpenActivity && activity.id ? <button onClick={() => onOpenActivity(activity.id)}>Ver actividad</button> : null}
          </li>)}
        </ul>}
      </section>}
    </> : null}
  </section>;
}
