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
import { AttemptAnswers } from '../features/participation/index.ts';
import { ActivityScreen } from './academic-ActivityScreen.tsx';
import styles from './academic-activity.module.css';
import { ActivityPreview } from './academic-activity-preview.tsx';

export function AttemptHistory({ api, room, activityId, attemptId, filter, onClose, onChanged, onResume,activityPreview,actions,onReview,effectiveDeadlineAt,instructionsLocked }: {
  api: ClassroomClient; room: Detail; activityId: string; attemptId?: string | null; onClose: () => void;
  filter?: 'unpublished';
  onChanged: () => Promise<void>; onResume: (data: AttemptSessionData) => void;
  activityPreview?:ActivityDetail;actions?:import('react').ReactNode;onReview?:()=>void;effectiveDeadlineAt?:string|null;instructionsLocked?:boolean;
}) {
  const teacher = room.role === 'teacher', path = `/${room.id}/activities/${activityId}`;
  const privateDraft=teacher&&activityPreview?.status==='DRAFT';
  const [data, setData] = useState<AttemptHistoryData | null>(null), [selected, setSelected] = useState<AttemptSessionData | null>(null);
  const [reopening, setReopening] = useState<AttemptHistoryRow | null>(null), [local, setLocal] = useState('');
  const [resolution, setResolution] = useState<DeadlineResolution | null>(null), [offset, setOffset] = useState<number | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [grading, setGrading] = useState<string | null>(null);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { detailHeading.current?.focus(); }, [selected]);
  const visibleAttempts = data?.attempts.filter(attempt => filter !== 'unpublished' || (attempt.status === 'SUBMITTED' && attempt.gradePublished === false)) ?? [];
  const gradable = visibleAttempts.filter(attempt => attempt.status === 'SUBMITTED');
  const gradeIndex = gradable.findIndex(attempt => attempt.id === grading);
  const previousGrade = gradeIndex > 0 ? gradable[gradeIndex - 1] : undefined;
  const nextGrade = gradeIndex >= 0 ? gradable[gradeIndex + 1] : undefined;
  const load = useCallback(async (signal?: AbortSignal) => {
    setData(await api.call<AttemptHistoryData>(`${path}/${teacher ? 'history-submissions' : 'history'}`, 'GET', undefined, signal));
  }, [api, path, teacher]);
  const inspect = useCallback(async (id: string) => setSelected(await api.call<AttemptSessionData>(`/${room.id}/attempts/${id}/history`)), [api, room.id]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal).then(async () => {
    if (attemptId && !controller.signal.aborted) {
      if (teacher) setGrading(attemptId); else await inspect(attemptId);
    }
  }).catch(e => { if (!controller.signal.aborted) setError(e.message); }); return () => controller.abort(); }, [load, inspect, attemptId, teacher]);
  async function run(work: () => Promise<void>) { setBusy(true); setError(''); try { await work(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  async function deadline() {
    if (!local) return null;
    const next = await api.call<DeadlineResolution>(`/${room.id}/activities/deadline`, 'POST', { local }); setResolution(next);
    if (next.reason === 'NONEXISTENT') throw new Error('Esa hora no existe en la zona del aula. Selecciona otra.');
    if (next.reason === 'AMBIGUOUS' && offset === null) throw new Error('Selecciona explícitamente una ocurrencia de la hora repetida.');
    return offset === null ? { local } : { local, offsetMinutes: offset };
  }
  return <ActivityScreen title={data?.activity.title ?? activityPreview?.title ?? (teacher ? 'Entregas e historial de intentos' : 'Mis intentos')} label={teacher ? 'Entregas e historial de intentos' : 'Mi historial de intentos'} onClose={onClose} actions={!grading&&!selected?actions:undefined} kicker={activityPreview?{ASSIGNMENT:'Trabajo práctico',QUESTIONNAIRE:'Cuestionario',EVALUATION:'Evaluación'}[activityPreview.type]:undefined}>
    {error ? <Notice error>{error} Actualiza el historial antes de volver a intentar.</Notice> : null}
    <div className="education-attempt-history" hidden={Boolean(grading || selected)}>
      {activityPreview ? <ActivityPreview api={api} activity={activityPreview} teacher={teacher} room={room}
        effectiveDeadlineAt={effectiveDeadlineAt} instructionsLocked={instructionsLocked} /> : data
        ? <p>{activityDate(data.activity.deadlineAt, data.activity.zone)}</p> : null}
      {privateDraft?<div className="brujula-attempt-empty"><strong>Solo vos podés ver este borrador.</strong><p>Revisá la consigna antes de compartirla con el aula.</p>{onReview?<button type="button" onClick={onReview}>Revisar para asignar</button>:null}</div>:!data ? error ? null : <Notice>Cargando historial…</Notice> : <><div className={styles.historyHeading}><h3>{teacher?'Entregas e intentos':'Mis intentos'}</h3>
      {visibleAttempts.length ? <span>{visibleAttempts.length} {visibleAttempts.length === 1 ? 'intento' : 'intentos'}</span> : null}</div>
      {!teacher && data.delivered ? <Notice>Actividad entregada. Abrí un intento para ver tus respuestas y la devolución del docente.</Notice> : null}
      {data.pendingResubmission ? <Notice>Reentrega pendiente: todavía no es una nueva entrega recibida.</Notice> : null}
      {filter === 'unpublished' ? <p>Entregas con corrección todavía no publicada.</p> : null}
      {!visibleAttempts.length ? <div className="brujula-attempt-empty"><strong>{teacher?filter === 'unpublished' ? 'No hay entregas pendientes de publicación.' : 'No hay intentos registrados.':'Todavía no hiciste una entrega'}</strong>{!teacher?<p>Cuando confirmes una entrega, vas a encontrar su comprobante y devolución acá.</p>:null}</div> : null}
      <ul className="p7-history-list">{visibleAttempts.map(attempt => <li key={attempt.id}>
        <strong>{teacher ? `${attempt.lastName}, ${attempt.firstName} · ` : ''}Intento {attempt.number}</strong>
        <span className={styles.state} data-tone={attempt.status === 'SUBMITTED' ? 'confirmed' : undefined}>{attempt.status === 'SUBMITTED'
          ? attempt.gradePublished ? 'Con devolución' : 'Entregado' : attempt.number > 1 ? 'Reentrega pendiente' : 'Borrador'}</span>
        <p>{attempt.status === 'DRAFT' ? 'Todavía sin entregar' : 'Recepción confirmada'}
          {attempt.submittedAt ? ` · ${new Date(attempt.submittedAt).toLocaleString('es', { timeZone: room.timezone })} · ${room.timezone}` : ''}
          {attempt.submittedLate ? ' · Entrega tardía' : ''}{teacher && !attempt.currentMember ? ' · Estudiante anterior' : ''}</p>
        <div className="p5-actions">{!teacher || attempt.status === 'SUBMITTED' ? <button disabled={busy} onClick={() => void run(() => inspect(attempt.id))}>Consultar intento {attempt.number}</button> : null}
          {!teacher && attempt.status === 'DRAFT' ? <button disabled={busy} onClick={() => void run(async () => {
            const session = await api.call<AttemptSessionData>(`${path}/session`); onClose(); onResume(session);
          })}>Continuar borrador</button> : null}
          {teacher && data.canReopen && attempt.currentMember && attempt.status === 'SUBMITTED'
            && !data.attempts.some(a => a.studentId === attempt.studentId && (a.status === 'DRAFT' || a.number > attempt.number))
            ? <button disabled={busy} onClick={() => { setReopening(attempt); setLocal(''); setOffset(null); setResolution(null); }}>Habilitar otro intento</button> : null}
          {teacher && attempt.status === 'SUBMITTED' ? <button disabled={busy} onClick={() => { setGrading(attempt.id); setSelected(null); setReopening(null); }}>Corregir intento {attempt.number}</button> : null}</div>
      </li>)}</ul></>}
    </div>
    {grading ? <GradingEditor key={grading} api={api} roomId={room.id} attemptId={grading} onClose={() => setGrading(null)}
      onPrevious={previousGrade ? () => setGrading(previousGrade.id) : undefined} onNext={nextGrade ? () => setGrading(nextGrade.id) : undefined} onChanged={async () => { await Promise.all([load(), onChanged()]); }} /> : null}
    {selected?.attempt ? <section className="p7-history-detail" aria-label="Intento histórico confirmado">
      <button onClick={() => setSelected(null)}>{teacher ? 'Volver al historial' : 'Volver a mis intentos'}</button>
      <h3 ref={detailHeading} tabIndex={-1}>{selected.activity.title}</h3><p>Intento {selected.attempt.number} · {selected.attempt.status === 'SUBMITTED' ? 'Entregado' : 'Borrador sin entregar'}</p>
      {selected.attempt.status === 'SUBMITTED' ? <PublishedResult key={selected.attempt.id} api={api} roomId={room.id} attemptId={selected.attempt.id} zone={room.timezone} audience={teacher ? 'teacher' : 'student'}
        pendingContent={<AttemptAnswers api={api} data={selected} />} /> : <AttemptAnswers api={api} data={selected} />}
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
