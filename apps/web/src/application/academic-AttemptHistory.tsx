'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActivityDetail, DeadlineResolution } from '../../../../src/core/contracts/activities.ts';
import type { AttemptHistoryData, AttemptHistoryRow, AttemptSessionData } from '../../../../src/core/contracts/participation.ts';
import type { ClassroomClient } from '../../../../src/core/contracts/academic-client.ts';
import type { Detail } from '../../../../src/core/contracts/classrooms.ts';
import { Dialog, Notice } from '../../../shared-ui/feedback.tsx';
import { activityDate } from '../../../shared-ui/academic-date.ts';
import { GradingEditor } from '../features/grading/index.ts';
import { PublishedResult } from '../features/grading/index.ts';
import { FoxmindIcon } from '../../../shared-ui/index.ts';
import { AttemptAnswers, AttemptReceipt } from '../features/participation/index.ts';
import { ActivityScreen } from './academic-ActivityScreen.tsx';
import styles from './academic-activity.module.css';
import { ActivityPreview } from './academic-activity-preview.tsx';

function attemptContent(data: AttemptSessionData) {
  if (data.activity.type === 'ASSIGNMENT') {
    const count = data.attempt?.attachments?.length ?? 0;
    if (!count && data.attempt?.practicalResponse?.trim()) return 'Respuesta escrita';
    return `${count} ${count === 1 ? 'archivo' : 'archivos'}`;
  }
  const count = data.attempt?.answers.filter(answer => !!answer.text?.trim() || answer.optionIds.length).length ?? 0;
  return `${count} ${count === 1 ? 'respuesta' : 'respuestas'}`;
}

