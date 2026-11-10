'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AcademicTarget } from '../../../../src/core/contracts/notifications.ts';
import type { ActivityData, ActivitySummary } from '../../../../src/core/contracts/activities.ts';
import type { AttemptSessionData } from '../../../../src/core/contracts/participation.ts';
import type { ClassroomClient } from '../../../../src/core/contracts/academic-client.ts';
import type { Detail } from '../../../../src/core/contracts/classrooms.ts';
import type { Material } from '../../../../src/core/contracts/materials.ts';
import { Dialog, Notice } from '../../../shared-ui/feedback.tsx';
import { ActivityAuthoring, activityTypeLabels } from '../features/activity-authoring/index.ts';
import { ActivityGeneration } from '../features/activity-authoring/index.ts';
import type { ClassroomCreationContext } from '../../../../src/core/contracts/academic-context.ts';
import { AttemptHistory } from './academic-AttemptHistory.tsx';
import { AttemptSession, FirstSubmissionAuthorization } from './academic-AttemptSession.tsx';
import { openActivitySession } from '../features/participation/index.ts';
import { FoxmindIcon } from '../../../shared-ui/index.ts';
import { localActivityDraft } from '../features/activity-authoring/index.ts';
import { consumeActivityResponse } from '../features/participation/index.ts';

const teacherViews = [
  { key: 'all', label: 'Todas' },
  { key: 'PUBLISHED', label: 'Publicadas' },
  { key: 'DRAFT', label: 'Borradores' },
] as const;
const studentViews=[{key:'all',label:'Todas'},{key:'pending',label:'Pendientes'},{key:'submitted',label:'Entregadas'}] as const;
const studentStateLabels={PENDING:'Pendiente',CLOSED:'Plazo cerrado',DRAFT:'En borrador',RESUBMISSION:'Reentrega habilitada',SUBMITTED:'Entregado',REVIEWED:'Con devolución',READ_ONLY:'Solo consulta'};

