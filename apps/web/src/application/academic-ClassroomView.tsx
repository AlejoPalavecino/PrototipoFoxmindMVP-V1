'use client';
import { useState, useEffect, useRef } from 'react';
import { ApiError, type ClassroomClient } from '../../../../src/core/contracts/academic-client.ts';
import { type AcademicTarget, type NotificationTarget } from '../../../../src/core/contracts/notifications.ts';
import { type Detail, type Invitation, type Member } from '../../../../src/core/contracts/classrooms.ts';
import { Notice } from '../../../shared-ui/feedback.tsx';
import { ClassroomHeader } from '../features/classrooms/index.ts';
import { ClassroomNavigation } from '../features/classrooms/index.ts';
import type { HomeTarget } from '../../../../src/core/domain/index.ts';
import { homeClassroomTab, homeNotificationTarget } from './academic-classroom-home-target.ts';
import { Plan } from './academic-plan.tsx';
import { Library } from '../features/materials/index.ts';
import { Wall } from '../features/communication/index.ts';
import { Activities } from './academic-Activities.tsx';
import { Progress } from '../features/grading/index.ts';
import { useClassroomResource } from './academic-use-classroom-resource.ts';
import { ClassroomSettings } from '../features/classrooms/index.ts';
import { ClassroomDialogs } from './academic-ClassroomDialogs.tsx';
import { ClassroomRoster } from '../features/classrooms/index.ts';
import { type Summary } from '../../../../src/core/contracts/grading.ts';
import { ClassroomMembers } from '../features/classrooms/index.ts';
import { ResourceNotice } from '../features/classrooms/index.ts';
import { useClassroomNavigation } from './academic-use-classroom-navigation.ts';
import { useClassroomSettings } from '../features/classrooms/index.ts';
import { useSettingsReload } from '../features/classrooms/index.ts';
import type { ClassroomCreationContext } from '../../../../src/core/contracts/academic-context.ts';