export function AttemptHistory({ api, room, activityId, attemptId, filter, onClose, onChanged, onResume,activityPreview,actions,onReview,effectiveDeadlineAt,instructionsLocked,initialView }: {
  api: ClassroomClient; room: Detail; activityId: string; attemptId?: string | null; onClose: () => void;
  filter?: 'unpublished';
  onChanged: () => Promise<void>; onResume: (data: AttemptSessionData) => void;
  activityPreview?:ActivityDetail;actions?:import('react').ReactNode;onReview?:()=>void;effectiveDeadlineAt?:string|null;instructionsLocked?:boolean;initialView?: 'overview' | 'history';
}) {
  const teacher = room.role === 'teacher', path = `/${room.id}/activities/${activityId}`;
  const privateDraft=teacher&&activityPreview?.status==='DRAFT';
  const [data, setData] = useState<AttemptHistoryData | null>(null), [selected, setSelected] = useState<AttemptSessionData | null>(null);
  const [reopening, setReopening] = useState<AttemptHistoryRow | null>(null), [local, setLocal] = useState('');
  const [resolution, setResolution] = useState<DeadlineResolution | null>(null), [offset, setOffset] = useState<number | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [view, setView] = useState<'overview' | 'history'>(initialView ?? (filter || attemptId || !activityPreview ? 'history' : 'overview'));
  const [deliveryFilter, setDeliveryFilter] = useState<'all' | 'pending' | 'saved' | 'published'>('all');
  const [historyStudent, setHistoryStudent] = useState<string | null>(null);
  const allAttempts = historyStudent !== null;
  const operation = useRef(false);
  const [grading, setGrading] = useState<string | null>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { detailHeading.current?.focus(); }, [selected]);
  const candidates = data?.attempts.filter(attempt => filter !== 'unpublished' || (attempt.status === 'SUBMITTED' && attempt.gradePublished === false)) ?? [];
  const latestDeliveries = new Map<string, AttemptHistoryRow>();
  for (const attempt of candidates) {
    if (attempt.status !== 'SUBMITTED' || attempt.currentMember === false) continue;
    const previous = latestDeliveries.get(attempt.studentId);
    if (!previous || attempt.number > previous.number) latestDeliveries.set(attempt.studentId, attempt);
  }
  const reviewState = (attempt: AttemptHistoryRow) => attempt.reviewState ?? (attempt.gradePublished === true ? 'published' : attempt.gradePublished === false ? 'pending' : undefined);
  const deliveryRows = teacher && !allAttempts && !filter ? [...latestDeliveries.values()] : historyStudent ? candidates.filter(attempt => attempt.studentId === historyStudent) : candidates;
  const visibleAttempts = teacher && !allAttempts ? deliveryRows.filter(attempt => deliveryFilter === 'all' || reviewState(attempt) === deliveryFilter) : deliveryRows;
  const gradable = data?.attempts.filter(attempt => attempt.status === 'SUBMITTED') ?? [];
  const gradeIndex = gradable.findIndex(attempt => attempt.id === grading);
  const gradingAttempt = data?.attempts.find(attempt => attempt.id === grading);
  const canReopenAttempt = (attempt: AttemptHistoryRow) => teacher && !!data?.canReopen && attempt.currentMember && attempt.status === 'SUBMITTED'
    && !data.attempts.some(other => other.studentId === attempt.studentId && (other.status === 'DRAFT' || other.number > attempt.number));
  function openReopening(attempt: AttemptHistoryRow) { setReopening(attempt); setLocal(''); setOffset(null); setResolution(null); }
  const previousGrade = gradeIndex > 0 ? gradable.slice(0, gradeIndex).reverse().find(attempt => filter !== 'unpublished' || !attempt.gradePublished) : undefined;
  const nextGrade = gradeIndex >= 0 ? gradable.slice(gradeIndex + 1).find(attempt => filter !== 'unpublished' || !attempt.gradePublished) : undefined;
  const load = useCallback(async (signal?: AbortSignal) => {
    setData(await api.call<AttemptHistoryData>(`${path}/${teacher ? 'history-submissions' : 'history'}`, 'GET', undefined, signal));
  }, [api, path, teacher]);
  const inspect = useCallback(async (id: string) => setSelected(await api.call<AttemptSessionData>(`/${room.id}/attempts/${id}/history`)), [api, room.id]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal).then(async () => {
    if (attemptId && !controller.signal.aborted) {
      if (teacher) setGrading(attemptId); else await inspect(attemptId);
    }
  }).catch(e => { if (!controller.signal.aborted) setError(e.message); }); return () => controller.abort(); }, [load, inspect, attemptId, teacher]);
  async function run(work: () => Promise<void>) {
    if (operation.current) return;
    operation.current = true; setBusy(true); setError('');
    try { await work(); } catch (e) { setError((e as Error).message); }
    finally { operation.current = false; setBusy(false); }
  }
  async function deadline() {
    if (!local) return null;
    const next = await api.call<DeadlineResolution>(`/${room.id}/activities/deadline`, 'POST', { local }); setResolution(next);
    if (next.reason === 'NONEXISTENT') throw new Error('Esa hora no existe en la zona del aula. Selecciona otra.');
    if (next.reason === 'AMBIGUOUS' && offset === null) throw new Error('Selecciona explícitamente una ocurrencia de la hora repetida.');
    return offset === null ? { local } : { local, offsetMinutes: offset };
  }
  return <ActivityScreen title={grading ? undefined : data?.activity.title ?? activityPreview?.title ?? (teacher ? 'Entregas e historial de intentos' : 'Mis intentos')} label={teacher ? 'Entregas e historial de intentos' : 'Mi historial de intentos'} onClose={grading ? undefined : onClose} focused subtitle={room.name} overview={Boolean(activityPreview && !selected && !grading)} footer={!selected && !grading ? <><span><FoxmindIcon name={teacher ? 'users' : data?.delivered ? 'check' : 'lock'}/>{teacher ? `${latestDeliveries.size}${data?.expectedStudentCount !== undefined ? ` de ${data.expectedStudentCount}` : ''} entregas` : data?.delivered ? 'Tu entrega está confirmada.' : room.archived ? 'Aula archivada · Sólo consulta' : 'Tu borrador es privado hasta que confirmes la entrega.'}</span><div><button onClick={onClose}><FoxmindIcon name="arrow-left"/>Volver al aula</button>{teacher && activityPreview && !privateDraft ? <button className="primary" onClick={() => setView(view === 'overview' ? 'history' : 'overview')}><FoxmindIcon name={view === 'overview' ? 'users' : 'book'}/>{view === 'overview' ? 'Ver entregas' : 'Ver la consigna'}</button> : null}{!teacher ? actions : null}{!teacher && data?.delivered && !actions ? <button className="primary" onClick={() => { const latest = data.attempts.find(item => item.status === 'SUBMITTED'); if (latest) void run(() => inspect(latest.id)); }}>{data.attempts.find(attempt => attempt.status === 'SUBMITTED')?.gradePublished ? 'Ver devolución' : 'Ver mi entrega'}</button> : null}</div></> : undefined} actions={!teacher&&!grading&&!selected?actions:undefined} kicker={activityPreview?{ASSIGNMENT:'Trabajo práctico',QUESTIONNAIRE:'Cuestionario',EVALUATION:'Evaluación'}[activityPreview.type]:undefined}>
    {error ? <Notice error>{error} Actualiza el historial antes de volver a intentar.</Notice> : null}
    <div className="education-attempt-history" hidden={Boolean(grading || selected)}>
      {activityPreview ? <header className={`parity-participation-heading ${activityPreview.type === 'ASSIGNMENT' ? 'mint' : activityPreview.type === 'EVALUATION' ? 'peach' : ''}`}><span className="parity-participation-symbol"><FoxmindIcon name={activityPreview.type === 'ASSIGNMENT' ? 'attach' : activityPreview.type === 'EVALUATION' ? 'clipboard' : 'edit'}/></span><div><div className="parity-participation-meta"><span>{{ASSIGNMENT:'Trabajo práctico',QUESTIONNAIRE:'Cuestionario',EVALUATION:'Evaluación'}[activityPreview.type]}</span><b>{teacher ? privateDraft ? 'Borrador privado' : activityPreview.status === 'WITHDRAWN' ? 'Retirada' : 'Compartida' : data?.delivered ? data.attempts.find(attempt => attempt.status === 'SUBMITTED')?.gradePublished ? 'Devolución publicada' : 'Entrega recibida' : data?.attempts.some(attempt => attempt.status === 'DRAFT') ? 'Borrador guardado' : 'Para empezar'}</b></div><h1>{activityPreview.title}</h1><p><FoxmindIcon name="calendar"/>{activityDate(effectiveDeadlineAt === undefined ? activityPreview.deadlineAt : effectiveDeadlineAt, activityPreview.zone)}<span>{activityPreview.type === 'ASSIGNMENT' ? 'Entrega con archivos' : `${activityPreview.questions.length} preguntas`}</span></p></div></header> : null}
      {activityPreview && !privateDraft ? <div className={`${styles.historyTabs} ${!teacher ? "parity-secondary-history" : ""}`} role="group" aria-label="Vista de la actividad">
        <button type="button" aria-pressed={view === 'overview'} onClick={() => setView('overview')}><FoxmindIcon name="book"/>La actividad</button>
        <button type="button" aria-pressed={view === 'history'} onClick={() => setView('history')}><FoxmindIcon name={teacher ? 'users' : 'history'}/>
          {teacher ? 'Entregas' : 'Mis intentos'} {visibleAttempts.length ? <span>{visibleAttempts.length}</span> : null}</button>
      </div> : null}
      {activityPreview && (view === 'overview' || privateDraft) ? <ActivityPreview api={api} activity={activityPreview} teacher={teacher} room={room}
        effectiveDeadlineAt={effectiveDeadlineAt} instructionsLocked={instructionsLocked} /> : !activityPreview && data ? <p>{activityDate(data.activity.deadlineAt, data.activity.zone)}</p> : null}
      {privateDraft ? <div className="brujula-attempt-empty"><strong>Solo vos podés ver este borrador.</strong><p>Revisá la consigna antes de compartirla con el aula.</p>
        {onReview ? <button type="button" onClick={onReview}>Revisar para asignar</button> : null}</div>
        : view !== 'history' ? null : !data ? error ? null : <Notice>Cargando historial…</Notice> : <><div className={styles.historyHeading}><div><h3>{teacher ? allAttempts ? 'Historial de intentos' : 'Una mirada a cada entrega' : 'Mis intentos'}</h3>{teacher && !allAttempts ? <p>{latestDeliveries.size}{data.expectedStudentCount !== undefined ? ` de ${data.expectedStudentCount}` : ''} estudiantes compartieron su trabajo.</p> : null}</div>
      {teacher ? allAttempts ? <button type="button" onClick={() => setHistoryStudent(null)}>Volver a entregas</button> : null : visibleAttempts.length ? <span>{visibleAttempts.length} {visibleAttempts.length === 1 ? 'intento' : 'intentos'}</span> : null}</div>
      {teacher && !allAttempts ? <div className={styles.deliveryFilters} role="group" aria-label="Filtrar entregas">{([['all', 'Todas'], ['pending', 'Por revisar'], ['saved', 'Revisadas'], ['published', 'Publicadas']] as const).map(([key, label]) => <button type="button" key={key} aria-pressed={deliveryFilter === key} onClick={() => setDeliveryFilter(key)}>{label}</button>)}</div> : null}
      {!teacher && data.delivered ? <Notice>Actividad entregada. Abrí un intento para ver tus respuestas y la devolución del docente.</Notice> : null}
      {data.pendingResubmission ? <Notice>Reentrega pendiente: todavía no es una nueva entrega recibida.</Notice> : null}
      {filter === 'unpublished' ? <p>Entregas con corrección todavía no publicada.</p> : null}
      {!visibleAttempts.length ? <div className="brujula-attempt-empty"><strong>{teacher?filter === 'unpublished' ? 'No hay entregas pendientes de publicación.' : allAttempts ? 'No hay intentos registrados.' : deliveryFilter === 'all' ? 'Todavía no hay entregas' : 'No hay entregas en este estado':'Todavía no hiciste una entrega'}</strong>{!teacher?<p>Cuando confirmes una entrega, vas a encontrar su comprobante y devolución acá.</p>:null}</div> : null}
      <ul className={`p7-history-list ${styles.deliveryList}${teacher && !allAttempts ? ` ${styles.deliveryOverview}` : ''}`}>{visibleAttempts.map(attempt => <li key={attempt.id}>
        <div className={styles.deliveryIdentity}>
          <span><FoxmindIcon name={teacher ? 'profile' : 'file'}/></span>
          <div><strong>{teacher ? `${attempt.lastName}, ${attempt.firstName}` : `Intento ${attempt.number}`}</strong>{teacher ? <small>Intento {attempt.number}</small> : null}</div>
        </div>
        <span className={styles.state} data-tone={attempt.status !== 'SUBMITTED' ? undefined : teacher && reviewState(attempt) !== 'published' ? reviewState(attempt) ?? 'pending' : 'confirmed'}>{attempt.status === 'SUBMITTED'
          ? teacher ? reviewState(attempt) === 'published' ? 'Devolución publicada' : reviewState(attempt) === 'saved' ? 'Revisión privada guardada' : 'Por revisar' : attempt.gradePublished ? 'Con devolución' : 'Entregado' : attempt.number > 1 ? 'Reentrega pendiente' : 'Borrador'}</span>
        <p>{attempt.status === 'DRAFT' ? 'Todavía sin entregar' : 'Recepción confirmada'}
          {attempt.submittedAt ? ` · ${new Date(attempt.submittedAt).toLocaleString('es', { timeZone: room.timezone })} · ${room.timezone}` : ''}
          {attempt.submittedLate ? ' · Entrega tardía' : ''}{teacher && !attempt.currentMember ? ' · Estudiante anterior' : ''}</p>
        <div className="p5-actions">{!teacher || allAttempts && attempt.status === 'SUBMITTED' ? <button disabled={busy} onClick={() => void run(() => inspect(attempt.id))}>Consultar intento {attempt.number}</button> : null}
          {!teacher && attempt.status === 'DRAFT' ? <button disabled={busy} onClick={() => void run(async () => {
            const session = await api.call<AttemptSessionData>(`${path}/session`); onClose(); onResume(session);
          })}>Continuar borrador</button> : null}
          {allAttempts && canReopenAttempt(attempt)
            ? <button disabled={busy} onClick={() => openReopening(attempt)}>Habilitar otro intento</button> : null}
          {teacher && attempt.status === 'SUBMITTED' ? <button disabled={busy} onClick={() => { setGrading(attempt.id); setSelected(null); setReopening(null); }} aria-label={allAttempts ? `Corregir intento ${attempt.number}` : `${attempt.gradePublished ? 'Ver devolución' : 'Revisar entrega'} · Intento ${attempt.number}`}>{allAttempts ? `Corregir intento ${attempt.number}` : attempt.gradePublished ? 'Ver devolución' : 'Revisar entrega'}<FoxmindIcon name="arrow-right"/></button> : null}</div>
      </li>)}</ul>
      {teacher && !allAttempts && deliveryFilter === 'all' && !filter && data.waitingStudents?.length ? <section className={styles.deliveryWaiting}><h3>En camino</h3><p>Todavía no confirmaron una entrega.</p><div>{data.waitingStudents.map(student => <span key={student.studentId}><FoxmindIcon name="profile"/>{student.firstName} {student.lastName}</span>)}</div></section> : null}</>}
    </div>
    {grading ? <GradingEditor key={grading} api={api} roomId={room.id} attemptId={grading} onClose={() => { setGrading(null); setView('history'); }}
      onReopen={gradingAttempt && canReopenAttempt(gradingAttempt) ? () => { openReopening(gradingAttempt); setGrading(null); setView('history'); } : undefined}
      onHistory={data && data.attempts.filter(attempt => attempt.studentId === data.attempts.find(item => item.id === grading)?.studentId).length > 1 ? () => { setHistoryStudent(data.attempts.find(item => item.id === grading)!.studentId); setGrading(null); setView('history'); } : undefined}
      onPrevious={previousGrade ? () => setGrading(previousGrade.id) : undefined} onNext={nextGrade ? () => setGrading(nextGrade.id) : undefined} onChanged={async () => { await Promise.all([load(), onChanged()]); }} /> : null}
    {selected?.attempt ? <section className="p7-history-detail" aria-label="Intento histórico confirmado">
      <button onClick={() => { setSelected(null); setView('history'); }}>{teacher ? 'Volver al historial' : 'Volver a mis intentos'}</button>
      <h3 ref={detailHeading} tabIndex={-1} className="sr-only">Intento {selected.attempt.number}</h3>
      {selected.attempt.status === 'DRAFT' ? <p>Intento {selected.attempt.number} · Borrador sin entregar</p> : null}
      {selected.attempt.status === 'SUBMITTED' ? <PublishedResult key={selected.attempt.id} api={api} roomId={room.id} attemptId={selected.attempt.id} zone={room.timezone} audience={teacher ? 'teacher' : 'student'}
        receipt={!teacher ? <AttemptReceipt delivery={selected.attempt} title={selected.activity.title} zone={room.timezone}
          number={selected.attempt.number} content={attemptContent(selected)}/> : undefined}
        pendingContent={<AttemptAnswers api={api} data={selected} teacher={teacher}/>} /> : <AttemptAnswers api={api} data={selected} />}
    </section> : null}
    {reopening ? <Dialog title="Confirmar nuevo intento" onClose={()=>{if(!busy)setReopening(null);}}><h4>Habilitar otro intento para {reopening.firstName} {reopening.lastName}</h4>
      <p>Se creará un nuevo borrador con las respuestas o archivos de la última entrega para revisar. El original y su calificación se conservan. El estudiante debe transferir explícitamente la edición y confirmar una nueva entrega.</p>
      <label>Plazo individual opcional · {room.timezone}<input aria-label="Plazo individual de reentrega" type="datetime-local" step={60} value={local}
        onChange={e => { setLocal(e.target.value); setResolution(null); setOffset(null); }} /></label>
      <p>Sin plazo individual se aplica el plazo general vigente. Si la recepción ya cerró, debes indicar un plazo individual futuro.</p>
      <button disabled={busy || !local} onClick={() => void run(async () => { await deadline(); })}>Verificar plazo de reentrega</button>
      {resolution?.reason === 'AMBIGUOUS' ? <label>Ocurrencia del plazo de reentrega<select aria-label="Ocurrencia del plazo de reentrega" value={offset ?? ''}
        onChange={e => setOffset(e.target.value === '' ? null : Number(e.target.value))}><option value="">Selecciona una ocurrencia</option>
        {resolution.choices.map(choice => <option key={choice.instant} value={choice.offsetMinutes}>{choice.offset} · {choice.instant}</option>)}</select></label> : null}
      <footer className="p5-form-footer"><button disabled={busy} onClick={() => setReopening(null)}>Cancelar nuevo intento</button>
        <button className="primary" disabled={busy || !data} onClick={() => void run(async () => {
          await api.call(`${path}/reopen`, 'POST', { revision: data!.revision, studentId: reopening.studentId, deadline: await deadline(), confirm: true });
          setReopening(null); await Promise.all([load(), onChanged()]);
        })}>Confirmar nuevo intento</button></footer>
    </Dialog> : null}
  </ActivityScreen>;
}