export function Activities({ api, room, reload, target, onChanged, openAuthoring, submissionFilter, creationContext, onCreationContextConsumed, active = true }: { api: ClassroomClient; room: Detail; reload: () => Promise<void>; target?: AcademicTarget | null; onChanged?: () => void; openAuthoring?: boolean; submissionFilter?: 'unpublished'; creationContext?: ClassroomCreationContext | null; onCreationContextConsumed?: () => void; active?: boolean }) {
  const [assignment, setAssignment] = useState<ClassroomCreationContext>(creationContext ?? { unitId: '', topicIds: [] });
  const [editorContext, setEditorContext] = useState<ClassroomCreationContext | null>(null);
  const [editorReview, setEditorReview] = useState(false);
  const seenCreationContext = useRef<ClassroomCreationContext | null>(null);
  const [pendingCreationContext, setPendingCreationContext] = useState<ClassroomCreationContext | null>(null);
  const [generating, setGenerating] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [activities, setActivities] = useState<ActivitySummary[]>([]), [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<ActivityData | null>(null), [preview, setPreview] = useState<ActivityData | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [consultation,setConsultation]=useState<AttemptSessionData|null>(null);
  const [session, setSession] = useState<AttemptSessionData | null>(null), [authorization, setAuthorization] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ action: 'publish' | 'withdraw'; activity: ActivitySummary } | null>(null);
  const [history, setHistory] = useState<{ activityId: string; attemptId?: string | null; filter?: 'unpublished' } | null>(null);
  const [view, setView] = useState<(typeof teacherViews)[number]['key']|(typeof studentViews)[number]['key']>('all');
  const handledTarget = useRef<AcademicTarget | null>(null);
  const responseRequest=useRef<AbortController|null>(null);
  const responseEpoch=useRef(0);
  function cancelResponse(){responseRequest.current?.abort();responseEpoch.current++;}
  function closeResponse(){cancelResponse();setSession(null);setHistory(null);setPreview(null);setConsultation(null);}
  useEffect(()=>()=>{responseRequest.current?.abort();},[active]);
  useEffect(() => { if (!active) { setChoosing(false); setSession(null); setConsultation(null); setPreview(null); setHistory(null); setAuthorization(null); setConfirm(null); } }, [active]);
  const teacher = room.role === 'teacher', writable = teacher && !room.archived;
  const visibleActivities = view === 'all' ? activities : activities.filter(activity => teacher?activity.status===view:view==='submitted'?['SUBMITTED','REVIEWED'].includes(activity.studentState??'PENDING'):!['SUBMITTED','REVIEWED','READ_ONLY'].includes(activity.studentState??'PENDING'));
  const visibility = useRef({ active });
  if (visibility.current.active !== active) visibility.current = { active };
  useEffect(() => {
    if (!creationContext || seenCreationContext.current === creationContext) return;
    seenCreationContext.current = creationContext;
    if (editing || generating) setPendingCreationContext(creationContext);
    else {setAssignment({ ...creationContext, topicIds: [...creationContext.topicIds] });setChoosing(true);}
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
    if (!target) { handledTarget.current = null; cancelResponse(); return; }
    if (!active || handledTarget.current === target) return;
    handledTarget.current = target;
    cancelResponse();
    const controller = new AbortController();
    responseRequest.current=controller;
    setSession(null); setConsultation(null); setPreview(null); setHistory(null); setError('');
    if (target.kind !== 'activity') setHistory({ activityId: target.activityId, attemptId: target.attemptId, filter: submissionFilter });
    else if (teacher) void api.call<ActivityData>(`/${room.id}/activities/${target.activityId}/preview`, 'GET', undefined, controller.signal)
      .then(async data => {
        if (controller.signal.aborted) return;
        if (data.activity.status === 'DRAFT' && writable) {
          const library = await api.call<Material[]>(`/${room.id}/library`, 'GET', undefined, controller.signal);
          if (!controller.signal.aborted) { setEditorReview(false); setEditorContext(null); setMaterials(library); setEditing(data); }
        } else { setPreview(data); setHistory({activityId:data.activity.id}); }
      }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    else if(target.mode==='respond'&&consumeActivityResponse(room.id,target.activityId))void openActivitySession(api,room.id,target.activityId,controller.signal).then(data=>{if(!controller.signal.aborted)setSession(data);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});
    else void api.call<AttemptSessionData>(`/${room.id}/activities/${target.activityId}/session`, 'GET', undefined, controller.signal)
      .then(data => { if (!controller.signal.aborted) {setConsultation(data);setHistory({activityId:target.activityId});} }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [api, room.id, submissionFilter, target, teacher, writable, active]);
  async function run(operation: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('');
    try { await operation(); } catch (e) { if((e as Error).name!=='AbortError')setError((e as Error).message); } finally { setBusy(false); }
  }
  async function refresh(signal?: AbortSignal) { await Promise.all([reload(), load(signal)]); if (!signal?.aborted) onChanged?.(); }
  async function edit(id: string, signal?: AbortSignal, review = false) {
    const origin=visibility.current;
    const [data, library] = await Promise.all([api.call<ActivityData>(`/${room.id}/activities/${id}/preview`, 'GET', undefined, signal), api.call<Material[]>(`/${room.id}/library`, 'GET', undefined, signal)]);
    if (signal?.aborted || visibility.current!==origin || !origin.active) return;
    setEditorReview(review); setMaterials(library); setEditing(data);
  }
  async function showPreview(id: string) {
    cancelResponse();const controller=new AbortController();responseRequest.current=controller;const origin=visibility.current;
    const result=await api.call<ActivityData>(`/${room.id}/activities/${id}/preview`,'GET',undefined,controller.signal);
    if(controller.signal.aborted||visibility.current!==origin||!origin.active)return;
    setPreview(result);setHistory({activityId:id});setSession(null);setConsultation(null);setEditing(null);setEditorContext(null);
  }
  async function openEditor(id:string,review=false){
    cancelResponse();const controller=new AbortController();responseRequest.current=controller;
    await edit(id,controller.signal,review);
    if(!controller.signal.aborted){setEditorContext(null);setHistory(null);setPreview(null);setConsultation(null);}
  }
  async function prepare(id:string,consultOnly=false){
    responseRequest.current?.abort();const controller=new AbortController();responseRequest.current=controller;
    const origin=visibility.current,next=await openActivitySession(api,room.id,id,controller.signal);
    if(controller.signal.aborted||visibility.current!==origin||!origin.active)return;
    if(consultOnly){setConsultation(next);setHistory({activityId:id});setSession(null);}else{setSession(next);setHistory(null);}await refresh(controller.signal);
  }
  const detailOpen = Boolean(session || history || preview);
  const editorEpoch=responseEpoch.current,editorOrigin=visibility.current;
  return <section className={`p7-activities act-page${editing || generating ? ' education-task-active' : ''}`} aria-label="Actividades del aula">
    {!editing && !generating && !detailOpen ? <header className="p5-section-head fm-desk-activities-heading act-heading"><div><h2>Actividades</h2><p>{teacher ? 'Prepará consignas, revisá entregas y publicá devoluciones.' : 'Consultá tus consignas, entregas y devoluciones.'}</p></div>
      <div className="p5-actions">{writable ? <button className="primary" disabled={busy} onClick={() => {cancelResponse();setChoosing(true);}}>Crear actividad</button> : null}</div></header> : null}
    {error ? <Notice error>{error} Los cambios no confirmados no se consideran guardados.</Notice> : null}
    {notice ? <Notice>{notice}</Notice> : null}
    {!loaded && !error ? <Notice>Cargando actividades…</Notice> : null}
    {openAuthoring && !writable ? <Notice>No podés crear actividades en esta aula con tus permisos actuales.</Notice> : null}
    {active && choosing && writable && !editing && !generating && !detailOpen ? <Dialog title="Crear actividad" className="brujula-activity-choice" onClose={() => !busy && setChoosing(false)}><div className="activity-create-entry">
      <p className="aw-choice-intro">¿Cómo querés preparar la actividad para <strong>{room.name} · {room.division}</strong>?</p>
      <div className="aw-methods"><button className="aw-method" aria-label="Crear manualmente" aria-describedby="activity-manual-description" disabled={busy} onClick={() => void run(async () => {
        setEditorContext({ ...assignment, topicIds: [...assignment.topicIds] });
        const library = await api.call<Material[]>(`/${room.id}/library`, 'GET');
        setEditorReview(false);setMaterials(library); setEditing(localActivityDraft(room, 'ASSIGNMENT')); setChoosing(false); onCreationContextConsumed?.();
      })}><span className="aw-method-icon"><FoxmindIcon name="edit" /></span><span><strong>Crear manualmente</strong><small id="activity-manual-description">Escribí las consignas y definí los criterios de evaluación.</small></span><FoxmindIcon name="chevron-right" /></button>
      <button className="aw-method aw-ia activity-ai-choice" aria-label="Crear con IA" aria-describedby="activity-ai-description" disabled={busy} onClick={() => { setChoosing(false); setGenerating(true); onCreationContextConsumed?.(); }}><span className="aw-method-icon"><FoxmindIcon name="spark" /></span><span><strong>Crear con IA</strong><small id="activity-ai-description">Elegí el tema y el objetivo para generar una propuesta editable.</small></span><FoxmindIcon name="chevron-right" /></button></div>
      {error ? <Notice error>{error}</Notice> : null}</div></Dialog> : null}
    {generating && writable ? <ActivityGeneration api={api} room={room} creationContext={assignment} onClose={() => setGenerating(false)}
      onApplied={async (id, signal) => { await refresh(signal); if (signal.aborted) return; setEditorContext(null); await edit(id, signal); if (!signal.aborted) setGenerating(false); }} /> : null}
    {editing ? <ActivityAuthoring key={editing.activity.id} api={api} room={room} data={editing} materials={materials} creationContext={editorContext} initialReview={editorReview}
      onSaved={async (assigned,id) => {if(editorEpoch!==responseEpoch.current||editorOrigin!==visibility.current||!editorOrigin.active)return;await refresh();if(editorEpoch!==responseEpoch.current||editorOrigin!==visibility.current||!editorOrigin.active)return;setNotice(assigned ? `Actividad asignada a ${room.name}.` : editing.activity.status==='DRAFT'?'Borrador privado guardado.':'Cambios guardados.'); if(id)await showPreview(id); }}
      onClose={() => {cancelResponse();setEditing(current=>current===editing?null:current);setEditorContext(null);}} /> : null}
    {loaded && activities.length > 0 && !editing && !generating && !detailOpen ? <div className="fm-desk-activity-filters" role="group" aria-label="Filtrar actividades por estado">
      {(teacher?teacherViews:studentViews).map(({key,label}) => <button type="button" key={key} aria-pressed={view === key} onClick={() => setView(key)}>{label}</button>)}
    </div> : null}
    <div className="p7-activity-list fm-desk-activity-list act-list" hidden={Boolean(editing || generating || detailOpen)}>
    {loaded && visibleActivities.length === 0 ? <p className="p5-empty" role="status">{activities.length ? 'No hay actividades en este estado.' : 'Todavía no hay actividades disponibles.'}</p> : null}
    {visibleActivities.map(activity => <article className={`folder-row act-line interior-activity-${activity.status.toLowerCase()}${activity.pendingReviewCount?' has-pending-review':''}`} data-student-state={teacher?undefined:activity.studentState??'PENDING'} key={activity.id} aria-label={activity.title ?? 'Borrador sin título'}>
      <span className={`interior-activity-icon activity-type-${activity.type.toLowerCase()}`}><FoxmindIcon name={activity.type === 'ASSIGNMENT'?'file':activity.type === 'EVALUATION'?'clipboard':'list-checks'}/></span><div className="folder-row-content"><small className="interior-activity-type">{activityTypeLabels[activity.type]}</small><h3>{activity.title ?? 'Borrador sin título'}</h3></div>
      <p className="classroom-activity-deadline"><FoxmindIcon name="calendar"/>{activity.deadlineAt?new Intl.DateTimeFormat('es-AR',{timeZone:activity.zone,day:'numeric',month:'short'}).format(new Date(activity.deadlineAt)).replaceAll('.',''):'Sin fecha límite'}</p>
      <div className="p5-actions folder-row-actions">
        <button className="act-open" disabled={busy} aria-label={`Abrir ${activity.title ?? 'borrador sin título'}`} onClick={() => void run(async () => {
          cancelResponse();const controller=new AbortController();responseRequest.current=controller;const epoch=responseEpoch.current,origin = visibility.current;
          if (teacher) {
            const result = await api.call<ActivityData>(`/${room.id}/activities/${activity.id}/preview`, 'GET',undefined,controller.signal);
            if (epoch===responseEpoch.current && visibility.current === origin && origin.active) { setPreview(result); setHistory({activityId:activity.id}); }
            return;
          }
          const next = await api.call<AttemptSessionData>(`/${room.id}/activities/${activity.id}/session`, 'GET',undefined,controller.signal);
          if (epoch===responseEpoch.current && visibility.current === origin && origin.active) {setConsultation(next);setHistory({activityId:activity.id});}
        })}><span>{!teacher?studentStateLabels[activity.studentState??'PENDING']:activity.pendingReviewCount ? `${activity.pendingReviewCount} por revisar` : activity.status === 'DRAFT' ? 'Borrador privado' : activity.status === 'WITHDRAWN' ? 'Retirada' : 'Publicada'}</span><FoxmindIcon name="chevron-right"/></button>
      </div>
    </article>)}</div>
    {active && history ? <AttemptHistory key={history.activityId + (history.attemptId ?? '') + (history.filter ?? '')} api={api} room={room} activityId={history.activityId} attemptId={history.attemptId} filter={teacher ? history.filter : undefined}
      activityPreview={preview?.activity??consultation?.activity} effectiveDeadlineAt={teacher?undefined:consultation?.reception?.deadlineAt} onReview={writable&&preview?.activity.status==='DRAFT'?()=>void run(()=>openEditor(preview.activity.id,true)):undefined} actions={!teacher && consultation && (consultation.canStart || consultation.canTransfer) ? <div className="brujula-activity-options">{consultation.activity.type==='ASSIGNMENT'&&!consultation.attempt?<button disabled={busy} onClick={()=>void run(()=>prepare(consultation.activity.id,true))}>Ver consigna</button>:null}<button className="primary" disabled={busy} onClick={()=>void run(async()=>{if(consultation.editor&&consultation.attempt){setSession(consultation);setHistory(null);}else await prepare(consultation.activity.id);})}>{consultation.attempt?'Continuar borrador':consultation.activity.type==='ASSIGNMENT'?'Preparar entrega':'Responder actividad'}</button></div> : writable && preview ? <div className="brujula-activity-options"><button disabled={busy} onClick={() => void run(()=>openEditor(preview.activity.id))}>{preview.activity.status==='DRAFT'?'Editar borrador':'Editar actividad'}</button>{preview.activity.status!=='DRAFT'?<><button disabled={busy} onClick={() => setAuthorization(preview.activity.id)}>Habilitar primera entrega</button>{!preview.activity.locked ? <button disabled={busy} onClick={() => setConfirm({activity:preview.activity,action:preview.activity.status === 'PUBLISHED'?'withdraw':'publish'})}>{preview.activity.status === 'PUBLISHED'?'Retirar actividad':'Publicar'}</button>:null}</>:null}</div>:null}
      onClose={closeResponse} onChanged={refresh} onResume={setSession} /> : null}
    {active && session ? <AttemptSession key={session.activity.id} api={api} room={room} initial={session} onClose={closeResponse} onChanged={refresh}
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
