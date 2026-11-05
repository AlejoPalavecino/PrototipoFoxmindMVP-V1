'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AcademicTarget, ActivityData, ActivitySummary, ActivityType, AttemptSessionData, ClassroomClient, Detail, Material } from './api.ts';
import { Dialog, Notice } from './components.tsx';
import { ActivityAuthoring, ActivityPreview, activityDate, activityTypeLabels } from './ActivityAuthoring.tsx';
import { ActivityGeneration } from './ActivityGeneration.tsx';
import type { ClassroomCreationContext } from './classroom-creation-context.ts';
import { ActivityCurriculum } from './ActivityCurriculum.tsx';
import { AttemptHistory } from './AttemptHistory.tsx';
import { AttemptSession, FirstSubmissionAuthorization } from './AttemptSession.tsx';
import { openActivitySession } from './open-activity-session.ts';
import { EntryIcon } from '../shared-ui/EntryIcon';
import { FoxmindIcon } from '../shared-ui/index.ts';
import { localActivityDraft } from './brujula-authoring-draft.ts';

const teacherViews = [
  { key: 'all', label: 'Todas' },
  { key: 'PUBLISHED', label: 'Publicadas' },
  { key: 'DRAFT', label: 'Borradores' },
  { key: 'WITHDRAWN', label: 'Retiradas' },
] as const;

