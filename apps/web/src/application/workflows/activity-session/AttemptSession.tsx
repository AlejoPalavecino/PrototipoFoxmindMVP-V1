'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ActivityEligibilityData, AttemptEditor, AttemptSessionData } from '../../../../../../src/core/contracts/participation.ts';
import type { ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import type { DeadlineResolution } from '../../../../../../src/core/contracts/activities.ts';
import type { Detail } from '../../../../../../src/core/contracts/classrooms.ts';
import { PracticalAttempt } from '../../../features/participation/index.ts';
import { QuestionnaireAttempt } from '../../../features/participation/index.ts';
import { createQuestionnaireAttemptApi, createPracticalAttemptApi, createAttemptAttachmentsApi, createAttemptReadingApi } from '../../../features/participation/api.ts';
import { FoxmindIcon } from '../../../../../shared-ui/index.ts';
import { activityDate } from '../../../../../shared-ui/academic-date.ts';
import { Dialog, Notice } from '../../../../../shared-ui/feedback.tsx';
import type { AttemptExitRef } from '../../../features/participation/index.ts';
import styles from './activity-session.module.css';
import { ActivityContext, ActivityMaterials } from './ActivityPreview.tsx';
import { activityTypeLabels, EvaluationRubric } from '../../../features/activity-authoring/index.ts';
import { ActivityScreen } from './ActivityScreen.tsx';

/** Capabilities live only in this mounted tab's memory, never URLs, cookies or shared storage. */
export function AttemptSession({ api, room, initial, onClose, onChanged, onViewResult, active = true }: {
  api: ClassroomClient; room: Detail; initial: AttemptSessionData; onClose: () => void; onChanged: () => Promise<void>;
  onViewResult?: (attemptId: string) => void; active?: boolean;
}) {
  const [data, setData] = useState(initial), [editor, setEditor] = useState<AttemptEditor | null>(initial.editor ?? null);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [confirm, setConfirm] = useState(false);
  const [controlWarning, setControlWarning] = useState(false), previousEpoch = useRef(initial.attempt?.epoch);
  const previousAttempt = useRef(initial.attempt?.id);
  const exitRef: AttemptExitRef = useRef(null);
  const [leaving, setLeaving] = useState(false);
  const [tool, setTool] = useState<'guide' | 'materials' | null>(null);
  const path = `/${room.id}/activities/${initial.activity.id}`;
  const accept = useCallback((next: AttemptSessionData) => {
    // A focus read started before takeover must not replace the newer editor capability/session.
    if (next.attempt?.id === previousAttempt.current && next.attempt?.epoch !== undefined && previousEpoch.current !== undefined
      && BigInt(next.attempt.epoch) < BigInt(previousEpoch.current)) return;
    if (previousEpoch.current !== undefined && next.attempt?.epoch !== previousEpoch.current && next.attempt?.status === 'DRAFT' && !next.editor) setControlWarning(true);
    previousEpoch.current = next.attempt?.epoch;
    previousAttempt.current = next.attempt?.id;
    setData(next);
    setEditor(previous => next.editor ?? (previous && next.attempt?.epoch === previous.epoch ? previous : null));
  }, []);
  const refresh = useCallback(async () => {
    accept(await api.call<AttemptSessionData>(`${path}/session`)); await onChanged();
  }, [api, path, accept, onChanged]);
  useEffect(() => {
    if (!active) return;
    const focus = () => { void refresh().catch(e => setError(e.message)); };
    window.addEventListener('focus', focus);
    return () => window.removeEventListener('focus', focus);
  }, [active, refresh]);
  async function run(action: () => Promise<void>) {
    setBusy(true); setError('');
    try { await action(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  const ownsEditor = !!editor && data.attempt?.epoch === editor.epoch && data.canTransfer;
  // Operations follow the editor capability (token and epoch), not each refreshed copy of it.
  const editorToken = ownsEditor ? editor.token : undefined, editorEpoch = ownsEditor ? editor.epoch : undefined;
  const activeEditor = useMemo(() => editorToken !== undefined && editorEpoch !== undefined ? { token: editorToken, epoch: editorEpoch } : null, [editorToken, editorEpoch]);
  const attemptId = data.attempt?.id ?? null;
  const readingOperations = useMemo(() => createAttemptReadingApi(api), [api]);
  const attemptOperations = useMemo(() => ({
    questionnaire: createQuestionnaireAttemptApi(api, room.id, attemptId, activeEditor),
    practical: createPracticalAttemptApi(api, room.id, attemptId, activeEditor),
    attachments: createAttemptAttachmentsApi(api, room.id, attemptId, activeEditor),
  }), [api, room.id, attemptId, activeEditor]);
  const { activity, attempt } = data;
  function requestClose() {
    if (exitRef.current?.busy) return;
    if (exitRef.current?.dirty) { setError(''); setLeaving(true); }
    else onClose();
  }
  const deadline = activityDate(data.reception.deadlineAt, activity.zone);
  const guide = <div className={styles.brief}>
    <section className={styles.instruction}><h3>Qué tenés que hacer</h3><p className="p7-multiline">{activity.instructions || 'Sin consigna adicional.'}</p></section>
    {activity.objective ? <section><h3>Objetivo de aprendizaje</h3><p className="p7-multiline">{activity.objective}</p></section> : null}
    {activity.teacherComment ? <section><h3>Comentario docente</h3><p className="p7-multiline">{activity.teacherComment}</p></section> : null}
    <EvaluationRubric criteria={activity.evaluationRubric}/>
  </div>;
  const tools = <div className={styles.focusTools}>
    <button type="button" onClick={() => setTool('guide')}><FoxmindIcon name="book"/>Consigna y criterios</button>
    <button type="button" onClick={() => setTool('materials')}><FoxmindIcon name="folder"/>Materiales</button>
    <button type="button" disabled={busy} aria-label="Actualizar estado confirmado" onClick={() => {
      if (!exitRef.current?.busy) void run(refresh);
    }}><FoxmindIcon name="refresh"/>Actualizar</button>
  </div>;
  return <ActivityScreen title={activity.title ?? 'Actividad'} label={activity.title ?? 'Actividad'} kicker={activityTypeLabels[activity.type]}
    metadata={deadline} subtitle={room.name} onClose={requestClose} actions={attempt?.status === 'DRAFT' ? tools : undefined} overview={attempt?.status === 'SUBMITTED'} focused>
    <div className={attempt ? styles.focusSolver : `brujula-solver-layout ${styles.solver}`}>
    <section className="p7-attempt" aria-label={activity.type === 'EVALUATION' ? 'Evaluación · sesión reducida' : 'Sesión de actividad'}>
      {!attempt ? guide : null}
      {attempt?.status === 'SUBMITTED' && onViewResult ? <button className="parity-result-link" onClick={() => onViewResult(attempt.id)}>Consultar devolución</button> : null}
      {error ? <Notice error>{error} No se confirmaron cambios. Vuelve a consultar el estado antes de continuar.</Notice> : null}
      {controlWarning && attempt?.status === 'DRAFT' ? <Notice>Recuperamos tus respuestas guardadas. Los cambios sin guardar de otra pestaña no se transfieren.</Notice> : null}
      {!data.expected ? <Notice>Solo consulta: esta actividad no forma parte de tus entregas esperadas. El docente puede habilitar la primera entrega con un plazo individual futuro.</Notice> : null}
      {data.archived ? <Notice>Aula archivada: solo consulta.</Notice> : !data.reception.open ? <Notice>Recepción cerrada. Puedes consultar el estado confirmado; comenzar o abrir antes no reserva una entrega a tiempo.</Notice> : null}
      {attempt ? <><p className="sr-only">Intento {attempt.number} · {attempt.status === 'SUBMITTED' ? 'Entregado · solo consulta' : 'Borrador · todavía sin entregar'}</p>
        {attempt.status === 'DRAFT' && !ownsEditor && data.canTransfer ? <div className="student-resume"><p>Tu borrador guardado está listo. Para seguir trabajando, activá la edición en esta pestaña.</p>
          <button className="primary" disabled={busy} onClick={() => setConfirm(true)}>Continuar en esta pestaña</button></div> : null}
      </> : data.canStart ? <p>{activity.type === 'ASSIGNMENT' ? 'Abrir las instrucciones inicia el primer intento y bloquea su contenido.' : 'Consultar no inicia un intento. Presiona Comenzar cuando quieras iniciarlo.'}</p> : null}
      {confirm && attempt ? <section className="p7-transfer-confirm" aria-label="Confirmar transferencia de edición">
        <h4>Continuar con tus respuestas guardadas</h4><p>La otra pestaña o dispositivo dejará de poder guardar y entregar. Recuperarás el último borrador guardado; los cambios sin guardar de la otra sesión no se transfieren.</p>
        <div className="p5-actions"><button disabled={busy} onClick={() => setConfirm(false)}>Cancelar transferencia</button>
          <button className="primary" disabled={busy} onClick={() => void run(async () => {
            if (!api.attempt) throw new Error('El flujo de intentos no está disponible.');
            accept(await api.attempt<AttemptSessionData>(`/${room.id}/attempts/${attempt.id}/transfer`, { revision: attempt.revision }));
            setControlWarning(false);
            setConfirm(false);
          })}>Confirmar transferencia</button></div>
      </section> : null}
      {data.canStart ? <button className="primary" disabled={busy} onClick={() => void run(async () => {
        if (!api.attempt) throw new Error('El flujo de intentos no está disponible.');
        accept(await api.attempt<AttemptSessionData>(`${path}/start`, {})); await onChanged();
      })}>{activity.type === 'ASSIGNMENT' ? 'Abrir instrucciones e iniciar intento' : 'Comenzar'}</button> : null}
      {!attempt ? activity.questions.map((question, index) => <article key={question.id ?? index}>
        <h4>Pregunta {index + 1} · {question.points} puntos</h4><p className="p7-multiline">{question.prompt}</p>
        <ul>{question.options.map(option => <li key={option.id ?? option.text}>{option.text}</li>)}</ul>
      </article>) : null}
      {activity.type === 'ASSIGNMENT' ? <PracticalAttempt key={`${attempt?.id}:${attempt?.epoch}`} operations={attemptOperations.practical} attachments={attemptOperations.attachments} data={data} editor={activeEditor} refresh={refresh} exitRef={exitRef} onClose={onClose} />
        : attempt ? <QuestionnaireAttempt key={`${attempt.id}:${attempt.epoch}:${ownsEditor ? 'edit' : 'view'}`} operations={attemptOperations.questionnaire} reading={readingOperations}
          data={data} editor={ownsEditor ? editor : null} refresh={refresh} exitRef={exitRef} onClose={onClose} /> : null}
      {!attempt && error ? <button className={styles.refreshAttempt} disabled={busy} onClick={() => void run(refresh)}>Actualizar estado confirmado</button> : null}
    </section>{!attempt ? <ActivityContext api={api} activity={activity} room={room} effectiveDeadlineAt={data.reception.deadlineAt}/> : null}</div>
    {tool ? <Dialog title={tool === 'guide' ? 'Consigna y criterios' : 'Materiales de la actividad'} onClose={() => setTool(null)}>
      {tool === 'guide' ? guide : <ActivityMaterials api={api} activity={activity}/>}
    </Dialog> : null}
    {leaving ? <Dialog title="Volver a actividades" onClose={() => { if (!busy) setLeaving(false); }}>
      <p>Hay cambios sin guardar. Podés seguir trabajando o salir con el último borrador guardado.</p>
      {error ? <Notice error>{error}</Notice> : null}
      <footer className="p5-form-footer">
        <button type="button" disabled={busy} onClick={() => setLeaving(false)}>Seguir trabajando</button>
        <button type="button" disabled={busy} onClick={onClose}>Descartar cambios</button>
        {exitRef.current?.save ? <button type="button" className="primary" disabled={busy} onClick={() => void run(async () => {
          await exitRef.current?.save?.(); onClose();
        })}>Guardar borrador y salir</button> : null}
      </footer>
    </Dialog> : null}
  </ActivityScreen>;
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
