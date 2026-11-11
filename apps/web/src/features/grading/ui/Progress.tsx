'use client';
import { useEffect, useState } from 'react';
import type { ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import type { ProgressActivity, ProgressData } from '../../../../../../src/core/contracts/grading.ts';
import { Notice } from '../../../../../shared-ui/feedback.tsx';
import { FoxmindIcon, type IconKey } from '../../../../../shared-ui/index.ts';

import styles from './grading.module.css';

const decimal = (value: string | null) => value === null ? '—' : Number(value).toLocaleString('es-AR',{maximumFractionDigits:2});
const bounded = (value: string | null) => Math.max(0, Math.min(100, Number(value) || 0));
function Metric({ title, value, suffix, caption, percent, icon, tone }: {
  title: string; value: string; suffix: string; caption: string; percent: number | null; icon: IconKey; tone: string;
}) {
  return <section className={styles.metric} data-tone={tone} aria-label={title}>
    <h3><FoxmindIcon name={icon}/>{title}</h3>
    <strong>{value}<small>{suffix}</small></strong>{percent !== null ? <progress max={100} value={percent} aria-label={title}/> : null}<p>{caption}</p>
  </section>;
}
const progressType = {
  ASSIGNMENT: 'Trabajo práctico', QUESTIONNAIRE: 'Cuestionario', EVALUATION: 'Evaluación',
};

function studentState(activity: ProgressActivity): keyof typeof progressState {
  if (activity.pendingResubmission) return 'resubmission';
  if (activity.grade !== null) return 'published';
  if (activity.firstSubmission) return 'submitted';
  return activity.expected ? 'pending' : 'readOnly';
}

const progressState = {
  resubmission: { label: 'Reentrega pendiente', action: 'Ver reentrega' },
  pending: { label: 'Pendiente de entrega', action: 'Abrir actividad' },
  submitted: { label: 'Esperando devolución', action: 'Consultar actividad' },
  published: { label: 'Con devolución', action: 'Consultar actividad' },
  readOnly: { label: 'Solo consulta', action: 'Ver actividad' },
};

function MyActivities({ activities, onOpen }: { activities: ProgressActivity[]; onOpen?: (id: string) => void }) {
  const rows = activities.map(activity => ({ activity, state: studentState(activity) }));
  const toContinue = rows.filter(row => row.state === 'pending' || row.state === 'resubmission');
  const waiting = rows.filter(row => row.state === 'submitted');
  const published = rows.filter(row => row.state === 'published');
  const readOnly = rows.filter(row => row.state === 'readOnly');

  return <section className={styles.result} aria-label="Actividades del seguimiento">
    <div className={styles.progressStats} aria-label="Resumen de tus actividades">
      <div className={styles.progressStat}><strong>{toContinue.length}</strong><span>Para continuar</span></div>
      <div className={styles.progressStat}><strong>{waiting.length}</strong><span>Esperando devolución</span></div>
      <div className={styles.progressStat}><strong>{published.length}</strong><span>Con devolución</span></div>
    </div>
    {rows.length ? <ul className={styles.progressList}>{[...toContinue, ...waiting, ...published, ...readOnly].map(({ activity, state }) =>
      <li className={styles.progressRow} key={activity.id}>
        <div>
          <small>{progressType[activity.type]}</small>{' '}
          <span className={styles.state} data-tone={state}>{progressState[state].label}</span>
          <h4>{activity.title}</h4>
          {activity.firstSubmission ? <p>Entregada {activity.firstSubmission.late ? 'fuera de plazo' : 'a tiempo'}{state === 'resubmission' ? ' · Reentrega pendiente' : ''}</p> : null}
          {activity.grade !== null ? <p>{state === 'resubmission' ? 'Nota anterior' : 'Nota publicada'} · {decimal(activity.grade)} / 10</p> : null}
        </div>
        {onOpen ? <button className={state === 'pending' || state === 'resubmission' ? 'primary' : undefined}
          onClick={() => onOpen(activity.id)}>{progressState[state].action}</button> : null}
      </li>)}</ul> : <p className="classroom-inline-empty">Cuando tengas actividades en el aula, van a aparecer acá.</p>}
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
  return <section className={`p8-progress brujula-progress ${styles.progressWorkspace}`} aria-label="Seguimiento del aprendizaje" aria-busy={loading}>
    <header className="p5-section-head"><div><h2>{studentId && data && data.scope !== 'classroom' ? `${data.firstName} ${data.lastName}` : data?.scope === 'classroom' ? 'Progreso del aula' : 'Mi progreso'}</h2>
      <p>{studentId ? 'Seguimiento académico individual.' : data?.scope === 'classroom' ? 'Indicadores de los estudiantes actuales del aula.' : 'Tus próximos pasos, entregas y devoluciones.'}</p></div></header>
    {loading ? <Notice>Cargando progreso…</Notice> : null}
    {error ? <Notice error>{error} <button onClick={() => setRefresh(value => value + 1)}>Reintentar progreso</button></Notice> : null}
    {data ? <>
      {data.scope === 'member' && !data.currentMember ? <Notice>Historial académico conservado.</Notice> : null}
      {data.scope === 'self' ? <MyActivities activities={data.activities} onOpen={onOpenActivity}/> : null}
      <div className={styles.metrics}>
        <Metric title="Cumplimiento de entregas" value={String(data.completion.delivered ?? 0)} suffix={`/ ${data.completion.expected ?? 0}`} caption={`${data.completion.pending ?? 0} pendientes · ${data.completion.pendingResubmissions ?? 0} reentregas pendientes`} percent={data.completion.percentage === null ? null : bounded(data.completion.percentage)} icon="clipboard" tone="paper"/>
        <Metric title="Rendimiento académico" value={decimal(data.performance.average)} suffix="/ 10" caption={data.performance.average === null ? 'Aún no hay calificaciones publicadas' : `${data.scope === 'classroom' ? data.performance.gradedStudents : data.performance.graded} resultados publicados`} percent={data.performance.average === null ? null : bounded(data.performance.average) * 10} icon="progress" tone="leaf"/>
        {data.scope !== 'self' ? <Metric title="Avance del plan"
          value={data.plan.percentage === null ? '—' : `${Math.round(bounded(data.plan.percentage))}%`} suffix=""
          caption={`${data.plan.taught} de ${data.plan.total} temas dados en el aula`}
          percent={data.plan.percentage === null ? null : bounded(data.plan.percentage)} icon="route" tone="sun"/> : null}
      </div>
      {data.scope !== 'self' ? <div className="brujula-progress-summary"><span><i/>{data.completion.onTime ?? 0} a tiempo</span><span><i/>{data.completion.late ?? 0} tarde</span><span><i/>{data.completion.pending ?? 0} pendientes</span></div> : null}
      {data.scope === 'classroom' ? <section aria-label="Estudiantes actuales" className="brujula-progress-register"><h3>Seguimiento individual</h3>
        <div className={styles.progressTable}><table><thead><tr><th>Estudiante</th><th>Entregas</th><th>Promedio</th><th><span className="sr-only">Detalle</span></th></tr></thead><tbody>{data.students.map(student => <tr key={student.studentId}>
          <td><span className="brujula-progress-student"><span className="p5-avatar">{student.firstName.charAt(0)}{student.lastName.charAt(0)}</span><strong>{student.firstName} {student.lastName}</strong></span></td>
          <td>{student.completion.delivered ?? 0} / {student.completion.expected ?? 0}</td><td>{student.performance.average === null ? '—' : `${decimal(student.performance.average)} / 10`}</td>
          <td>{onOpenStudent && student.studentId ? <button className="p5-link" onClick={()=>onOpenStudent(student.studentId)}>Ver ficha <span aria-hidden="true">›</span></button> : null}</td>
        </tr>)}</tbody></table></div>{!data.students.length ? <p className="classroom-inline-empty">Todavía no hay estudiantes. Los estudiantes que se sumen al aula aparecerán acá.</p> : null}
      </section> : data.scope === 'member' ? <section className="brujula-progress-register" aria-label="Actividades del seguimiento"><h3>Registro de actividades</h3>
        {!data.activities.length ? <p className="classroom-inline-empty">Sin registros académicos. Los resultados publicados se reunirán acá.</p> : <ul className="brujula-progress-activities">{data.activities.map(activity => <li key={activity.id}>
          <div><strong>{activity.title}</strong><small>{!activity.expected ? 'Solo consulta: no se cuenta como pendiente' : activity.firstSubmission ? `Entregada · ${activity.firstSubmission.late ? 'Tarde' : 'A tiempo'}` : 'Pendiente de entrega'}{activity.pendingResubmission ? ' · Reentrega pendiente' : ''}</small></div>
          <span>{activity.grade === null ? 'Sin calificación publicada' : `${decimal(activity.grade)} / 10`}</span>{onOpenActivity && activity.id ? <button className="p5-link" onClick={()=>onOpenActivity(activity.id)}>Ver actividad <span aria-hidden="true">›</span></button> : null}
        </li>)}</ul>}
      </section> : <details className={`${styles.panel} ${styles.planProgress}`}>
        <summary>Avance de los temas de la clase</summary>
        <Metric title="Avance del plan" value={data.plan.percentage === null ? '—' : `${Math.round(bounded(data.plan.percentage))}%`}
          suffix="" caption={`${data.plan.taught} de ${data.plan.total} temas dados en el aula`}
          percent={data.plan.percentage === null ? null : bounded(data.plan.percentage)} icon="route" tone="sun"/>
        <p>Este avance lo registra tu docente para todo el grupo.</p>
      </details>}
    </> : null}
  </section>;
}
