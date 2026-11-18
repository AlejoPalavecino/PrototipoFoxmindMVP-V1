'use client';
import { useEffect, useState } from 'react';
import type { GradingProgressOperations } from '../model/grading-operations.ts';
import type { ProgressData } from '../../../../../../src/core/contracts/grading.ts';
import { Dialog, Notice } from '../../../../../shared-ui/feedback.tsx';
import { AsyncFeedback } from '../../../../../shared-ui/AsyncFeedback.tsx';
import { FoxmindIcon, type IconKey } from '../../../../../shared-ui/index.ts';

import styles from '../ui/grading.module.css';

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

function StudentOverview({ data, onOpen, onShowActivities, onOpenResult }: { data: Exclude<ProgressData, { scope: 'classroom' }>; onOpen?: (id: string) => void; onShowActivities?: () => void; onOpenResult?: (activityId: string, attemptId: string) => void }) {
  const percentage = data.completion.percentage === null ? null : Math.round(bounded(data.completion.percentage));
  const published = data.activities.filter(item => item.grade !== null);
  const resubmission = data.archived ? undefined : data.activities.find(item => item.expected && item.pendingResubmission);
  const pending = data.archived || resubmission ? undefined : data.activities.find(item => item.expected && !item.firstSubmission);
  const next = resubmission ?? pending;
  const feedback = next ? undefined : published.find(item => item.publishedAttemptId);
  const guidance = resubmission ? `Revisá los cambios para volver a entregar «${resubmission.title}».`
    : pending ? `Consultá cómo entregar «${pending.title}».`
    : feedback ? `Revisá la devolución publicada de «${feedback.title}» y elegí qué podés aplicar en la próxima actividad.`
    : null;
  return <>
    <div className="parity-own-progress">
      <section className="parity-progress-panel parity-own-summary">
        <div className="parity-progress-ring" role="img" aria-label={percentage === null ? 'Sin actividades pendientes de seguimiento' : `${percentage}% de entregas confirmadas`}>
          <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="50" className="parity-ring-track"/>{percentage !== null && percentage > 0 ? <circle cx="60" cy="60" r="50" className="parity-ring-fill" strokeDasharray={`${percentage * Math.PI} ${100 * Math.PI}`}/> : null}</svg>
          <div><b>{percentage === null ? '—' : `${percentage}%`}</b><small>{data.completion.delivered ?? 0} de {data.completion.expected ?? 0}</small></div>
        </div>
        <div>
          <h3>Tu trabajo va tomando forma</h3>
          <p>{data.completion.delivered ?? 0} de {data.completion.expected ?? 0} actividades con entrega confirmada.</p>
          {guidance ? <p>{guidance}</p> : null}
          {onShowActivities || (onOpen && next) ? <button onClick={() => onShowActivities ? onShowActivities() : next && onOpen?.(next.id)}>
            <FoxmindIcon name="arrow-right"/>Seguir con mis actividades
          </button> : null}
        </div>
      </section>
      <section className="parity-progress-panel parity-own-grade"><FoxmindIcon name="chat"/><p>Tu promedio publicado</p><b>{decimal(data.performance.average)}<small> / 10</small></b><span>{data.performance.graded ? `${data.performance.graded} ${data.performance.graded === 1 ? 'calificación compartida' : 'calificaciones compartidas'} por tu docente` : 'Todavía no hay notas publicadas'}</span></section>
    </div>
    <section className="parity-progress-panel parity-feedback"><header><h3>Tus devoluciones</h3><p>Una pista para reconocer tus avances y seguir aprendiendo.</p></header>
      {published.length ? published.map(activity => <article key={activity.id}><span className="parity-feedback-icon"><FoxmindIcon name="edit"/></span><div><h4>{activity.title}</h4><small>{progressType[activity.type]}</small></div><strong>{decimal(activity.grade)}<small> / 10</small></strong>{onOpenResult && activity.publishedAttemptId ? <button onClick={() => onOpenResult(activity.id, activity.publishedAttemptId!)}><FoxmindIcon name="chat"/>Ver devolución</button> : null}</article>) : <p>Tus devoluciones aparecerán acá cuando tu docente las publique.</p>}
    </section>
  </>;
}

function UnitProgress({ plan }: { plan: ProgressData['plan'] }) {
  return <section className="parity-progress-panel parity-unit-progress" aria-label="Avance del plan"><header><div><h3>El camino de la clase</h3><p>Temas trabajados con tu grupo; este avance es distinto de tus calificaciones.</p></div></header>
    {plan.units?.length ? plan.units.map(unit => <article key={unit.id}><div><h4>{unit.name}</h4><span>{unit.taught} de {unit.total} temas</span></div>{unit.total ? <progress value={unit.taught} max={unit.total} aria-label={unit.name}/> : <p>Esta unidad todavía no tiene temas.</p>}</article>) : <p className="classroom-inline-empty">Todavía no hay unidades para mostrar.</p>}
  </section>;
}

