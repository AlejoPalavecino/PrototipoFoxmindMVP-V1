'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AcademicTarget, ActivityData, ActivitySummary, ActivityType, AttemptSessionData, ClassroomClient, Detail, Material } from './api.ts';
import { Dialog, Notice } from './components.tsx';
import { ActivityAuthoring, ActivityPreview, activityDate, activityTypeLabels } from './ActivityAuthoring.tsx';
import { ActivityGeneration } from './ActivityGeneration.tsx';
import { ActivityCurriculum } from './ActivityCurriculum.tsx';
import { AttemptHistory } from './AttemptHistory.tsx';
import { AttemptSession, FirstSubmissionAuthorization } from './AttemptSession.tsx';
import { openActivitySession } from './open-activity-session.ts';

export function Activities({ api, room, reload, target, onChanged, openAuthoring, submissionFilter }: { api: ClassroomClient; room: Detail; reload: () => Promise<void>; target?: AcademicTarget | null; onChanged?: () => void; openAuthoring?: boolean; submissionFilter?: 'unpublished' }) {
  const authoring = useRef<HTMLSelectElement>(null);
  const [generating, setGenerating] = useState(false);
  const [activities, setActivities] = useState<ActivitySummary[]>([]), [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<ActivityData | null>(null), [preview, setPreview] = useState<ActivityData | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]), [type, setType] = useState<ActivityType>('ASSIGNMENT');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [session, setSession] = useState<AttemptSessionData | null>(null), [authorization, setAuthorization] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ action: 'publish' | 'withdraw'; activity: ActivitySummary } | null>(null);
  const [history, setHistory] = useState<{ activityId: string; attemptId?: string | null } | null>(null);
  const teacher = room.role === 'teacher', writable = teacher && !room.archived;
  useEffect(() => { if (openAuthoring && writable) authoring.current?.focus(); }, [openAuthoring, writable]);
  const load = useCallback(async (signal?: AbortSignal) => {
    const result = await api.call<{ activities: ActivitySummary[] }>(`/${room.id}/activities`, 'GET', undefined, signal);
    setActivities(result.activities); setLoaded(true);
  }, [api, room.id]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal).catch(e => {
    if (!controller.signal.aborted) setError(e.message);
  }); return () => controller.abort(); }, [load]);
  useEffect(() => {
    if (!target) return;
    const controller = new AbortController();
    setSession(null); setPreview(null); setHistory(null); setError('');
    if (target.kind !== 'activity') setHistory({ activityId: target.activityId, attemptId: target.attemptId });
    else if (teacher) void api.call<ActivityData>(`/${room.id}/activities/${target.activityId}/preview`, 'GET', undefined, controller.signal)
      .then(data => { if (!controller.signal.aborted) setPreview(data); }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    else void openActivitySession(api, room.id, target.activityId, controller.signal)
      .then(data => { if (!controller.signal.aborted) setSession(data); }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [api, room.id, target, teacher]);
  async function run(operation: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('');
    try { await operation(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function refresh() { await Promise.all([reload(), load()]); onChanged?.(); }
  async function edit(id: string) {
    const [data, library] = await Promise.all([api.call<ActivityData>(`/${room.id}/activities/${id}/preview`), api.call<Material[]>(`/${room.id}/library`)]);
    setMaterials(library); setEditing(data);
  }
  return <section className={`p7-activities${editing || generating ? ' education-task-active' : ''}`} aria-label="Actividades del aula">
    {editing || generating ? <p className="education-task-context">{room.name} · {generating ? 'Asistente de actividades' : 'Editor de actividad'}</p> : null}
    <header className="p5-section-head"><div><h2>Actividades</h2><p>{teacher ? 'Prepara borradores privados y publica cuando estén listos.' : 'Las actividades publicadas de tu aula.'}</p></div>
      <button disabled={busy} onClick={() => void run(refresh)}>Actualizar actividades</button></header>
    {error ? <Notice error>{error} Los cambios no confirmados no se consideran guardados.</Notice> : null}
    {notice ? <Notice>{notice}</Notice> : null}
    {!loaded && !error ? <Notice>Cargando actividades…</Notice> : null}
    {openAuthoring && !writable ? <Notice>No podés crear actividades en esta aula con tus permisos actuales.</Notice> : null}
    {writable && !editing && !generating ? <div className="p7-create"><label>Tipo de actividad<select ref={authoring} aria-label="Tipo de actividad" value={type} onChange={e => setType(e.target.value as ActivityType)}>
      {Object.entries(activityTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <button className="primary" disabled={busy} onClick={() => void run(async () => {
        const created = await api.call<{ id: string }>(`/${room.id}/activities`, 'POST', { revision: room.revision, operation: { action: 'create', type } });
        await refresh(); await edit(created.id);
      })}>Crear manualmente</button>
      <button disabled={busy} onClick={() => setGenerating(true)}>Generar con IA</button></div> : null}
    {generating && writable ? <ActivityGeneration api={api} room={room} onClose={() => setGenerating(false)}
      onApplied={async id => { await refresh(); await edit(id); setGenerating(false); }} /> : null}
    {editing ? <ActivityAuthoring key={editing.activity.id} api={api} room={room} data={editing} materials={materials}
      onSaved={async () => { await refresh(); setNotice('Cambios confirmados por el servidor. Guardar no publica un borrador.'); }}
      onClose={() => setEditing(null)} /> : null}
    {loaded && activities.length === 0 ? <p className="p5-empty">Todavía no hay actividades disponibles.</p> : null}
    <div className="p7-activity-list" hidden={Boolean(editing || generating)}>{activities.map(activity => <article className="folder-row" key={activity.id} aria-label={activity.title ?? 'Borrador sin título'}>
      <div className="folder-row-content"><small>{activityTypeLabels[activity.type]} · {activity.status === 'DRAFT' ? 'Borrador privado' : activity.status === 'WITHDRAWN' ? 'Retirada' : 'Publicada'}</small>
        <h3>{activity.title ?? 'Borrador sin título'}</h3><p>{activityDate(activity.deadlineAt, activity.zone)}</p>
        <ActivityCurriculum room={room} activity={activity} />
        {teacher && activity.locked ? <small>Contenido bloqueado por participación</small> : null}</div>
      <div className="p5-actions folder-row-actions"><button disabled={busy} onClick={() => void run(async () => {
        if (teacher) { setPreview(await api.call<ActivityData>(`/${room.id}/activities/${activity.id}/preview`)); return; }
        const next = await openActivitySession(api, room.id, activity.id);
        if (activity.type === 'ASSIGNMENT') await refresh();
        setSession(next);
      })}>{teacher ? 'Vista previa docente' : activity.type === 'ASSIGNMENT' ? 'Abrir trabajo práctico' : 'Consultar actividad'}</button>
        <button disabled={busy} onClick={() => setHistory({ activityId: activity.id })}>{teacher ? 'Ver entregas recibidas' : 'Ver mis intentos'}</button>
        {writable ? <details className="education-activity-more"><summary>Más opciones</summary><div><button disabled={busy} onClick={() => void run(() => edit(activity.id))}>{activity.status === 'DRAFT' ? 'Continuar borrador' : 'Editar actividad'}</button>
          {activity.status === 'PUBLISHED' ? <button disabled={busy} onClick={() => setAuthorization(activity.id)}>Habilitar primera entrega</button> : null}
          {!activity.locked ? <button disabled={busy} onClick={() => setConfirm({ activity, action: activity.status === 'PUBLISHED' ? 'withdraw' : 'publish' })}>
            {activity.status === 'PUBLISHED' ? 'Retirar actividad' : 'Publicar'}</button> : null}</div></details> : null}</div>
    </article>)}</div>
    {history ? <AttemptHistory key={history.activityId + (history.attemptId ?? '')} api={api} room={room} activityId={history.activityId} attemptId={history.attemptId} filter={teacher ? submissionFilter : undefined}
      onClose={() => setHistory(null)} onChanged={refresh} onResume={setSession} /> : null}
    {preview ? <Dialog title={preview.activity.title ?? 'Vista previa de actividad'} onClose={() => setPreview(null)}>
      <ActivityPreview api={api} room={room} activity={preview.activity} teacher={teacher} />
    </Dialog> : null}
    {session ? <AttemptSession key={session.activity.id} api={api} room={room} initial={session} onClose={() => setSession(null)} onChanged={refresh}
      onViewResult={attemptId => { setHistory({ activityId: session.activity.id, attemptId }); setSession(null); }} /> : null}
    {authorization ? <FirstSubmissionAuthorization api={api} room={room} activityId={authorization} onClose={() => setAuthorization(null)} onChanged={refresh} /> : null}
    {confirm ? <Dialog title={confirm.action === 'publish' ? 'Publicar actividad' : 'Retirar actividad'} onClose={() => !busy && setConfirm(null)}>
      <p>{confirm.action === 'publish' ? 'La actividad guardada será visible para los estudiantes. Los cambios que no hayas guardado en el editor no se publicarán.' : 'La actividad dejará de estar visible para estudiantes. Solo se permite antes de la primera participación.'}</p>
      {error ? <Notice error>{error}</Notice> : null}
      <footer className="p5-form-footer"><button disabled={busy} onClick={() => setConfirm(null)}>Cancelar</button>
        <button className="primary" disabled={busy} onClick={() => void run(async () => {
          await api.call(`/${room.id}/activities`, 'POST', { revision: room.revision, operation: { action: confirm.action, id: confirm.activity.id } });
          setEditing(null); setConfirm(null); await refresh(); setNotice('Estado de publicación confirmado.');
        })}>{confirm.action === 'publish' ? 'Confirmar publicación' : 'Confirmar retiro'}</button></footer>
    </Dialog> : null}
  </section>;
}
