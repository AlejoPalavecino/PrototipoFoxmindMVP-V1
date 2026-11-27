'use client';
import { useState, useEffect, useEffectEvent, useMemo, useRef, type SetStateAction } from 'react';
import { ApiError, type ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import { type AcademicTarget, type NotificationTarget } from '../../../../../../src/core/contracts/notifications.ts';
import { type Detail, type Invitation, type Member } from '../../../../../../src/core/contracts/classrooms.ts';
import { Notice } from '../../../../../shared-ui/feedback.tsx';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon.tsx';
import { ClassroomHeader } from '../../../features/classrooms/index.ts';
import { classroomExperienceStyles as experience } from '../../../features/classrooms/index.ts';
import { ClassroomNavigation } from '../../../features/classrooms/index.ts';
import type { HomeTarget } from '../../../../../../src/core/domain/home/home.ts';
import { homeClassroomTab, homeNotificationTarget } from './classroom-home-target.ts';
import { Plan } from './ClassroomPlan.tsx';
import { Library } from '../../../features/materials/index.ts';
import { createMaterialsApi } from '../../../features/materials/api.ts';
import { Wall } from '../../../features/communication/index.ts';
import { Activities } from '../activity-session/Activities.tsx';
import { Progress, StudentAiSummary } from '../../../features/grading/index.ts';
import {
  SupportPriority,
  TeacherSupportDialog,
  useRosterSupport,
  type TeacherSupportReader,
  type SupportStudent,
} from '../../../features/teacher-support/index.ts';
import { createGradingProgressApi, createStudentSummaryApi } from '../../../features/grading/api.ts';
import { useClassroomResource } from './use-classroom-resource.ts';
import { ClassroomSettings } from '../../../features/classrooms/index.ts';
import { ClassroomDialogs } from './ClassroomDialogs.tsx';
import { ClassroomRoster } from '../../../features/classrooms/index.ts';
import type { ActivitySummary } from '../../../../../../src/core/contracts/activities.ts';
import { type Summary } from '../../../../../../src/core/contracts/grading.ts';
import { ClassroomMembers } from '../../../features/classrooms/index.ts';
import { ClassroomLoading, ResourceNotice } from '../../../features/classrooms/index.ts';
import { useClassroomNavigation } from './use-classroom-navigation.ts';
import { useClassroomSettings } from '../../../features/classrooms/index.ts';
import { useSettingsReload } from '../../../features/classrooms/index.ts';
import type { ClassroomCreationContext } from '../../../../../../src/core/contracts/academic-context.ts';

export function ClassroomView({
  api,
  supportClient,
  id,
  onExit,
  onMembershipEnded,
  initialCode,
  initialSection,
  wallTarget,
  homeTarget,
  onWallChanged,
}: {
  api: ClassroomClient;
  supportClient?: TeacherSupportReader;
  id: string;
  onExit: () => void;
  onMembershipEnded: (confirmed: boolean) => void;
  initialCode: string | null;
  initialSection?: 'activities';
  wallTarget?: NotificationTarget | null;
  homeTarget?: HomeTarget | null;
  onWallChanged?: () => void;
}) {
  const materialsApi = useMemo(() => createMaterialsApi(api), [api]);
  const progressOperations = useMemo(() => createGradingProgressApi(api, id), [api, id]);
  const activeWallTarget = wallTarget?.classroomId === id ? wallTarget : null;
  const activeHomeTarget =
    homeTarget && 'classroomId' in homeTarget && homeTarget.classroomId !== id ? null : homeTarget;
  const [tab, setTab] = useState(
    activeWallTarget
      ? 'postId' in activeWallTarget
        ? 'wall'
        : 'activities'
      : (initialSection ?? homeClassroomTab(activeHomeTarget)),
  );
  const [actionStates, setActionStates] = useState<Record<string, { error: string; busy: boolean }>>({});
  const { error = '', busy = false } = actionStates[tab] ?? {};
  const invitationAction = actionStates.invitations ?? { error: '', busy: false };
  const [notice, setRoomNotice] = useState('');
  const navigation = useRef({ id, tab });
  if (navigation.current.id !== id || navigation.current.tab !== tab) navigation.current = { id, tab };
  const currentNavigation = navigation.current;
  const setNotice = (message: SetStateAction<string>) => {
    if (navigation.current === currentNavigation) setRoomNotice(message);
  };
  const detail = useClassroomResource<Detail>(api, `/${id}`, true);
  const room = detail.data;
  const activitySummary = useClassroomResource<{ activities: ActivitySummary[] }>(api, `/${id}/activities`, !!room);
  const pendingActivityCount = activitySummary.data?.activities?.reduce((count, activity) => {
    if (activity.status !== 'PUBLISHED') return count;
    return (
      count +
      (room?.role === 'teacher'
        ? (activity.pendingReviewCount ?? 0)
        : ['PENDING', 'DRAFT', 'RESUBMISSION'].includes(activity.studentState ?? 'PENDING')
          ? 1
          : 0)
    );
  }, 0);
  useEffect(() => {
    if (room?.accessCode !== undefined) setCode(room.accessCode);
  }, [room?.accessCode]);
  const teacher = room?.role === 'teacher';
  const memberResource = useClassroomResource<Member[]>(api, `/${id}/members`, tab === 'members' && !!room);
  const historyResource = useClassroomResource<Member[]>(api, `/${id}/history`, tab === 'history' && !!teacher);
  const invitationResource = useClassroomResource<Invitation[]>(
    api,
    `/${id}/invitations`,
    tab === 'members' && !!teacher,
  );
  const members = memberResource.data ?? [];
  const activeSupport = teacher && !room?.archived && tab === 'members' ? supportClient : undefined;
  const [supportRevision, setSupportRevision] = useState(0);
  const supportByMember = useRosterSupport(
    activeSupport,
    id,
    members
      .map(member => member.studentId)
      .filter(Boolean)
      .join(','),
    supportRevision,
  );
  const [supportStudent, setSupportStudent] = useState<SupportStudent | null>(null);
  const analysisOperations = useMemo(
    () => createStudentSummaryApi(api, id, supportStudent?.studentId ?? ''),
    [api, id, supportStudent?.studentId],
  );
  const refreshRoster = () => {
    setSupportRevision(value => value + 1);
    return memberResource.reload();
  };
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
    return () => {
      mounted.current = false;
    };
  }, []);
  const settingsOperation = useRef(0);
  const isCurrentRoom = () => mounted.current && identity.current === activeIdentity;
  const { tabs, roster } = useClassroomNavigation(tab, room, activeWallTarget, rosterLoaded, members.length);
  const [planActivity, setPlanActivity] = useState<AcademicTarget | null>(null);
  const [planMaterial, setPlanMaterial] = useState<{ roomId: string; id: string } | null>(null);
  useEffect(() => {
    setPlanMaterial(null);
  }, [activeHomeTarget]);
  const [selectedTopic, setSelectedTopic] = useState<{ roomId: string; id: string } | null>(null);
  const [creationContext, setCreationContext] = useState<ClassroomCreationContext | null>(null);
  const [uploadContext, setUploadContext] = useState<ClassroomCreationContext | null>(null);
  const [visited, setVisited] = useState({ roomId: id, tabs: [tab] });
  useEffect(() => {
    setVisited(previous => ({
      roomId: id,
      tabs: previous.roomId === id ? Array.from(new Set([...previous.tabs, tab])) : [tab],
    }));
  }, [id, tab]);
  const retained = (section: string) => tab === section || (visited.roomId === id && visited.tabs.includes(section));
  const destinationValue =
    activeWallTarget ??
    (activeHomeTarget && 'classroomId' in activeHomeTarget && activeHomeTarget.classroomId === id
      ? homeNotificationTarget(activeHomeTarget)
      : null);
  const destinationKey = JSON.stringify(destinationValue),
    stableDestination = useRef({ key: destinationKey, value: destinationValue });
  if (stableDestination.current.key !== destinationKey)
    stableDestination.current = { key: destinationKey, value: destinationValue };
  const destination = stableDestination.current.value;
  const [code, setCode] = useState(initialCode),
    [inviting, setInviting] = useState(false),
    [summary, setSummary] = useState<(Summary & { studentId: string }) | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    text: string;
    run: () => Promise<void>;
    scope?: string;
    confirmLabel?: string;
  } | null>(null);
  const { settings, setSettings, settingsRevision, setSettingsRevision, settingsConflict, setSettingsConflict } =
    useClassroomSettings(id, room);
  useEffect(() => {
    setSupportStudent(null);
    setConfirm(null);
    setInviting(false);
    setSummary(null);
    setRoomNotice('');
    setActionStates({});
    setCode(initialCode);
    setPlanActivity(null);
    setCreationContext(null);
    setUploadContext(null);
  }, [id, initialCode]);
  useEffect(() => {
    setSupportStudent(null);
    setConfirm(null);
    setInviting(false);
    setSummary(null);
    setPlanMaterial(null);
    setUploadContext(null);
    setRoomNotice('');
  }, [tab]);
  const openInitialTab = useEffectEvent(() =>
    setTab(
      activeWallTarget
        ? 'postId' in activeWallTarget
          ? 'wall'
          : 'activities'
        : (initialSection ?? homeClassroomTab(activeHomeTarget)),
    ),
  );
  useEffect(() => {
    openInitialTab();
  }, [id]);
  useEffect(() => {
    if (activeWallTarget) {
      setPlanActivity(null);
      setTab('postId' in activeWallTarget ? 'wall' : 'activities');
    }
  }, [activeWallTarget]);
  useEffect(() => {
    if (!activeWallTarget && activeHomeTarget) {
      setPlanActivity(null);
      setTab(homeClassroomTab(activeHomeTarget));
      if (activeHomeTarget.kind === 'classroom' && activeHomeTarget.topicId)
        setSelectedTopic({ roomId: id, id: activeHomeTarget.topicId });
    }
  }, [activeHomeTarget, activeWallTarget, id]);
  async function action(task: () => Promise<void>, section = tab) {
    if (section === 'settings') settingsOperation.current++;
    setActionStates(previous => ({ ...previous, [section]: { busy: true, error: '' } }));
    try {
      await task();
    } catch (e) {
      if (!isCurrentRoom()) return;
      if ((e as { status?: number }).status === 409 && section === 'settings') setSettingsConflict(true);
      setActionStates(previous => ({ ...previous, [section]: { busy: false, error: (e as Error).message } }));
      return;
    }
    if (isCurrentRoom()) setActionStates(previous => ({ ...previous, [section]: { busy: false, error: '' } }));
  }
  const reloadSettings = useSettingsReload({
    actionStates,
    settingsOperation,
    reload: detail.reloadWithResult,
    isCurrentRoom,
    setSettings,
    setSettingsRevision,
    setSettingsConflict,
    setActionStates,
  });
  const tabLabels: Record<string, string> = {
    members: teacher ? 'Estudiantes' : 'Compañeros',
    history: 'Historial',
    plan: 'Plan',
    library: 'Biblioteca',
    activities: 'Actividades',
    progress: teacher ? 'Progreso' : 'Mi progreso',
    wall: 'Muro',
    settings: 'Ajustes',
  };
  function openProgressActivity(activityId?: string, attemptId?: string) {
    setSupportStudent(null);
    setSummary(null);
    setPlanActivity(
      activityId
        ? { kind: teacher ? 'submission' : 'activity', classroomId: id, activityId, attemptId: attemptId ?? null }
        : null,
    );
    setTab('activities');
  }
  return (
    <>
      <nav className="brujula-breadcrumb parity-room-breadcrumb" aria-label="Ubicación">
        <button className="classroom-back" type="button" onClick={onExit}>
          Mis aulas
        </button>
        {room ? (
          <>
            <FoxmindIcon name="chevron-right" />
            <span aria-current="page">{room.name}</span>
          </>
        ) : null}
      </nav>
      {detail.error ? (
        <Notice error>
          {detail.error} <button onClick={() => void load()}>Actualizar aula</button>
        </Notice>
      ) : null}
      {!room && detail.status !== 'error' ? <ClassroomLoading /> : null}
      {room ? (
        <div className={`classroom-workspace classroom-redesign ${experience.scope}`} data-active-section={tab}>
          <ClassroomHeader
            room={room}
            onNavigate={setTab}
            pendingCount={pendingActivityCount}
            onInvite={() => setInviting(true)}
          />
          {room.archived ? (
            <Notice>
              Aula archivada · Podés consultar el contenido. No se pueden publicar ni editar materiales o actividades.
            </Notice>
          ) : null}
          {notice ? (
            <div className="p5-notice classroom-success" role="status">
              {notice}
            </div>
          ) : null}
          <ClassroomNavigation teacher={!!teacher} selected={tab} onSelect={setTab} tabsRef={tabs} />
          <section
            data-classroom-tab={tab}
            className={`p5-surface ${tab === 'plan' ? 'fm3-plan-surface' : 'folder-panel tone-coral'}`}
            aria-labelledby="classroom-section-title"
          >
            <h2 id="classroom-section-title" className="classroom-section-title">
              {tabLabels[tab]}
            </h2>
            <div hidden={!!summary}>
              {error ? <Notice error>{error}</Notice> : null}
              {tab === 'members' || tab === 'history' ? (
                <ResourceNotice
                  resource={tab === 'history' ? historyResource : memberResource}
                  loadingTitle={
                    tab === 'history' ? 'Estamos buscando los movimientos del aula' : 'Estamos buscando a tu grupo'
                  }
                />
              ) : null}
              {tab === 'members' || tab === 'history' ? (
                <>
                  <ClassroomRoster
                    tab={tab}
                    teacher={!!teacher}
                    room={room}
                    busy={busy}
                    members={members}
                    history={history}
                    memberResource={memberResource}
                    historyResource={historyResource}
                    roster={roster}
                    api={api}
                    id={id}
                    access={
                      teacher && tab === 'members' ? (
                        <ClassroomMembers
                          part="code"
                          api={api}
                          id={id}
                          room={room}
                          busy={busy}
                          code={code}
                          setCode={setCode}
                          setNotice={setNotice}
                          setConfirm={setConfirm}
                          isCurrentRoom={isCurrentRoom}
                          invitations={invitations}
                          invitationAction={invitationAction}
                          invitationResource={invitationResource}
                          action={action}
                        />
                      ) : undefined
                    }
                    isCurrentRoom={isCurrentRoom}
                    setInviting={setInviting}
                    setSummary={value => {
                      if (navigation.current === currentNavigation) setSummary(value);
                    }}
                    onRecord={
                      activeSupport
                        ? member => {
                            if (member.studentId)
                              setSupportStudent({
                                classroomId: id,
                                studentId: member.studentId,
                                firstName: member.firstName,
                                lastName: member.lastName,
                                division: room.division,
                                email: member.email,
                              });
                          }
                        : undefined
                    }
                    priorityBadge={studentId => {
                      const value = supportByMember?.get(studentId)?.priority;
                      return value ? <SupportPriority value={value} /> : null;
                    }}
                    setConfirm={setConfirm}
                    action={action}
                  />
                  {teacher && tab === 'members' ? (
                    <ClassroomMembers
                      part="invitations"
                      api={api}
                      id={id}
                      room={room}
                      busy={busy}
                      code={code}
                      setCode={setCode}
                      setNotice={setNotice}
                      setConfirm={setConfirm}
                      isCurrentRoom={isCurrentRoom}
                      invitations={invitations}
                      invitationAction={invitationAction}
                      invitationResource={invitationResource}
                      action={action}
                    />
                  ) : null}
                </>
              ) : null}
              {retained('plan') ? (
                <div hidden={tab !== 'plan'} key={`${id}-plan`}>
                  <Plan
                    api={api}
                    room={room}
                    reload={load}
                    selectedTopicId={selectedTopic?.roomId === id ? selectedTopic.id : undefined}
                    onSelectTopic={topicId => setSelectedTopic({ roomId: id, id: topicId })}
                    onCreateActivity={
                      room.role === 'teacher' && !room.archived
                        ? context => {
                            setPlanActivity(null);
                            setCreationContext(context);
                            setTab('activities');
                          }
                        : undefined
                    }
                    onAddMaterial={room.role === 'teacher' && !room.archived ? setUploadContext : undefined}
                    onOpenMaterial={materialId => setPlanMaterial({ roomId: id, id: materialId })}
                    onOpenActivity={activityId => {
                      setPlanActivity({ kind: 'activity', classroomId: id, activityId, attemptId: null });
                      setTab('activities');
                    }}
                  />
                </div>
              ) : null}
              {tab === 'progress' ? (
                <Progress
                  operations={progressOperations}
                  classroomId={id}
                  expectedScope={teacher ? 'classroom' : 'self'}
                  onOpenActivity={openProgressActivity}
                  onReview={teacher ? openProgressActivity : undefined}
                  onOpenResult={
                    !teacher
                      ? (activityId, attemptId) => {
                          setPlanActivity({ kind: 'grade', classroomId: id, activityId, attemptId });
                          setTab('activities');
                        }
                      : undefined
                  }
                  onShowActivities={() => openProgressActivity()}
                  onOpenStudent={
                    teacher
                      ? studentId =>
                          void action(async () => {
                            const result = await api.call<Summary>(`/${id}/members/${studentId}`);
                            if (isCurrentRoom() && navigation.current === currentNavigation)
                              setSummary({ ...result, progress: true, studentId });
                          })
                      : undefined
                  }
                />
              ) : null}
              {retained('library') ? (
                <div hidden={tab !== 'library'} key={`${id}-library`}>
                  <Library
                    api={materialsApi}
                    room={room}
                    reload={load}
                    active={tab === 'library'}
                    targetMaterialId={activeHomeTarget?.kind === 'material' ? activeHomeTarget.materialId : undefined}
                    openUpload={activeHomeTarget?.kind === 'upload-material'}
                  />
                </div>
              ) : null}
              {tab === 'plan' && planMaterial?.roomId === id ? (
                <Library
                  api={materialsApi}
                  room={room}
                  reload={load}
                  active
                  presentation="reader"
                  targetMaterialId={planMaterial.id}
                  onReaderClose={() => setPlanMaterial(null)}
                />
              ) : null}
              {tab === 'plan' && uploadContext && teacher && !room.archived ? (
                <Library
                  api={materialsApi}
                  room={room}
                  reload={load}
                  active
                  presentation="upload"
                  uploadContext={uploadContext}
                  onUploadClose={() => setUploadContext(null)}
                />
              ) : null}
              {tab === 'wall' ? (
                <Wall
                  api={api}
                  room={room}
                  reload={load}
                  target={destination && 'postId' in destination ? destination : null}
                  onChanged={onWallChanged}
                  openComposer={activeHomeTarget?.kind === 'publish-notice'}
                />
              ) : null}
              {retained('activities') ? (
                <div hidden={tab !== 'activities'} key={`${id}-activities`}>
                  <Activities
                    api={api}
                    room={room}
                    reload={load}
                    active={tab === 'activities'}
                    target={planActivity ?? (destination && 'kind' in destination ? destination : null)}
                    creationContext={creationContext}
                    onCreationContextConsumed={() => setCreationContext(null)}
                    openAuthoring={activeHomeTarget?.kind === 'create-activity'}
                    submissionFilter={activeHomeTarget?.kind === 'submissions' ? 'unpublished' : undefined}
                    onChanged={() => {
                      void activitySummary.reload();
                      onWallChanged?.();
                    }}
                  />
                </div>
              ) : null}
              {tab === 'settings' && teacher ? (
                <ClassroomSettings
                  api={api}
                  id={id}
                  room={room}
                  settings={settings}
                  setSettings={setSettings}
                  settingsRevision={settingsRevision}
                  setSettingsRevision={setSettingsRevision}
                  settingsConflict={settingsConflict}
                  setSettingsConflict={setSettingsConflict}
                  reloadSettings={reloadSettings}
                  isCurrentRoom={isCurrentRoom}
                  busy={busy}
                  load={load}
                  action={action}
                  setNotice={setNotice}
                  setConfirm={setConfirm}
                />
              ) : null}
              {!teacher && tab === 'members' ? (
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
                            try {
                              await api.call(`/${id}`);
                            } catch (accessError) {
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
                    Salir de esta aula
                  </button>
                </footer>
              ) : null}
            </div>
            {activeSupport && supportStudent?.classroomId === id ? (
              <TeacherSupportDialog
                key={supportStudent.studentId}
                client={activeSupport}
                student={supportStudent}
                onClose={() => setSupportStudent(null)}
                onRevoked={() => {
                  void refreshRoster();
                }}
                progress={
                  <Progress
                    operations={progressOperations}
                    classroomId={id}
                    studentId={supportStudent.studentId}
                    onOpenActivity={openProgressActivity}
                    onReview={openProgressActivity}
                  />
                }
                analysis={
                  <StudentAiSummary
                    operations={analysisOperations}
                    classroomId={id}
                    studentId={supportStudent.studentId}
                  />
                }
                onRemove={() => {
                  const studentId = supportStudent.studentId;
                  setSupportStudent(null);
                  setConfirm({
                    title: 'Dar de baja del aula',
                    text: 'Se conservarán sus entregas y resultados en Historial. Dejará de integrar los indicadores del grupo actual.',
                    run: async () => {
                      await api.call(`/${id}/members/${studentId}/remove`, 'POST', {});
                      await Promise.all([refreshRoster(), historyResource.reload(), load()]);
                    },
                  });
                }}
              />
            ) : null}
            <ClassroomDialogs
              api={api}
              id={id}
              tab={tab}
              inviting={inviting}
              setInviting={setInviting}
              onInvitationsChanged={invitationResource.reload}
              actionStates={actionStates}
              confirm={confirm}
              setConfirm={setConfirm}
              isCurrentRoom={isCurrentRoom}
              summary={summary}
              setSummary={setSummary}
              action={action}
              onOpenActivity={(activityId, attemptId) => {
                setSummary(null);
                setPlanActivity({
                  kind: attemptId ? 'submission' : 'activity',
                  classroomId: id,
                  activityId,
                  attemptId: attemptId ?? null,
                });
                setTab('activities');
              }}
              onRemoveStudent={
                summary && !room.archived && members.some(member => member.studentId === summary.studentId)
                  ? () =>
                      setConfirm({
                        title: 'Dar de baja del aula',
                        text: 'Se conservarán sus entregas y resultados en Historial. Dejará de integrar los indicadores del grupo actual.',
                        run: async () => {
                          await api.call(`/${id}/members/${summary.studentId}/remove`, 'POST', {});
                          await Promise.all([memberResource.reload(), historyResource.reload(), load()]);
                          setSummary(null);
                        },
                      })
                  : undefined
              }
            />
          </section>
        </div>
      ) : null}
    </>
  );
}
