'use client';
import { useCallback, useEffect, useState } from 'react';
import type { AttemptHistoryData, AttemptHistoryRow, AttemptSessionData, ClassroomClient, DeadlineResolution, Detail } from './api.ts';
import { Dialog, Notice } from './components.tsx';
import { activityDate } from './ActivityAuthoring.tsx';
import { GradingEditor } from './GradingEditor.tsx';
import { PublishedResult } from './PublishedResult.tsx';

export function AttemptHistory({ api, room, activityId, attemptId, onClose, onChanged, onResume }: {
  api: ClassroomClient; room: Detail; activityId: string; attemptId?: string | null; onClose: () => void;
  onChanged: () => Promise<void>; onResume: (data: AttemptSessionData) => void;
}) {
  const teacher = room.role === 'teacher', path = `/${room.id}/activities/${activityId}`;
  const [data, setData] = useState<AttemptHistoryData | null>(null), [selected, setSelected] = useState<AttemptSessionData | null>(null);
  const [reopening, setReopening] = useState<AttemptHistoryRow | null>(null), [local, setLocal] = useState('');
  const [resolution, setResolution] = useState<DeadlineResolution | null>(null), [offset, setOffset] = useState<number | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [grading, setGrading] = useState<string | null>(null);
  const load = useCallback(async (signal?: AbortSignal) => {
    setData(await api.call<AttemptHistoryData>(`${path}/${teacher ? 'history-submissions' : 'history'}`, 'GET', undefined, signal));
  }, [api, path, teacher]);
  const inspect = useCallback(async (id: string) => setSelected(await api.call<AttemptSessionData>(`/${room.id}/attempts/${id}/history`)), [api, room.id]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal).then(async () => {
    if (attemptId && !controller.signal.aborted) await inspect(attemptId);
  }).catch(e => { if (!controller.signal.aborted) setError(e.message); }); return () => controller.abort(); }, [load, inspect, attemptId]);
  async function run(work: () => Promise<void>) { setBusy(true); setError(''); try { await work(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  async function deadline() {
    if (!local) return null;
    const next = await api.call<DeadlineResolution>(`/${room.id}/activities/deadline`, 'POST', { local }); setResolution(next);
    if (next.reason === 'NONEXISTENT') throw new Error('Esa hora no existe en la zona del aula. Selecciona otra.');
    if (next.reason === 'AMBIGUOUS' && offset === null) throw new Error('Selecciona explícitamente una ocurrencia de la hora repetida.');
    return offset === null ? { local } : { local, offsetMinutes: offset };
  }
  return <Dialog title={teacher ? 'Entregas e historial de intentos' : 'Mi historial de intentos'} onClose={onClose}>
    {error ? <Notice error>{error} Actualiza el historial antes de volver a intentar.</Notice> : null}
    {!data ? <Notice>Cargando historial…</Notice> : <>
      <h3>{data.activity.title}</h3><p>{activityDate(data.activity.deadlineAt, data.activity.zone)}</p>
      {!teacher && data.delivered ? <Notice>Actividad entregada. Un nuevo borrador pendiente no reemplaza la entrega anterior ni su calificación publicada.</Notice> : null}
      {data.pendingResubmission ? <Notice>Reentrega pendiente: todavía no es una nueva entrega recibida.</Notice> : null}
      {!data.attempts.length ? <p>No hay intentos registrados.</p> : null}
      <ul className="p7-history-list">{data.attempts.map(attempt => <li key={attempt.id}>
        <strong>{teacher ? `${attempt.lastName}, ${attempt.firstName} · ` : ''}Intento {attempt.number}</strong>
        <p>{attempt.status === 'SUBMITTED' ? 'Entregado' : attempt.number > 1 ? 'Reentrega pendiente' : 'Borrador · no entregado'}
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
      </li>)}</ul>
      <button disabled={busy} onClick={() => void run(() => load())}>Actualizar historial</button>
    </>}
    {grading ? <GradingEditor api={api} roomId={room.id} attemptId={grading} onClose={() => setGrading(null)} onChanged={async () => { await Promise.all([load(), onChanged()]); }} /> : null}
    {selected?.attempt ? <section className="p7-history-detail" aria-label="Intento histórico confirmado"><h4>Intento {selected.attempt.number} · solo consulta</h4>
      {selected.activity.questions.map((question, index) => { const answer = selected.attempt!.answers.find(a => a.questionId === question.id);
        return <article key={question.id}><h4>Pregunta {index + 1}</h4><p className="p7-multiline">{question.prompt}</p>
          {question.type === 'DEVELOPMENT' ? <p className="p7-multiline">{answer?.text || 'Sin respuesta'}</p>
            : <ul>{question.options.filter(option => answer?.optionIds.includes(option.id!)).map(option => <li key={option.id}>{option.text}</li>)}</ul>}</article>; })}
      <ul>{selected.attempt.attachments?.map(file => <li key={file.id}>{file.ready ? <a href={api.fileUrl(file.id)} target="_blank" rel="noreferrer">Descargar {file.name}</a> : `${file.name} · No disponible`}</li>)}</ul>
      {selected.attempt.status === 'SUBMITTED' ? <PublishedResult key={selected.attempt.id} api={api} roomId={room.id} attemptId={selected.attempt.id} /> : null}
    </section> : null}
    {reopening ? <section aria-label="Confirmar nuevo intento"><h4>Habilitar otro intento para {reopening.firstName} {reopening.lastName}</h4>
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
    </section> : null}
  </Dialog>;
}