export function Activities({ api, room, reload, target, onChanged, openAuthoring, submissionFilter, creationContext, onCreationContextConsumed, active = true }: { api: ClassroomClient; room: Detail; reload: () => Promise<void>; target?: AcademicTarget | null; onChanged?: () => void; openAuthoring?: boolean; submissionFilter?: 'unpublished'; creationContext?: ClassroomCreationContext | null; onCreationContextConsumed?: () => void; active?: boolean }) {
  const authoring = useRef<HTMLSelectElement>(null);
  const [assignment, setAssignment] = useState<ClassroomCreationContext>(creationContext ?? { unitId: '', topicIds: [] });
  const [editorContext, setEditorContext] = useState<ClassroomCreationContext | null>(null);
  const seenCreationContext = useRef<ClassroomCreationContext | null>(null);
  const [pendingCreationContext, setPendingCreationContext] = useState<ClassroomCreationContext | null>(null);
  const [generating, setGenerating] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [activities, setActivities] = useState<ActivitySummary[]>([]), [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<ActivityData | null>(null), [preview, setPreview] = useState<ActivityData | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]), [type, setType] = useState<ActivityType>('ASSIGNMENT');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [session, setSession] = useState<AttemptSessionData | null>(null), [authorization, setAuthorization] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ action: 'publish' | 'withdraw'; activity: ActivitySummary } | null>(null);
  const [history, setHistory] = useState<{ activityId: string; attemptId?: string | null; filter?: 'unpublished' } | null>(null);
  const [view, setView] = useState<(typeof teacherViews)[number]['key']>('all');
  const handledTarget = useRef<AcademicTarget | null>(null);
  useEffect(() => { if (!active) { setChoosing(false); setSession(null); setPreview(null); setHistory(null); setAuthorization(null); setConfirm(null); } }, [active]);
  const teacher = room.role === 'teacher', writable = teacher && !room.archived;
  const visibleActivities = !teacher || view === 'all' ? activities : activities.filter(activity => activity.status === view);
  const visibility = useRef({ active });
  if (visibility.current.active !== active) visibility.current = { active };
  useEffect(() => {
    if (!creationContext || seenCreationContext.current === creationContext) return;
    seenCreationContext.current = creationContext;
    if (editing || generating) setPendingCreationContext(creationContext);
    else setAssignment({ ...creationContext, topicIds: [...creationContext.topicIds] });
  }, [creationContext, editing, generating]);
  useEffect(() => { if (active && openAuthoring && writable) setChoosing(true); }, [active, openAuthoring, writable]);
  const load = useCallback(async (signal?: AbortSignal) => {
    const result = await api.call<{ activities: ActivitySummary[] }>(`/${room.id}/activities`, 'GET', undefined, signal);
    if (signal?.aborted) return;
    setActivities(result.activities); setLoaded(true);
  }, [api, room.id]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal).catch(e => {
    if (!controller.signal.aborted) setError(e.message);
  }); return () => controller.abort(); }, [load]);
  useEffect(() => {
    if (!target) { handledTarget.current = null; return; }
    if (!active || handledTarget.current === target) return;
    handledTarget.current = target;
    const controller = new AbortController();
    setSession(null); setPreview(null); setHistory(null); setError('');
    if (target.kind !== 'activity') setHistory({ activityId: target.activityId, attemptId: target.attemptId, filter: submissionFilter });
    else if (teacher) void api.call<ActivityData>(`/${room.id}/activities/${target.activityId}/preview`, 'GET', undefined, controller.signal)
      .then(async data => {
        if (controller.signal.aborted) return;
        if (data.activity.status === 'DRAFT' && writable) {
          const library = await api.call<Material[]>(`/${room.id}/library`, 'GET', undefined, controller.signal);
          if (!controller.signal.aborted) { setEditorContext(null); setMaterials(library); setEditing(data); }
        } else setPreview(data);
      }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    else void openActivitySession(api, room.id, target.activityId, controller.signal)
      .then(data => { if (!controller.signal.aborted) setSession(data); }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [api, room.id, submissionFilter, target, teacher, writable, active]);
  async function run(operation: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('');
    try { await operation(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function refresh(signal?: AbortSignal) { await Promise.all([reload(), load(signal)]); if (!signal?.aborted) onChanged?.(); }
  async function edit(id: string, signal?: AbortSignal) {
    const [data, library] = await Promise.all([api.call<ActivityData>(`/${room.id}/activities/${id}/preview`, 'GET', undefined, signal), api.call<Material[]>(`/${room.id}/library`, 'GET', undefined, signal)]);
    if (signal?.aborted) return;
    setMaterials(library); setEditing(data);
  }
  return <section className={`p7-activities act-page${editing || generating ? ' education-task-active' : ''}`} aria-label="Actividades del aula">
    {editing || generating ? <p className="education-task-context">{room.name} · {generating ? 'Asistente de actividades' : 'Editor de actividad'}</p> : null}
    <header className="p5-section-head fm-desk-activities-heading act-heading"><div><h2>Actividades</h2><p>{teacher ? 'Creá actividades y revisá las entregas del aula.' : 'Consultá las actividades y tus intentos.'}</p></div>
      <div className="p5-actions">{writable && !editing && !generating ? <button className="primary" disabled={busy} onClick={() => setChoosing(true)}>Crear actividad</button> : null}<button disabled={busy} onClick={() => void run(refresh)}>Actualizar actividades</button></div></header>
    {error ? <Notice error>{error} Los cambios no confirmados no se consideran guardados.</Notice> : null}
    {notice ? <Notice>{notice}</Notice> : null}
    {!loaded && !error ? <Notice>Cargando actividades…</Notice> : null}
    {openAuthoring && !writable ? <Notice>No podés crear actividades en esta aula con tus permisos actuales.</Notice> : null}
    {active && choosing && writable && !editing && !generating ? <Dialog title="Crear actividad" className="brujula-activity-choice" onClose={() => !busy && setChoosing(false)}><div className="activity-create-entry">
      <p className="aw-choice-intro">¿Cómo querés preparar la actividad para <strong>{room.name} · {room.division}</strong>?</p>
      <div className="aw-methods"><button className="aw-method" aria-label="Crear manualmente" aria-describedby="activity-manual-description" disabled={busy} onClick={() => void run(async () => {
        setEditorContext({ ...assignment, topicIds: [...assignment.topicIds] });
        const library = await api.call<Material[]>(`/${room.id}/library`, 'GET');
        setMaterials(library); setEditing(localActivityDraft(room, type)); setChoosing(false); onCreationContextConsumed?.();
      })}><span className="aw-method-icon"><FoxmindIcon name="edit" /></span><span><strong>Crear manualmente</strong><small id="activity-manual-description">Escribí las consignas y definí los criterios de evaluación.</small></span><FoxmindIcon name="chevron-right" /></button>
      <button className="aw-method aw-ia activity-ai-choice" aria-label="Crear con IA" aria-describedby="activity-ai-description" disabled={busy} onClick={() => { setChoosing(false); setGenerating(true); onCreationContextConsumed?.(); }}><span className="aw-method-icon"><FoxmindIcon name="spark" /></span><span><strong>Crear con IA</strong><small id="activity-ai-description">Elegí el tema y el objetivo para generar una propuesta editable.</small></span><FoxmindIcon name="chevron-right" /></button></div>
      <label className="brujula-manual-type">Tipo para creación manual<select ref={authoring} aria-label="Tipo de actividad" value={type} onChange={e => setType(e.target.value as ActivityType)}>
        {Object.entries(activityTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      {error ? <Notice error>{error}</Notice> : null}</div></Dialog> : null}
    {generating && writable ? <ActivityGeneration api={api} room={room} creationContext={assignment} onClose={() => setGenerating(false)}
      onApplied={async (id, signal) => { await refresh(signal); if (signal.aborted) return; setEditorContext(null); await edit(id, signal); if (!signal.aborted) setGenerating(false); }} /> : null}
    {editing ? <ActivityAuthoring key={editing.activity.id} api={api} room={room} data={editing} materials={materials} creationContext={editorContext}
      onSaved={async assigned => { await refresh(); setNotice(assigned ? 'Actividad asignada al aula. Publicación confirmada por el servidor.' : 'Cambios confirmados por el servidor. Guardar no publica un borrador.'); }}
      onClose={() => { setEditing(null); setEditorContext(null); }} /> : null}
    {teacher && loaded && activities.length > 0 && !editing && !generating ? <div className="fm-desk-activity-filters" role="group" aria-label="Filtrar actividades por estado">
      {teacherViews.map(({key,label}) => <button type="button" key={key} aria-pressed={view === key} onClick={() => setView(key)}>{label}</button>)}
    </div> : null}
    <div className="p7-activity-list fm-desk-activity-list act-list" hidden={Boolean(editing || generating)}>
    {loaded && visibleActivities.length === 0 ? <p className="p5-empty" role="status">{activities.length ? 'No hay actividades en este estado.' : 'Todavía no hay actividades disponibles.'}</p> : null}
    {visibleActivities.map(activity => <article className={`folder-row act-line interior-activity-${activity.status.toLowerCase()}`} key={activity.id} aria-label={activity.title ?? 'Borrador sin título'}>
      <span className="interior-activity-icon"><EntryIcon name="book" /></span><div className="folder-row-content"><small className="interior-activity-status">{activity.status === 'DRAFT' ? 'Borrador privado' : activity.status === 'WITHDRAWN' ? 'Retirada' : 'Publicada'}</small><small className="interior-activity-type">{activityTypeLabels[activity.type]}</small>
        <h3>{activity.title ?? 'Borrador sin título'}</h3><p className="classroom-activity-deadline">{activityDate(activity.deadlineAt, activity.zone)}</p>
        <ActivityCurriculum room={room} activity={activity} />
        {teacher && activity.locked ? <small>Contenido bloqueado por participación</small> : null}</div>
      <div className="p5-actions folder-row-actions">
        {teacher && activity.status === 'PUBLISHED' ? <button className="primary fm-desk-review-action" disabled={busy} onClick={() => setHistory({ activityId: activity.id, filter: 'unpublished' })}>Revisar pendientes</button> : null}
        <div className="classroom-activity-secondary" role="group" aria-label="Consulta y opciones de la actividad">
        <button className={!teacher ? 'primary' : undefined} disabled={busy} onClick={() => void run(async () => {
        const origin = visibility.current;
        if (teacher) { const result = await api.call<ActivityData>(`/${room.id}/activities/${activity.id}/preview`); if (visibility.current === origin && origin.active) setPreview(result); return; }
        const next = await openActivitySession(api, room.id, activity.id);
        if (activity.type === 'ASSIGNMENT') await refresh();
        if (visibility.current === origin && origin.active) setSession(next);
      })}>{teacher ? 'Vista previa docente' : activity.type === 'ASSIGNMENT' ? 'Abrir trabajo práctico' : 'Consultar actividad'}</button>
        <button disabled={busy} onClick={() => setHistory({ activityId: activity.id })}>{teacher ? 'Ver entregas recibidas' : 'Ver mis intentos'}</button>
        {writable ? <details className="education-activity-more"><summary>Más opciones</summary><div><button disabled={busy} onClick={() => void run(async () => { setEditorContext(null); await edit(activity.id); })}>{activity.status === 'DRAFT' ? 'Continuar borrador' : 'Editar actividad'}</button>
          {activity.status === 'PUBLISHED' ? <button disabled={busy} onClick={() => setAuthorization(activity.id)}>Habilitar primera entrega</button> : null}
          {!activity.locked ? <button disabled={busy} onClick={() => setConfirm({ activity, action: activity.status === 'PUBLISHED' ? 'withdraw' : 'publish' })}>
            {activity.status === 'PUBLISHED' ? 'Retirar actividad' : 'Publicar'}</button> : null}</div></details> : null}</div></div>
    </article>)}</div>
    {active && history ? <AttemptHistory key={history.activityId + (history.attemptId ?? '') + (history.filter ?? '')} api={api} room={room} activityId={history.activityId} attemptId={history.attemptId} filter={teacher ? history.filter : undefined}
      onClose={() => setHistory(null)} onChanged={refresh} onResume={setSession} /> : null}
    {active && preview ? <Dialog title={preview.activity.title ?? 'Vista previa de actividad'} onClose={() => setPreview(null)}>
      <ActivityPreview api={api} room={room} activity={preview.activity} teacher={teacher} />
    </Dialog> : null}
    {active && session ? <AttemptSession key={session.activity.id} api={api} room={room} initial={session} onClose={() => setSession(null)} onChanged={refresh}
      onViewResult={attemptId => { setHistory({ activityId: session.activity.id, attemptId }); setSession(null); }} /> : null}
    {active && authorization ? <FirstSubmissionAuthorization api={api} room={room} activityId={authorization} onClose={() => setAuthorization(null)} onChanged={refresh} /> : null}
    {active && pendingCreationContext ? <Dialog title="Preparar otra actividad" onClose={() => { setPendingCreationContext(null); onCreationContextConsumed?.(); }}>
      <p>Ya tenés una actividad abierta. Para conservar sus cambios locales, volvé y guardalos antes de preparar otra. Los borradores ya guardados y las generaciones iniciadas se conservan.</p>
      <button disabled={busy} onClick={() => { setPendingCreationContext(null); onCreationContextConsumed?.(); }}>Volver a la actividad abierta</button>
      <button disabled={busy} onClick={() => { setEditing(null); setGenerating(false); setChoosing(true); setEditorContext(null); setAssignment(pendingCreationContext); setPendingCreationContext(null); setPreview(null); setHistory(null); onCreationContextConsumed?.(); }}>Descartar cambios locales y continuar</button>
    </Dialog> : null}
    {active && confirm ? <Dialog title={confirm.action === 'publish' ? 'Publicar actividad' : 'Retirar actividad'} onClose={() => !busy && setConfirm(null)}>
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