function TeacherOverview({ data, onOpenActivity, onOpenStudent, onReview, onShowActivities }: {
  data: Extract<ProgressData, { scope: 'classroom' }>; onOpenActivity?: (id: string) => void; onOpenStudent?: (id: string) => void;
  onReview?: (activityId: string, attemptId: string) => void; onShowActivities?: () => void;
}) {
  const work = data.students.flatMap(student => student.activities);
  const received = work.filter(activity => activity.expected && activity.firstSubmission);
  const hasReviewData = work.every(activity => Object.hasOwn(activity, 'review'));
  const awaiting = received.filter(activity => activity.review ? activity.review.state !== 'published' : activity.grade === null);
  const next = data.students.flatMap(student => student.activities.map(activity => ({ student, activity })))
    .find(({ activity }) => activity.review && activity.review.state !== 'published');
  const grades = work.flatMap(activity => activity.grade === null ? [] : [Number(activity.grade)]);
  const ranges = [{ min: 0, max: 4, label: '0–3,9' }, { min: 4, max: 6, label: '4–5,9' }, { min: 6, max: 8, label: '6–7,9' }, { min: 8, max: 11, label: '8–10' }];
  const counts = ranges.map(range => grades.filter(grade => grade >= range.min && grade < range.max).length);
  const maxCount = Math.max(...counts, 1);
  const activities = Array.from(new Map(work.filter(activity => activity.expected).map(activity => [activity.id, activity])).values());
  return <div className="parity-teacher-progress">
    <div className="parity-teacher-metrics">
      <section data-tone="peach"><span><FoxmindIcon name="chat"/></span><div><p>Por acompañar</p><strong>{awaiting.length}</strong><small>{awaiting.length ? 'Entregas que esperan tu devolución' : 'Las revisiones están al día'}</small></div></section>
      <section data-tone="sky"><span><FoxmindIcon name="file"/></span><div><p>Entregas recibidas</p><strong>{data.completion.delivered} / {data.completion.expected}</strong><small>Sobre las actividades compartidas</small></div></section>
      <section data-tone="mint"><span><FoxmindIcon name="book"/></span><div><p>Plan trabajado</p><strong>{data.plan.percentage === null ? '—' : `${Math.round(bounded(data.plan.percentage))}%`}</strong><small>{data.plan.taught} de {data.plan.total} temas dados</small></div></section>
    </div>
    <div className="parity-teacher-charts">
      <section className="parity-progress-panel"><header><div><h3>Cómo vienen las entregas</h3><p>Una mirada por actividad, para saber dónde acompañar.</p></div><FoxmindIcon name="layers"/></header>
        <div className="parity-chart-legend"><span data-kind="waiting">{hasReviewData ? 'Por revisar' : 'Sin devolución'}</span>{hasReviewData ? <span data-kind="saved">Revisión privada</span> : null}<span data-kind="published">Publicada</span><span data-kind="missing">Sin entrega</span></div>
        <div className="parity-chart-bars">{activities.map(activity => {
          const rows = work.filter(item => item.id === activity.id && item.expected);
          const delivered = rows.filter(item => item.firstSubmission).length;
          const published = rows.filter(item => item.review ? item.review.state === 'published' : item.grade !== null).length;
          const waiting = rows.filter(item => item.firstSubmission && (item.review ? item.review.state === 'pending' : item.grade === null)).length;
          const saved = rows.filter(item => item.review?.state === 'saved').length;
          const missing = rows.length - delivered;
          return <article key={activity.id}><div>{onOpenActivity ? <button onClick={() => onOpenActivity(activity.id)}>{activity.title}<FoxmindIcon name="chevron-right"/></button> : <b>{activity.title}</b>}<strong>{delivered}<small> / {rows.length}</small></strong></div>
            <div className="parity-chart-bar" role="img" aria-label={hasReviewData ? `${activity.title}: ${waiting} por revisar, ${saved} revisiones privadas, ${published} publicadas, ${missing} sin entrega` : `${activity.title}: ${waiting} sin devolución, ${published} publicadas, ${missing} sin entrega`}>
              {([[waiting, 'waiting'], [saved, 'saved'], [published, 'published'], [missing, 'missing']] as const).map(([count, kind]) => count ? <span key={kind} data-kind={kind} style={{ width: `${count / rows.length * 100}%` }}/> : null)}
            </div><p>{waiting} {hasReviewData ? 'por revisar' : 'sin devolución'} · {published} con devolución publicada</p></article>;
        })}{!activities.length ? <p className="classroom-inline-empty">{data.students.length ? 'Las actividades que compartas van a aparecer acá.' : 'Invitá a tu grupo para empezar a ver sus entregas.'}</p> : null}</div>
      </section>
      <section className="parity-progress-panel"><header><div><h3>Resultados publicados</h3><p>Sólo las notas que ya compartiste.</p></div><FoxmindIcon name="progress"/></header>
        {grades.length ? <><div className="parity-grade-summary"><b>{decimal(data.performance.average)}<small> / 10</small></b><span>Promedio del grupo · {data.performance.gradedStudents} {data.performance.gradedStudents === 1 ? 'estudiante con nota' : 'estudiantes con nota'}</span></div>
          <div className="parity-grade-histogram" role="img" aria-label={`Distribución de notas: ${ranges.map((range, index) => `${range.label}: ${counts[index]}`).join('; ')}`}>
            {ranges.map((range, index) => <div key={range.label} aria-hidden="true"><b>{counts[index]}</b><div><span style={{ height: `${counts[index] / maxCount * 100}%` }}/></div><small>{range.label}</small></div>)}
          </div><p className="parity-chart-note">Cantidad de calificaciones por rango.</p></> : <div className="parity-grade-empty"><FoxmindIcon name="progress"/><h4>Todavía no hay notas publicadas</h4><p>Cuando compartas una devolución, su nota se suma a esta gráfica.</p></div>}
      </section>
    </div>
    <section className="parity-review-queue"><div><span><FoxmindIcon name={next ? 'chat' : 'check'}/></span><div><h3>{next ? 'Tu próximo acompañamiento' : 'Cada devolución, un paso más'}</h3><p>{next ? `${next.student.firstName} ${next.student.lastName} está esperando tu mirada sobre «${next.activity.title}».` : 'Cuando llegue un trabajo, vas a encontrar acá el próximo para revisar.'}</p></div></div>{next && onReview ? <button className="primary" onClick={() => onReview(next.activity.id, next.activity.review!.attemptId)}>Revisar entrega<FoxmindIcon name="arrow-right"/></button> : onShowActivities ? <button onClick={onShowActivities}>Ver actividades<FoxmindIcon name="layers"/></button> : null}</section>
    <section className="parity-progress-panel parity-student-paths"><header><div><h3>Cada estudiante, su recorrido</h3><p>Entregas confirmadas y notas publicadas. Las revisiones privadas no cuentan como nota.</p></div></header>
      {data.students.map(student => <article key={student.studentId}><div className="parity-progress-person"><span>{student.firstName.charAt(0)}{student.lastName.charAt(0)}</span><b>{student.firstName} {student.lastName}</b></div><dl><div><dt>Entregas</dt><dd>{student.completion.delivered}<small> / {student.completion.expected}</small></dd></div><div><dt>Promedio publicado</dt><dd>{decimal(student.performance.average)}</dd></div></dl>{onOpenStudent ? <button onClick={() => onOpenStudent(student.studentId)}>Ver recorrido<FoxmindIcon name="chevron-right"/></button> : null}</article>)}
      {!data.students.length ? <p>Invitá a tu grupo para empezar a acompañar sus recorridos.</p> : null}
    </section>
  </div>;
}

