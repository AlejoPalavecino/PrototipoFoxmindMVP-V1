'use client';
import { useEffect, useState } from 'react';
import type { ClassroomClient, ProgressData } from './api.ts';
import { Notice } from './components.tsx';
import { FoxmindIcon, type IconKey } from '../shared-ui/index.ts';

const decimal = (value: string | null) => value === null ? '—' : Number(value).toLocaleString('es-AR',{maximumFractionDigits:2});
const bounded = (value: string | null) => Math.max(0, Math.min(100, Number(value) || 0));
function Metric({ number, title, value, suffix, caption, percent, icon, tone }: {
  number: string; title: string; value: string; suffix: string; caption: string; percent: number; icon: IconKey; tone: string;
}) {
  return <section className={`brujula-progress-metric ${tone}`} aria-label={title}>
    <div><small>DIMENSIÓN {number}</small><FoxmindIcon name={icon}/></div><h3>{title}</h3>
    <strong>{value}<small>{suffix}</small></strong><progress max={100} value={percent} aria-label={title}/><p>{caption}</p>
  </section>;
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
  return <section className="p8-progress brujula-progress" aria-label="Seguimiento del aprendizaje" aria-busy={loading}>
    <header className="p5-section-head"><div><h2>{studentId && data && data.scope !== 'classroom' ? `${data.firstName} ${data.lastName}` : data?.scope === 'classroom' ? 'Progreso del aula' : 'Mi progreso'}</h2>
      <p>{studentId ? 'Seguimiento académico individual.' : data?.scope === 'classroom' ? 'Indicadores de los estudiantes actuales del aula.' : 'Tus entregas y resultados publicados, junto al recorrido del aula.'}</p></div></header>
    {loading ? <Notice>Cargando progreso…</Notice> : null}
    {error ? <Notice error>{error} <button onClick={() => setRefresh(value => value + 1)}>Reintentar progreso</button></Notice> : null}
    {data ? <>
      {data.scope === 'member' && !data.currentMember ? <Notice>Historial académico conservado.</Notice> : null}
      <div className="brujula-progress-metrics">
        <Metric number="01" title="Cumplimiento de entregas" value={String(data.completion.delivered ?? 0)} suffix={`/ ${data.completion.expected ?? 0}`} caption={`${data.completion.pending ?? 0} pendientes · ${data.completion.pendingResubmissions ?? 0} reentregas pendientes`} percent={bounded(data.completion.percentage)} icon="clipboard" tone="paper"/>
        <Metric number="02" title="Rendimiento académico" value={decimal(data.performance.average)} suffix="/ 10" caption={data.performance.average === null ? 'Aún no hay calificaciones publicadas' : `${data.scope === 'classroom' ? data.performance.gradedStudents : data.performance.graded} resultados publicados`} percent={bounded(data.performance.average) * 10} icon="progress" tone="leaf"/>
        <Metric number="03" title="Avance del plan" value={`${Math.round(bounded(data.plan.percentage))}%`} suffix="" caption={`${data.plan.taught} de ${data.plan.total} temas dados en el aula`} percent={bounded(data.plan.percentage)} icon="route" tone="sun"/>
      </div>
      <div className="brujula-progress-summary"><span><i/>{data.completion.onTime ?? 0} a tiempo</span><span><i/>{data.completion.late ?? 0} tarde</span><span><i/>{data.completion.pending ?? 0} pendientes</span></div>
      {data.scope === 'classroom' ? <section aria-label="Estudiantes actuales" className="brujula-progress-register"><h3>Seguimiento individual</h3>
        <div className="brujula-progress-table"><table><thead><tr><th>Estudiante</th><th>Entregas</th><th>Promedio</th><th><span className="sr-only">Detalle</span></th></tr></thead><tbody>{data.students.map(student => <tr key={student.studentId}>
          <td><span className="brujula-progress-student"><span className="p5-avatar">{student.firstName.charAt(0)}{student.lastName.charAt(0)}</span><strong>{student.firstName} {student.lastName}</strong></span></td>
          <td>{student.completion.delivered ?? 0} / {student.completion.expected ?? 0}</td><td>{student.performance.average === null ? '—' : `${decimal(student.performance.average)} / 10`}</td>
          <td>{onOpenStudent && student.studentId ? <button className="p5-link" onClick={()=>onOpenStudent(student.studentId)}>Ver ficha <span aria-hidden="true">›</span></button> : null}</td>
        </tr>)}</tbody></table></div>{!data.students.length ? <p className="classroom-inline-empty">Todavía no hay estudiantes. Los estudiantes que se sumen al aula aparecerán acá.</p> : null}
      </section> : <section className="brujula-progress-register" aria-label="Actividades del seguimiento"><h3>Registro de actividades</h3>
        {!data.activities.length ? <p className="classroom-inline-empty">Sin registros académicos. Los resultados publicados se reunirán acá.</p> : <ul className="brujula-progress-activities">{data.activities.map(activity => <li key={activity.id}>
          <div><strong>{activity.title}</strong><small>{!activity.expected ? 'Solo consulta: no se cuenta como pendiente' : activity.firstSubmission ? `Entregada · ${activity.firstSubmission.late ? 'Tarde' : 'A tiempo'}` : 'Pendiente de entrega'}{activity.pendingResubmission ? ' · Reentrega pendiente' : ''}</small></div>
          <span>{activity.grade === null ? 'Sin calificación publicada' : `${decimal(activity.grade)} / 10`}</span>{onOpenActivity && activity.id ? <button className="p5-link" onClick={()=>onOpenActivity(activity.id)}>Ver actividad <span aria-hidden="true">›</span></button> : null}
        </li>)}</ul>}
      </section>}
    </> : null}
  </section>;
}
