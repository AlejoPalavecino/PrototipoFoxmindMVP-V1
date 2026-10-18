'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ActivityEligibilityData, AttemptEditor, AttemptSessionData, ClassroomClient, DeadlineResolution, Detail } from './api.ts';
import { PracticalAttempt } from './PracticalAttempt.tsx';
import { QuestionnaireAttempt } from './QuestionnaireAttempt.tsx';
import { Dialog, Notice } from './components.tsx';
import { activityDate, activityTypeLabels } from './ActivityAuthoring.tsx';

/** Capabilities live only in this mounted tab's memory, never URLs, cookies or shared storage. */
export function AttemptSession({ api, room, initial, onClose, onChanged }: {
  api: ClassroomClient; room: Detail; initial: AttemptSessionData; onClose: () => void; onChanged: () => Promise<void>;
}) {
  const [data, setData] = useState(initial), [editor, setEditor] = useState<AttemptEditor | null>(initial.editor ?? null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [confirm, setConfirm] = useState(false);
  const [controlWarning, setControlWarning] = useState(false), previousEpoch = useRef(initial.attempt?.epoch);
  const previousAttempt = useRef(initial.attempt?.id);
  const path = `/${room.id}/activities/${initial.activity.id}`;
  const accept = useCallback((next: AttemptSessionData) => {
    // A focus read started before takeover must not replace the newer editor capability/session.
    if (next.attempt?.id === previousAttempt.current && next.attempt?.epoch !== undefined && previousEpoch.current !== undefined
      && BigInt(next.attempt.epoch) < BigInt(previousEpoch.current)) return;
    if (previousEpoch.current !== undefined && next.attempt?.epoch !== previousEpoch.current && next.attempt?.status === 'DRAFT') setControlWarning(true);
    previousEpoch.current = next.attempt?.epoch;
    previousAttempt.current = next.attempt?.id;
    setData(next);
    setEditor(previous => next.editor ?? (previous && next.attempt?.epoch === previous.epoch ? previous : null));
  }, []);
  const refresh = useCallback(async () => accept(await api.call<AttemptSessionData>(`${path}/session`)), [api, path, accept]);
  useEffect(() => {
    const focus = () => { void refresh().catch(e => setError(e.message)); };
    window.addEventListener('focus', focus);
    return () => window.removeEventListener('focus', focus);
  }, [refresh]);
  async function run(action: () => Promise<void>) {
    setBusy(true); setError('');
    try { await action(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const ownsEditor = !!editor && data.attempt?.epoch === editor.epoch && data.canTransfer;
  const { activity, attempt } = data;
  return <Dialog title={activity.title ?? 'Actividad'} onClose={onClose}>
    <section className="p7-attempt" aria-label={activity.type === 'EVALUATION' ? 'Evaluación · sesión reducida' : 'Sesión de actividad'}>
      <header><small>{activityTypeLabels[activity.type]}</small><p>{activityDate(data.reception.deadlineAt, activity.zone)}</p></header>
      {error ? <Notice error>{error} No se confirmaron cambios. Vuelve a consultar el estado antes de continuar.</Notice> : null}
      {controlWarning ? <Notice>El control de edición cambió. Se cargó el último borrador confirmado; los cambios no confirmados de la sesión anterior no se transfieren.</Notice> : null}
      {!data.expected ? <Notice>Solo consulta: esta actividad no forma parte de tus entregas esperadas. El docente puede habilitar la primera entrega con un plazo individual futuro.</Notice> : null}
      {data.archived ? <Notice>Aula archivada: solo consulta.</Notice> : !data.reception.open ? <Notice>Recepción cerrada. Puedes consultar el estado confirmado; comenzar o abrir antes no reserva una entrega a tiempo.</Notice> : null}
      {attempt ? <><p>Intento {attempt.number} · {attempt.status === 'SUBMITTED' ? 'Entregado · solo consulta' : 'Borrador confirmado · no entregado'}</p>
        <Notice>{ownsEditor ? 'Control de edición en esta pestaña.' : 'Solo consulta en esta pestaña o dispositivo.'} Solo se restaura el último estado confirmado por el servidor.</Notice>
      </> : data.canStart ? <p>{activity.type === 'ASSIGNMENT' ? 'Abrir las instrucciones inicia el primer intento y bloquea su contenido.' : 'Consultar no inicia un intento. Presiona Comenzar cuando quieras iniciarlo.'}</p> : null}
      {data.canStart ? <button className="primary" disabled={busy} onClick={() => void run(async () => {
        if (!api.attempt) throw new Error('El flujo de intentos no está disponible.');
        accept(await api.attempt<AttemptSessionData>(`${path}/start`, {})); await onChanged();
      })}>{activity.type === 'ASSIGNMENT' ? 'Abrir instrucciones e iniciar intento' : 'Comenzar'}</button> : null}
      {activity.instructions ? <p className="p7-multiline">{activity.instructions}</p> : null}
      <ul>{activity.instructionFiles.map(file => <li key={file.id}>{file.ready ? <><a href={api.fileUrl(file.id)} target="_blank" rel="noreferrer">Descargar {file.name}</a>
        {file.extension === 'pdf' ? <> · <a href={api.fileUrl(file.id, true)} target="_blank" rel="noreferrer">Vista previa PDF</a></> : null}</> : `${file.name} · No disponible por revisión de seguridad`}</li>)}</ul>
      <ul>{activity.materials.map(material => <li key={material.id}><a href={api.fileUrl(material.fileId)} target="_blank" rel="noreferrer">{material.title}</a></li>)}</ul>
      {!attempt ? activity.questions.map((question, index) => <article key={question.id ?? index}>
        <h4>Pregunta {index + 1} · {question.points} puntos</h4><p className="p7-multiline">{question.prompt}</p>
        <ul>{question.options.map(option => <li key={option.id ?? option.text}>{option.text}</li>)}</ul>
      </article>) : null}
      {activity.type === 'ASSIGNMENT' ? <PracticalAttempt api={api} classroomId={room.id} data={data} editor={ownsEditor ? editor : null} refresh={refresh} />
        : attempt ? <QuestionnaireAttempt key={`${attempt.id}:${attempt.epoch}:${ownsEditor ? 'edit' : 'view'}`} api={api} classroomId={room.id}
          data={data} editor={ownsEditor ? editor : null} refresh={refresh} /> : null}
      <footer className="p5-form-footer"><button disabled={busy} onClick={() => void run(refresh)}>Actualizar estado confirmado</button>
        {data.canTransfer && !ownsEditor ? <button disabled={busy} onClick={() => setConfirm(true)}>Transferir edición a esta pestaña</button> : null}</footer>
      {confirm && attempt ? <section className="p7-transfer-confirm" aria-label="Confirmar transferencia de edición">
        <h4>Transferir control de edición</h4><p>La pestaña o dispositivo anterior perderá el permiso para guardar, cargar archivos y enviar. Los cambios no confirmados de esa sesión no se transfieren: se restaurará solo el último borrador confirmado. No se crea otro intento ni se entrega la actividad.</p>
        <button disabled={busy} onClick={() => setConfirm(false)}>Cancelar transferencia</button>
        <button className="primary" disabled={busy} onClick={() => void run(async () => {
          if (!api.attempt) throw new Error('El flujo de intentos no está disponible.');
          accept(await api.attempt<AttemptSessionData>(`/${room.id}/attempts/${attempt.id}/transfer`, { revision: attempt.revision }));
          setConfirm(false);
        })}>Confirmar transferencia</button>
      </section> : null}
    </section>
  </Dialog>;
}

export function FirstSubmissionAuthorization({ api, room, activityId, onClose, onChanged }: {
  api: ClassroomClient; room: Detail; activityId: string; onClose: () => void; onChanged: () => Promise<void>;
}) {
  const [roster, setRoster] = useState<ActivityEligibilityData | null>(null), [student, setStudent] = useState('');
  const [local, setLocal] = useState(''), [resolution, setResolution] = useState<DeadlineResolution | null>(null), [offset, setOffset] = useState<number | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => { const controller = new AbortController(); void api.call<ActivityEligibilityData>(`/${room.id}/activities/${activityId}/eligibility`, 'GET', undefined, controller.signal)
    .then(setRoster).catch(e => { if (!controller.signal.aborted) setError(e.message); }); return () => controller.abort(); }, [api, room.id, activityId]);
  async function deadline() {
    const result = await api.call<DeadlineResolution>(`/${room.id}/activities/deadline`, 'POST', { local }); setResolution(result);
    if (result.reason === 'NONEXISTENT') throw new Error('Esa hora no existe en la zona del aula. Selecciona otra.');
    if (result.reason === 'AMBIGUOUS' && offset === null) throw new Error('Selecciona explícitamente una ocurrencia de la hora repetida.');
    return offset === null ? { local } : { local, offsetMinutes: offset };
  }
  async function run(action: () => Promise<void>) { setBusy(true); setError(''); try { await action(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  return <Dialog title="Habilitar primera entrega" onClose={onClose}><form onSubmit={e => { e.preventDefault(); void run(async () => {
    if (!roster) return;
    await api.call(`/${room.id}/activities/${activityId}/authorize-first`, 'POST', { revision: roster.revision, studentId: student, deadline: await deadline() });
    await onChanged(); onClose();
  }); }}>
    <p>Solo estudiantes actuales con actividad de consulta. Esta autorización crea una obligación inicial con un plazo futuro; no crea una entrega ni un intento adicional.</p>
    {error ? <Notice error>{error}</Notice> : null}
    <label>Estudiante para primera entrega<select aria-label="Estudiante para primera entrega" value={student} onChange={e => setStudent(e.target.value)} required>
      <option value="">Selecciona un estudiante</option>{roster?.students.filter(member => !member.expected && member.reason !== null).map(member => <option key={member.studentId} value={member.studentId}>{member.lastName}, {member.firstName}</option>)}</select></label>
    <label>Plazo individual futuro · {room.timezone}<input aria-label="Plazo individual futuro" type="datetime-local" step={60} required value={local}
      onChange={e => { setLocal(e.target.value); setResolution(null); setOffset(null); }} /></label>
    <button type="button" disabled={busy || !local} onClick={() => void run(async () => { await deadline(); })}>Verificar plazo individual</button>
    {resolution?.reason === 'AMBIGUOUS' ? <label>Ocurrencia del plazo individual<select aria-label="Ocurrencia del plazo individual" value={offset ?? ''}
      onChange={e => setOffset(e.target.value === '' ? null : Number(e.target.value))}><option value="">Selecciona una ocurrencia</option>
      {resolution.choices.map(choice => <option key={choice.instant} value={choice.offsetMinutes}>{choice.offset} · {choice.instant}</option>)}</select></label> : null}
    <footer className="p5-form-footer"><button type="button" disabled={busy} onClick={onClose}>Cancelar autorización</button>
      <button className="primary" disabled={busy || !student || !local || !roster?.published}>Confirmar primera entrega</button></footer>
  </form></Dialog>;
}