export function ClassroomView({
  api,
  id,
  onExit,
  onMembershipEnded,
  initialCode,
  wallTarget,
  homeTarget,
  onWallChanged,
}: {
  api: ClassroomClient;
  id: string;
  onExit: () => void;
  onMembershipEnded: (confirmed: boolean) => void;
  initialCode: string | null;
  wallTarget?: NotificationTarget | null;
  homeTarget?: HomeTarget | null;
  onWallChanged?: () => void;
}) {
  const activeWallTarget = wallTarget?.classroomId === id ? wallTarget : null;
  const activeHomeTarget = homeTarget && 'classroomId' in homeTarget && homeTarget.classroomId !== id ? null : homeTarget;
  const [tab, setTab] = useState(activeWallTarget ? 'postId' in activeWallTarget ? 'wall' : 'activities' : homeClassroomTab(activeHomeTarget));
  const [actionStates, setActionStates] = useState<Record<string, { error: string; busy: boolean }>>({});
  const { error = '', busy = false } = actionStates[tab] ?? {};
  const invitationAction = actionStates.invitations ?? { error: '', busy: false };
  const [notice, setNotice] = useState('');
  const navigation = useRef({ id, tab });
  if (navigation.current.id !== id || navigation.current.tab !== tab) navigation.current = { id, tab };
  const currentNavigation = navigation.current;
  const detail = useClassroomResource<Detail>(api, `/${id}`, true);
  const room = detail.data;
  useEffect(()=>{if(room?.accessCode!==undefined)setCode(room.accessCode);},[room?.accessCode]);
  const teacher = room?.role === 'teacher';
  const memberResource = useClassroomResource<Member[]>(api, `/${id}/members`, tab === 'members' && !!room);
  const historyResource = useClassroomResource<Member[]>(api, `/${id}/history`, tab === 'history' && !!teacher);
  const invitationResource = useClassroomResource<Invitation[]>(api, `/${id}/invitations`, tab === 'members' && !!teacher);
  const members = memberResource.data ?? [];
  const history = historyResource.data ?? [];
  const invitations = invitationResource.data ?? [];
  const rosterLoaded = memberResource.status === 'ready';
  const load = detail.reload;
  const identity = useRef({ id });
  if (identity.current.id !== id) identity.current = { id };
  const activeIdentity = identity.current;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const settingsOperation = useRef(0);
  const isCurrentRoom = () => mounted.current && identity.current === activeIdentity;
  const { tabs, roster } = useClassroomNavigation(tab, room, activeWallTarget, rosterLoaded, members.length);
  const [planActivity, setPlanActivity] = useState<AcademicTarget | null>(null);
  const [planMaterial,setPlanMaterial] = useState<{roomId:string;id:string}|null>(null);
  useEffect(()=>{setPlanMaterial(null);},[activeHomeTarget]);
  const [selectedTopic, setSelectedTopic] = useState<{ roomId: string; id: string } | null>(null);
  const [creationContext, setCreationContext] = useState<ClassroomCreationContext | null>(null);
  const [uploadContext, setUploadContext] = useState<ClassroomCreationContext | null>(null);
  const [visited, setVisited] = useState({ roomId: id, tabs: [tab] });
  useEffect(() => { setVisited(previous => ({ roomId: id, tabs: previous.roomId === id ? Array.from(new Set([...previous.tabs, tab])) : [tab] })); }, [id, tab]);
  const retained = (section: string) => tab === section || (visited.roomId === id && visited.tabs.includes(section));
  const destinationValue = activeWallTarget ?? (activeHomeTarget && 'classroomId' in activeHomeTarget && activeHomeTarget.classroomId === id ? homeNotificationTarget(activeHomeTarget) : null);
  const destinationKey=JSON.stringify(destinationValue),stableDestination=useRef({key:destinationKey,value:destinationValue});
  if(stableDestination.current.key!==destinationKey)stableDestination.current={key:destinationKey,value:destinationValue};
  const destination=stableDestination.current.value;
  const [code, setCode] = useState(initialCode),
    [email, setEmail] = useState(''),
    [inviting, setInviting] = useState(false),
    [summary, setSummary] = useState<(Summary & { studentId: string }) | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    text: string;
    run: () => Promise<void>;
    scope?: string;
    confirmLabel?: string;
  } | null>(null);
  const { settings, setSettings, settingsRevision, setSettingsRevision,
    settingsConflict, setSettingsConflict } = useClassroomSettings(id, room);
  useEffect(() => { setConfirm(null); setInviting(false); setSummary(null); setNotice(''); setActionStates({}); setCode(initialCode); setEmail(''); setPlanActivity(null); setCreationContext(null); setUploadContext(null); }, [id, initialCode]);
  useEffect(() => { setConfirm(null); setInviting(false); setSummary(null); }, [tab]);
  useEffect(() => { setTab(activeWallTarget ? 'postId' in activeWallTarget ? 'wall' : 'activities' : homeClassroomTab(activeHomeTarget)); }, [id]);
  useEffect(() => { if (activeWallTarget) { setPlanActivity(null); setTab('postId' in activeWallTarget ? 'wall' : 'activities'); } }, [activeWallTarget]);
  useEffect(() => { if (!activeWallTarget && activeHomeTarget) { setPlanActivity(null); setTab(homeClassroomTab(activeHomeTarget)); if(activeHomeTarget.kind==='classroom' && activeHomeTarget.topicId)setSelectedTopic({roomId:id,id:activeHomeTarget.topicId}); } }, [activeHomeTarget, activeWallTarget,id]);
  async function action(task: () => Promise<void>, section = tab) {
    if (section === 'settings') settingsOperation.current++;
    setActionStates(previous => ({ ...previous, [section]: { busy: true, error: '' } }));
    try { await task(); }
    catch (e) {
      if (!isCurrentRoom()) return;
      if ((e as { status?: number }).status === 409 && section === 'settings') setSettingsConflict(true);
      setActionStates(previous => ({ ...previous, [section]: { busy: false, error: (e as Error).message } }));
      return;
    }
    if (isCurrentRoom()) setActionStates(previous => ({ ...previous, [section]: { busy: false, error: '' } }));
  }
  const reloadSettings = useSettingsReload({ actionStates, settingsOperation, reload: detail.reloadWithResult,
    isCurrentRoom, setSettings, setSettingsRevision, setSettingsConflict, setActionStates });
  async function invite() {
    await api.call(`/${id}/invitations`, 'POST', { email });
    if (!isCurrentRoom()) return;
    setEmail('');
    setInviting(false);
    setNotice('Invitación guardada para enviar. La inscripción requiere que la persona la acepte.');
    await invitationResource.reload();
  }
  const tabLabels: Record<string, string> = { members: teacher ? 'Alumnos' : 'Compañeros', history: 'Historial', plan: 'Plan', library: 'Biblioteca', activities: 'Actividades', progress: teacher ? 'Progreso' : 'Mi progreso', wall: 'Muro', settings: 'Configuración' };
  return (
    <>
      <nav className="brujula-breadcrumb" aria-label="Ubicación"><a href="/inicio">Inicio</a><span aria-hidden="true">›</span><button className="p5-link classroom-back" onClick={onExit}>Mis aulas</button>{room ? <><span aria-hidden="true">›</span><strong>{room.name}</strong></> : null}</nav>
      {detail.error ? <Notice error>{detail.error} <button onClick={() => void load()}>Actualizar aula</button></Notice> : null}
      {!room && detail.status !== 'error' ? <Notice>Cargando aula…</Notice> : null}
      {room ? (
        <div className="classroom-workspace classroom-redesign" data-active-section={tab}>
          <ClassroomHeader room={room} />
          {room.archived ? (
            <Notice>
              Aula archivada · Podés consultar el contenido. No se pueden publicar ni editar materiales o actividades.
            </Notice>
          ) : null}
          {notice ? <Notice>{notice}</Notice> : null}
          <ClassroomNavigation teacher={!!teacher} selected={tab} onSelect={setTab} tabsRef={tabs}/>
          <section data-classroom-tab={tab} className={`p5-surface ${tab === 'plan' ? 'fm3-plan-surface' : `folder-panel tone-${teacher ? 'coral' : 'mint'}`}`} aria-labelledby="classroom-section-title">
            <h2 id="classroom-section-title" className="classroom-section-title">{tabLabels[tab]}</h2>
            <div hidden={!!summary}>
            {error ? <Notice error>{error}</Notice> : null}
            {tab === 'members' || tab === 'history' ? (
              <ResourceNotice resource={tab === 'history' ? historyResource : memberResource} />
            ) : null}
            {tab === 'members' || tab === 'history' ? (
              <>
                <ClassroomRoster tab={tab} teacher={!!teacher} room={room} busy={busy} members={members} history={history}
                  memberResource={memberResource} historyResource={historyResource} roster={roster} api={api} id={id}
                  access={teacher && tab==='members' ? <ClassroomMembers part="code" api={api} id={id} room={room} busy={busy} code={code} setCode={setCode}
                    setNotice={setNotice} setConfirm={setConfirm} isCurrentRoom={isCurrentRoom}
                    invitations={invitations} invitationAction={invitationAction} invitationResource={invitationResource} action={action}/> : undefined}
                  isCurrentRoom={isCurrentRoom} setInviting={setInviting} setSummary={value => { if (navigation.current === currentNavigation) setSummary(value); }}
                  setConfirm={setConfirm} action={action} />
                {teacher && tab === 'members' ? (
                  <ClassroomMembers part="invitations" api={api} id={id} room={room} busy={busy} code={code} setCode={setCode}
                    setNotice={setNotice} setConfirm={setConfirm} isCurrentRoom={isCurrentRoom}
                    invitations={invitations} invitationAction={invitationAction} invitationResource={invitationResource} action={action} />
                ) : null}
              </>
            ) : null}
            {retained('plan') ? <div hidden={tab !== 'plan'} key={`${id}-plan`}><Plan api={api} room={room} reload={load}
              selectedTopicId={selectedTopic?.roomId === id ? selectedTopic.id : undefined} onSelectTopic={topicId => setSelectedTopic({ roomId: id, id: topicId })}
              onCreateActivity={room.role === 'teacher' && !room.archived ? context => { setPlanActivity(null); setCreationContext(context); setTab('activities'); } : undefined}
              onAddMaterial={room.role === 'teacher' && !room.archived ? context => { setUploadContext(context); setTab('library'); } : undefined}
              onOpenMaterial={materialId=>{setPlanMaterial({roomId:id,id:materialId});setTab('library');}}
              onOpenActivity={activityId => {
              setPlanActivity({ kind: 'activity', classroomId: id, activityId, attemptId: null }); setTab('activities');
            }} /></div> : null}
            {tab === 'progress' ? <Progress api={api} classroomId={id}
              onOpenActivity={activityId => { setPlanActivity({ kind: 'activity', classroomId: id, activityId, attemptId: null }); setTab('activities'); }}
              onOpenStudent={teacher ? studentId => void action(async () => { const result = await api.call<Summary>(`/${id}/members/${studentId}`); if (isCurrentRoom() && navigation.current === currentNavigation) setSummary({ ...result, progress:true,studentId }); }) : undefined} /> : null}
            {retained('library') ? <div hidden={tab !== 'library'} key={`${id}-library`}><Library api={api} room={room} reload={load} active={tab === 'library'}
              uploadContext={uploadContext} onUploadContextConsumed={() => setUploadContext(null)}
              targetMaterialId={planMaterial?.roomId===id ? planMaterial.id : activeHomeTarget?.kind === 'material' ? activeHomeTarget.materialId : undefined} openUpload={activeHomeTarget?.kind === 'upload-material'} /></div> : null}
            {tab === 'wall' ? <Wall api={api} room={room} reload={load} target={destination && 'postId' in destination ? destination : null} onChanged={onWallChanged} openComposer={activeHomeTarget?.kind === 'publish-notice'} /> : null}
            {retained('activities') ? <div hidden={tab !== 'activities'} key={`${id}-activities`}><Activities api={api} room={room} reload={load} active={tab === 'activities'} target={planActivity ?? (destination && 'kind' in destination ? destination : null)}
              creationContext={creationContext} onCreationContextConsumed={() => setCreationContext(null)}
              openAuthoring={activeHomeTarget?.kind === 'create-activity'} submissionFilter={activeHomeTarget?.kind === 'submissions' ? 'unpublished' : undefined} onChanged={onWallChanged} /></div> : null}
            {tab === 'settings' && teacher ? <ClassroomSettings api={api} id={id} room={room}
              settings={settings} setSettings={setSettings} settingsRevision={settingsRevision}
              setSettingsRevision={setSettingsRevision} settingsConflict={settingsConflict}
              setSettingsConflict={setSettingsConflict} reloadSettings={reloadSettings} isCurrentRoom={isCurrentRoom}
              busy={busy} load={load} action={action} setNotice={setNotice} setConfirm={setConfirm} /> : null}
            {!teacher ? (
              <footer className="p5-student-footer">
                <button
                  disabled={busy}
                  onClick={() =>
                    setConfirm({
                      title: 'Salir del aula',
                      text: room.archived
                        ? 'Perderás acceso a esta aula y a sus archivos. Tus entregas confirmadas se conservarán. Para volver, el docente tendrá que reactivar el aula y enviarte una invitación nueva.'
                        : 'Perderás acceso al aula. Tu historial se conserva y para volver necesitarás una invitación nueva del docente.',
                      confirmLabel: room.archived ? 'Confirmar salida' : undefined,
                      run: async () => {
                        try {
                          await api.call(`/${id}/leave`, 'POST', {});
                        } catch (error) {
                          if (!isCurrentRoom()) throw error;
                          // A failed response may follow a committed departure, or be a rejected request.
                          try { await api.call(`/${id}`); }
                          catch (accessError) {
                            if (!(accessError instanceof ApiError) || accessError.code !== 'FORBIDDEN') throw error;
                            if (isCurrentRoom()) onMembershipEnded(false);
                            return;
                          }
                          throw error;
                        }
                        if (isCurrentRoom()) onMembershipEnded(true);
                      },
                    })
                  }
                >
                  Salir del aula
                </button>
              </footer>
            ) : null}
            </div>
      <ClassroomDialogs api={api} id={id} tab={tab} inviting={inviting} setInviting={setInviting}
        email={email} setEmail={setEmail} invite={invite} invitationAction={invitationAction} actionStates={actionStates}
        confirm={confirm} setConfirm={setConfirm} isCurrentRoom={isCurrentRoom} summary={summary} setSummary={setSummary} action={action}
        onOpenActivity={(activityId,attemptId)=>{setSummary(null);setPlanActivity({kind:attemptId?'submission':'activity',classroomId:id,activityId,attemptId:attemptId??null});setTab('activities');}}
        onRemoveStudent={summary && !room.archived && members.some(member=>member.studentId===summary.studentId) ? ()=>setConfirm({title:'Dar de baja del aula',text:'Se conservarán sus entregas y resultados en Historial. Dejará de integrar los indicadores del grupo actual.',run:async()=>{await api.call(`/${id}/members/${summary.studentId}/remove`,'POST',{});await Promise.all([memberResource.reload(),historyResource.reload(),load()]);setSummary(null);}}) : undefined}/>
          </section>
        </div>
      ) : null}
    </>
  );
}
