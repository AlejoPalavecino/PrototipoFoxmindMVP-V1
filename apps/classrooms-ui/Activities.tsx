'use client';
import { useCallback, useEffect, useState } from 'react';
import type { ActivityData, ActivitySummary, ActivityType, AttemptSessionData, ClassroomClient, Detail, Material } from './api.ts';
import { Dialog, Notice } from './components.tsx';
import { ActivityAuthoring, ActivityPreview, activityDate, activityTypeLabels } from './ActivityAuthoring.tsx';
import { AssignmentSubmissions } from './AssignmentSubmissions.tsx';
import { AttemptSession, FirstSubmissionAuthorization } from './AttemptSession.tsx';

export function Activities({ api, room, reload }: { api: ClassroomClient; room: Detail; reload: () => Promise<void> }) {
  const [activities, setActivities] = useState<ActivitySummary[]>([]), [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<ActivityData | null>(null), [preview, setPreview] = useState<ActivityData | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]), [type, setType] = useState<ActivityType>('ASSIGNMENT');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [session, setSession] = useState<AttemptSessionData | null>(null), [authorization, setAuthorization] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ action: 'publish' | 'withdraw'; activity: ActivitySummary } | null>(null);
  const [submissions, setSubmissions] = useState<string | null>(null);
  const teacher = room.role === 'teacher', writable = teacher && !room.archived;
  const load = useCallback(async (signal?: AbortSignal) => {
    const result = await api.call<{ activities: ActivitySummary[] }>(`/${room.id}/activities`, 'GET', undefined, signal);
    setActivities(result.activities); setLoaded(true);
  }, [api, room.id]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal).catch(e => {
    if (!controller.signal.aborted) setError(e.message);
  }); return () => controller.abort(); }, [load]);
  async function run(operation: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('');
    try { await operation(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function refresh() { await Promise.all([reload(), load()]); }
  async function edit(id: string) {
    const [data, library] = await Promise.all([api.call<ActivityData>(`/${room.id}/activities/${id}/preview`), api.call<Material[]>(`/${room.id}/library`)]);
    setMaterials(library); setEditing(data);
  }
  return <section className="p7-activities" aria-label="Actividades del aula">
    <header className="p5-section-head"><div><h2>Actividades</h2><p>{teacher ? 'Prepara borradores privados y publica cuando estén listos.' : 'Las actividades publicadas de tu aula.'}</p></div>
      <button disabled={busy} onClick={() => void run(refresh)}>Actualizar actividades</button></header>
    {error ? <Notice error>{error} Los cambios no confirmados no se consideran guardados.</Notice> : null}
    {notice ? <Notice>{notice}</Notice> : null}
    {!loaded && !error ? <Notice>Cargando actividades…</Notice> : null}
    {writable && !editing ? <div className="p7-create"><label>Tipo de actividad<select aria-label="Tipo de actividad" value={type} onChange={e => setType(e.target.value as ActivityType)}>
      {Object.entries(activityTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <button className="primary" disabled={busy} onClick={() => void run(async () => {
        const created = await api.call<{ id: string }>(`/${room.id}/activities`, 'POST', { revision: room.revision, operation: { action: 'create', type } });
        await refresh(); await edit(created.id);
      })}>Crear borrador de actividad</button></div> : null}
    {editing ? <ActivityAuthoring key={editing.activity.id} api={api} room={room} data={editing} materials={materials}
      onSaved={async () => { await refresh(); setNotice('Cambios confirmados por el servidor. Guardar no publica un borrador.'); }}
      onClose={() => setEditing(null)} /> : null}
    {loaded && activities.length === 0 ? <p className="p5-empty">Todavía no hay actividades disponibles.</p> : null}
    <div className="p7-activity-list">{activities.map(activity => <article key={activity.id} aria-label={activity.title ?? 'Borrador sin título'}>
      <div><small>{activityTypeLabels[activity.type]} · {activity.status === 'DRAFT' ? 'Borrador privado' : activity.status === 'WITHDRAWN' ? 'Retirada' : 'Publicada'}</small>
        <h3>{activity.title ?? 'Borrador sin título'}</h3><p>{activityDate(activity.deadlineAt, activity.zone)}</p>
        {activity.locked ? <small>Contenido bloqueado por participación</small> : null}</div>
      <div className="p5-actions"><button disabled={busy} onClick={() => void run(async () => {
        if (teacher) { setPreview(await api.call<ActivityData>(`/${room.id}/activities/${activity.id}/preview`)); return; }
        let next = await api.call<AttemptSessionData>(`/${room.id}/activities/${activity.id}/session`);
        if (activity.type === 'ASSIGNMENT' && next.canStart) {
          if (!api.attempt) throw new Error('El flujo de intentos no está disponible.');
          next = await api.attempt<AttemptSessionData>(`/${room.id}/activities/${activity.id}/start`, {}); await refresh();
        }
        setSession(next);
      })}>{teacher ? 'Vista previa docente' : activity.type === 'ASSIGNMENT' ? 'Abrir trabajo práctico' : 'Consultar actividad'}</button>
        {teacher && activity.type === 'ASSIGNMENT' ? <button disabled={busy} onClick={() => setSubmissions(activity.id)}>Ver entregas recibidas</button> : null}
        {writable ? <><button disabled={busy} onClick={() => void run(() => edit(activity.id))}>{activity.status === 'DRAFT' ? 'Continuar borrador' : 'Editar actividad'}</button>
          {activity.status === 'PUBLISHED' ? <button disabled={busy} onClick={() => setAuthorization(activity.id)}>Habilitar primera entrega</button> : null}
          {!activity.locked ? <button disabled={busy} onClick={() => setConfirm({ activity, action: activity.status === 'PUBLISHED' ? 'withdraw' : 'publish' })}>
            {activity.status === 'PUBLISHED' ? 'Retirar actividad' : 'Publicar'}</button> : null}</> : null}</div>
    </article>)}</div>
    {submissions ? <AssignmentSubmissions api={api} room={room} activityId={submissions} onClose={() => setSubmissions(null)} /> : null}
    {preview ? <Dialog title={preview.activity.title ?? 'Vista previa de actividad'} onClose={() => setPreview(null)}>
      <ActivityPreview api={api} activity={preview.activity} teacher={teacher} />
    </Dialog> : null}
    {session ? <AttemptSession key={session.activity.id} api={api} room={room} initial={session} onClose={() => setSession(null)} onChanged={refresh} /> : null}
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
