'use client';
import { useState, useEffect, useRef } from 'react';
import { ApiError, type AcademicTarget, type ClassroomClient, type Detail, type Invitation, type Member, type NotificationTarget } from './api.ts';
import { Notice } from './components.tsx';
import { ClassroomHeader } from './ClassroomHeader.tsx';
import { ClassroomNavigation } from './ClassroomNavigation.tsx';
import type { HomeTarget } from '../../src/core/domain/index.ts';
import { homeClassroomTab, homeNotificationTarget } from './classroom-home-target.ts';
import { Plan } from './Plan.tsx';
import { Library } from './Library.tsx';
import { Wall } from './Wall.tsx';
import { Activities } from './Activities.tsx';
import { Progress } from './Progress.tsx';
import { useClassroomResource } from './use-classroom-resource.ts';
import { ClassroomSettings } from './ClassroomSettings.tsx';
import { ClassroomDialogs } from './ClassroomDialogs.tsx';
import { ClassroomRoster, type Summary } from './ClassroomRoster.tsx';
import { ClassroomMembers } from './ClassroomMembers.tsx';
import { ResourceNotice } from './ResourceNotice.tsx';
import { useClassroomNavigation } from './use-classroom-navigation.ts';
import { useClassroomSettings } from './use-classroom-settings.ts';
import { useSettingsReload } from './use-settings-reload.ts';
import type { ClassroomCreationContext } from './classroom-creation-context.ts';

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
  const [selectedTopic, setSelectedTopic] = useState<{ roomId: string; id: string } | null>(null);
  const [creationContext, setCreationContext] = useState<ClassroomCreationContext | null>(null);
  const [uploadContext, setUploadContext] = useState<ClassroomCreationContext | null>(null);
  const [visited, setVisited] = useState({ roomId: id, tabs: [tab] });
  useEffect(() => { setVisited(previous => ({ roomId: id, tabs: previous.roomId === id ? Array.from(new Set([...previous.tabs, tab])) : [tab] })); }, [id, tab]);
  const retained = (section: string) => tab === section || (visited.roomId === id && visited.tabs.includes(section));
  const destination = activeWallTarget ?? (activeHomeTarget && 'classroomId' in activeHomeTarget && activeHomeTarget.classroomId === id ? homeNotificationTarget(activeHomeTarget) : null);
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
  useEffect(() => { if (!activeWallTarget && activeHomeTarget) { setPlanActivity(null); setTab(homeClassroomTab(activeHomeTarget)); } }, [activeHomeTarget, activeWallTarget]);
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
      <button className="p5-link classroom-back" onClick={onExit}>
        Volver a mis aulas
      </button>
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
            {error ? <Notice error>{error}</Notice> : null}
            {tab === 'members' || tab === 'history' ? (
              <ResourceNotice resource={tab === 'history' ? historyResource : memberResource} />
            ) : null}
            {tab === 'members' || tab === 'history' ? (
              <>
                <ClassroomRoster tab={tab} teacher={!!teacher} room={room} busy={busy} members={members} history={history}
                  memberResource={memberResource} historyResource={historyResource} roster={roster} api={api} id={id}
                  isCurrentRoom={isCurrentRoom} setInviting={setInviting} setSummary={value => { if (navigation.current === currentNavigation) setSummary(value); }}
                  setConfirm={setConfirm} action={action} />
                {teacher && tab === 'members' ? (
                  <ClassroomMembers api={api} id={id} room={room} busy={busy} code={code} setCode={setCode}
                    setNotice={setNotice} setConfirm={setConfirm} isCurrentRoom={isCurrentRoom}
                    invitations={invitations} invitationAction={invitationAction} invitationResource={invitationResource} action={action} />
                ) : null}
              </>
            ) : null}
            {retained('plan') ? <div hidden={tab !== 'plan'} key={`${id}-plan`}><Plan api={api} room={room} reload={load}
              selectedTopicId={selectedTopic?.roomId === id ? selectedTopic.id : undefined} onSelectTopic={topicId => setSelectedTopic({ roomId: id, id: topicId })}
              onCreateActivity={room.role === 'teacher' && !room.archived ? context => { setPlanActivity(null); setCreationContext(context); setTab('activities'); } : undefined}
              onAddMaterial={room.role === 'teacher' && !room.archived ? context => { setUploadContext(context); setTab('library'); } : undefined}
              onOpenActivity={activityId => {
              setPlanActivity({ kind: 'activity', classroomId: id, activityId, attemptId: null }); setTab('activities');
            }} /></div> : null}
            {tab === 'progress' ? <Progress api={api} classroomId={id}
              onOpenActivity={activityId => { setPlanActivity({ kind: 'activity', classroomId: id, activityId, attemptId: null }); setTab('activities'); }}
              onOpenStudent={teacher ? studentId => void action(async () => { const result = await api.call<Summary>(`/${id}/members/${studentId}`); if (isCurrentRoom() && navigation.current === currentNavigation) setSummary({ ...result, studentId }); }) : undefined} /> : null}
            {retained('library') ? <div hidden={tab !== 'library'} key={`${id}-library`}><Library api={api} room={room} reload={load} active={tab === 'library'}
              uploadContext={uploadContext} onUploadContextConsumed={() => setUploadContext(null)}
              targetMaterialId={activeHomeTarget?.kind === 'material' ? activeHomeTarget.materialId : undefined} openUpload={activeHomeTarget?.kind === 'upload-material'} /></div> : null}
            {tab === 'wall' ? <Wall api={api} room={room} reload={load} target={destination && 'postId' in destination ? destination : null} onChanged={onWallChanged} /> : null}
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
          </section>
        </div>
      ) : null}
      <ClassroomDialogs api={api} id={id} tab={tab} inviting={inviting} setInviting={setInviting}
        email={email} setEmail={setEmail} invite={invite} invitationAction={invitationAction} actionStates={actionStates}
        confirm={confirm} setConfirm={setConfirm} isCurrentRoom={isCurrentRoom} summary={summary} setSummary={setSummary} action={action} />
    </>
  );
}