export function Progress({ operations, classroomId, studentId, expectedScope, onOpenActivity, onOpenStudent, onReview, onShowActivities, onOpenResult }: { operations: GradingProgressOperations; classroomId: string; studentId?: string; expectedScope?: 'classroom' | 'self'; onOpenActivity?: (id: string) => void; onOpenStudent?: (studentId: string) => void; onReview?: (activityId: string, attemptId: string) => void; onShowActivities?: () => void; onOpenResult?: (activityId: string, attemptId: string) => void }) {
  const [data, setData] = useState<ProgressData | null>(null), [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0), [loading, setLoading] = useState(true);
  const [planOpen, setPlanOpen] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setData(null); setError(''); setPlanOpen(false);
    void operations.load(studentId, controller.signal).then(value => {
      if (!controller.signal.aborted) setData(value);
    }).catch((e: Error) => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [operations, classroomId, studentId, refresh]);
  const scope = studentId ? 'member' : data?.scope ?? expectedScope;
  const title = scope === 'member' ? data && data.scope !== 'classroom' ? `${data.firstName} ${data.lastName}` : 'Seguimiento académico individual'
    : scope === 'classroom' ? 'Una mirada a tu grupo' : 'Tu recorrido, paso a paso';
  return <section className={`p8-progress brujula-progress parity-progress-exact ${styles.progressWorkspace}`} data-progress-scope={scope} aria-label="Seguimiento del aprendizaje" aria-busy={loading}>
    <header className="p5-section-head"><div><h2>{title}</h2>
      <p>{studentId ? 'Seguimiento académico individual.' : scope === 'classroom' ? 'Qué ya avanzó y dónde podés hacer la diferencia.' : 'Lo que compartiste y las devoluciones que te ayudan a seguir.'}</p></div>{data?.scope === 'classroom' ? <span className="parity-progress-live"><FoxmindIcon name="check"/>Datos de esta aula</span> : null}</header>
    {loading ? <div className="classroom-loading classroom-loading--compact"><AsyncFeedback title="Cargando progreso…" compact showDelay /></div> : null}
    {error ? <Notice error>{error} <button type="button" onClick={() => setRefresh(value => value + 1)}>Reintentar progreso</button></Notice> : null}
    {data && data.scope === 'classroom' ? <section aria-label="Estudiantes actuales" className="parity-progress-content"><TeacherOverview data={data} onOpenActivity={onOpenActivity} onOpenStudent={onOpenStudent} onReview={onReview} onShowActivities={onShowActivities}/></section> : null}
    {data && data.scope !== 'classroom' ? <>
      {data.scope === 'member' && !data.currentMember ? <Notice>Historial académico conservado.</Notice> : null}
      {data.scope === 'self' ? <StudentOverview data={data} onOpen={onOpenActivity} onShowActivities={onShowActivities} onOpenResult={onOpenResult}/> : <div className="parity-person-summary">
        <span className="parity-person-avatar" aria-hidden="true">{data.firstName?.charAt(0)}{data.lastName?.charAt(0)}</span><div><strong aria-label="Cumplimiento de entregas">{data.completion.delivered ?? 0} de {data.completion.expected ?? 0} entregas</strong><p aria-label="Rendimiento académico">Promedio publicado: {decimal(data.performance.average)}</p></div>
      </div>}
      {data.scope === 'self' ? <UnitProgress plan={data.plan}/> : null}
      {data.scope !== 'self' ? <div className="brujula-progress-summary"><span><i/>{data.completion.onTime ?? 0} a tiempo</span><span><i/>{data.completion.late ?? 0} tarde</span><span><i/>{data.completion.pending ?? 0} pendientes</span></div> : null}
      {data.scope === 'member' ? <section className="brujula-progress-register" aria-label="Actividades del seguimiento"><h3>Registro de actividades</h3>
        {!data.activities.length ? <p className="classroom-inline-empty">Sin registros académicos. Los resultados publicados se reunirán acá.</p> : <ul className="brujula-progress-activities">{data.activities.map(activity => <li key={activity.id}>
          <div><strong>{activity.title}</strong><small>{activity.review?.state === 'saved' ? 'Revisión privada guardada' : activity.review?.state === 'pending' ? 'Entrega por revisar' : activity.review?.state === 'published' ? 'Devolución publicada' : !activity.expected ? 'Solo consulta: no se cuenta como pendiente' : activity.firstSubmission ? `Entregada · ${activity.firstSubmission.late ? 'Tarde' : 'A tiempo'}` : 'Sin entrega confirmada'}{activity.pendingResubmission ? ' · Reentrega pendiente' : ''}</small></div>
          <span>{activity.grade === null ? '' : `${decimal(activity.grade)} / 10`}</span>{activity.review && onReview ? <button className="p5-link" onClick={() => onReview(activity.id, activity.review!.attemptId)}>{activity.review.state === 'published' ? 'Consultar' : 'Revisar'}<FoxmindIcon name="chevron-right"/></button> : onOpenActivity && activity.id ? <button className="p5-link" onClick={()=>onOpenActivity(activity.id)}>Ver actividad <span aria-hidden="true">›</span></button> : null}
        </li>)}</ul>}
      </section> : !data.plan.units ? <>
        <button type="button" className={styles.secondaryAction} aria-haspopup="dialog" onClick={() => setPlanOpen(true)}>Avance de los temas de la clase</button>
        {planOpen ? <Dialog title="Avance de los temas de la clase" onClose={() => setPlanOpen(false)}>
        <Metric title="Avance del plan" value={data.plan.percentage === null ? '—' : `${Math.round(bounded(data.plan.percentage))}%`}
          suffix="" caption={`${data.plan.taught} de ${data.plan.total} temas dados en el aula`}
          percent={data.plan.percentage === null ? null : bounded(data.plan.percentage)} icon="route" tone="sun"/>
        <p>Este avance lo registra tu docente para todo el grupo.</p>
        </Dialog> : null}
      </> : null}
    </> : null}
  </section>;
}
