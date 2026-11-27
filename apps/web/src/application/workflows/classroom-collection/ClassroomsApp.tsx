'use client';
import surface from '../../shell/styles/classrooms-surface.module.css';
import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense, type ReactNode } from 'react';
import { useScopedValue } from '../../../shared/use-scoped-value.ts';
import type { ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import type { Draft, Invitation } from '../../../../../../src/core/contracts/classrooms.ts';
import type { NotificationTarget } from '../../../../../../src/core/contracts/notifications.ts';
import type { HomeTarget } from '../../../../../../src/core/domain/home/home.ts';
import type { HomeClient } from '../../../features/home/index.ts';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon.tsx';
import { Dialog, Notice } from '../../../../../shared-ui/feedback.tsx';
import {
  ClassroomCollection, ClassroomLoading, ClassroomCollectionHero, PendingInvitations, InvitationPreview,
  classroomExperienceStyles as experience, createClassroomCollectionOperations, useClassroomCollection,
  collectionLabels, createEnrollmentOperations, useClassroomEnrollment,
} from '../../../features/classrooms/index.ts';
import { Notifications } from '../../../features/notifications/index.ts';
import { createWebAgendaClient } from '../../clients/agenda-client.ts';
import { createTeacherSupportClient } from '../../transport/teacher-support-client.ts';
import { TeacherSupportWidget } from '../../../features/teacher-support/index.ts';
import { Home } from '../../../features/home/index.ts';
import { AppNavbar } from '../../../../../shared-ui/AppNavbar.tsx';
import { AiQuotaIndicator } from '../../navigation/ai-quota-indicator.tsx';
import { createBrujulaSearchClient } from '../../../../../shared-ui/brujula-search-client.ts';
import { brujulaSearchDestination } from '../../../../../../src/core/domain/classrooms/brujula-search.ts';
import { grantActivityResponse } from '../../../features/participation/index.ts';
const Wizard = lazy(() =>
  import('../classroom-creation/ClassroomWizard.tsx').then((module) => ({ default: module.Wizard })),
);
const ClassroomView = lazy(() =>
  import('../classroom-workspace/ClassroomWorkspace.tsx').then((module) => ({
    default: module.ClassroomView,
  })),
);

export interface CollectionDeparture { kind?: 'success' | 'info'; collectionState?: 'active' | 'pending' }

export function ClassroomsApp({
  api,
  displayName,
  accountEmail,
  avatarKey,
  accountRole,
  subjectId,
  homeClient,
  accountActions,
  requestedInvitation,
  requestedNotification,
  requestedTarget,
  navigationNotice,
  navigationFeedback,
  initialPresentation = 'classrooms',
  onNavigate,
  onEnterClassroom,
  onResolveInvitation,
  onOpenHomeTarget,
  onSelectNotification,
  requestedHomeTarget,
}: {
  api: ClassroomClient;
  displayName: string;
  accountEmail?: string;
  avatarKey?: string;
  accountRole?: 'teacher' | 'student';
  subjectId?: string;
  homeClient?: HomeClient;
  accountActions?: ReactNode;
  requestedInvitation?: string;
  requestedNotification?: string;
  initialPresentation?: 'home' | 'classrooms';
  onNavigate?: (presentation: 'home' | 'classrooms' | 'agenda', notice?: string, feedback?: CollectionDeparture) => void;
  onEnterClassroom?: (id: string) => Promise<unknown>;
  onResolveInvitation?: (message: string) => Promise<boolean>;
  onOpenHomeTarget?: (target: Exclude<HomeTarget, { kind: 'private-event' }>) => Promise<unknown>;
  onSelectNotification?: (id: string) => Promise<unknown>;
  requestedHomeTarget?: Exclude<HomeTarget, { kind: 'private-event' }>;
  requestedTarget?: { classroomId: string; activityId: string | null };
  navigationNotice?: string;
  navigationFeedback?: CollectionDeparture;
}) {
  const [activitiesRoom,setActivitiesRoom]=useState<string|null>(null);
  const [presentation, setPresentation] = useState(initialPresentation);
  const [resolvedInvitation, setResolvedInvitation] = useState<string>();
  const [collectionRevision, setCollectionRevision] = useState(0);
  const [collectionState, setCollectionState] = useState<'active' | 'pending'>();
  const [noticeKind, setNoticeKind] = useState<'info' | 'success'>('info');
  const requestedInvitationId = requestedInvitation?.toLowerCase();
  const pendingInvitationId = requestedInvitationId === resolvedInvitation ? undefined : requestedInvitationId;
  const supportClient = useMemo(() => createTeacherSupportClient(api), [api]);
  const homeAgendaClient = useScopedValue(() => createWebAgendaClient(), [subjectId]);
  const searchContent = useScopedValue(() => createBrujulaSearchClient(api), [api, subjectId]);
  const operations = useMemo(() => createClassroomCollectionOperations(api), [api]);
  const enrollment = useMemo(() => createEnrollmentOperations(api), [api]);
  const { data, setData, errors: collectionErrors, load, invalidate } = useClassroomCollection(operations);
  const [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false),
    [search, setSearch] = useState(''),
    [draft, setDraft] = useState<Draft | null>(null),
    [classroomId, setClassroomId] = useState<string | null>(requestedHomeTarget?.classroomId ?? null);
  const [deletingDraft, setDeletingDraft] = useState<Draft | null>(null), [deleteError, setDeleteError] = useState('');
  const deleting = useRef(false);
  const [wallTarget, setWallTarget] = useState<NotificationTarget | null>(null), [notificationRefresh, setNotificationRefresh] = useState(0);
  const [homeTarget, setHomeTarget] = useState<HomeTarget | null>(requestedHomeTarget ?? null);
  const refreshNotifications = useCallback(() => setNotificationRefresh(value => value + 1), []);
  const [sharedCode, setSharedCode] = useState<string | null>(null);
  const { join, setJoin, code, setCode, preview, setPreview, joinError, setJoinError, enterCode } = useClassroomEnrollment(enrollment, setBusy, async confirmed => {
    setSharedCode(null);
    setNoticeKind('success'); setCollectionState('active');
    setNotice(`Ya sos parte de ${confirmed.classroom.name}. La encontrás en tus aulas.`);
    setSearch('');
    setCollectionRevision(value => value + 1);
    refreshNotifications();
    await load();
  });
  useEffect(() => {
    const controller = new AbortController();
    const homeOnly = initialPresentation === 'home' && !requestedTarget && !requestedHomeTarget;
    void load(controller.signal, homeOnly ? 'rooms' : undefined);
    return () => controller.abort();
  }, [load, initialPresentation, requestedTarget, requestedHomeTarget]);
  async function action(task: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await task();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const showPresentation = (next: 'home' | 'classrooms', departureNotice?: string) => {
    setDraft(null);
    setClassroomId(null);
    setSharedCode(null);
    setWallTarget(null);
    setHomeTarget(null);
    setError('');
    setPresentation(next);
    if ((next !== initialPresentation || requestedTarget || requestedHomeTarget || requestedNotification) && onNavigate) { onNavigate(next, departureNotice); return; }
    if (next === 'classrooms') void action(() => load());
  };
  const leaveView = () => showPresentation('classrooms');
  const leaveSavedDraft = () => {
    const message = 'Borrador guardado. Podés retomarlo cuando quieras.';
    setNotice(message); setNoticeKind('success'); setSearch('');
    setCollectionState('pending'); setCollectionRevision(value => value + 1);
    setDraft(null); setPresentation('classrooms');
    if (initialPresentation !== 'classrooms' && onNavigate) {
      onNavigate('classrooms', message, {kind:'success', collectionState:'pending'});
    } else void action(() => load());
  };
  const openTarget = (target: NotificationTarget) => {
    setHomeTarget(null); setWallTarget(target); setSharedCode(null); setClassroomId(target.classroomId);
  };
  const openHomeTarget = (target: HomeTarget) => {
    if (target.kind === 'private-event') { window.location.assign(`/agenda?event=${encodeURIComponent(target.eventId)}&date=${encodeURIComponent(target.date)}`); return; }
    if(target.kind==='activity'&&target.mode==='respond')grantActivityResponse(target.classroomId,target.activityId);
    if (onOpenHomeTarget) { void action(async () => { await onOpenHomeTarget(target); }); return; }
    setDraft(null); setSharedCode(null); setWallTarget(null); setHomeTarget(target); setClassroomId(target.classroomId);
  };
  useEffect(() => {
    if (!requestedTarget) return;
    setDraft(null); setSharedCode(null); setHomeTarget(null); setClassroomId(requestedTarget.classroomId);
    setWallTarget(requestedTarget.activityId ? { kind: 'activity', ...requestedTarget, activityId: requestedTarget.activityId, attemptId: null } : null);
  }, [requestedTarget]);
  useEffect(() => {
    if (!requestedNotification) return;
    const controller = new AbortController();
    void api.call<NotificationTarget>(`/notifications/${requestedNotification}/open`, 'POST', {}, controller.signal)
      .then(target => { if (!controller.signal.aborted) { openTarget(target); refreshNotifications(); } })
      .catch(failure => { if (!controller.signal.aborted) setError(failure.message); });
    return () => controller.abort();
  }, [api, requestedNotification, refreshNotifications]);
  async function respondToInvitation(invitation: Invitation, decision: 'accept' | 'decline') {
    await enrollment.respondInvitation(invitation.id, decision);
    const joined = decision === 'accept';
    const message = joined ? `Ya sos parte de ${invitation.name}. La encontrás en tus aulas.` : 'Invitación rechazada.';
    const invitationId = invitation.id.toLowerCase();
    const linked = pendingInvitationId === invitationId;
    invalidate('invitations');
    setData(previous => ({ ...previous, invitations: previous.invitations?.filter(item => item.id.toLowerCase() !== invitationId) }));
    setNotice(message); setNoticeKind('success');
    if (linked) setResolvedInvitation(invitationId);
    if (joined) {
      setCollectionState('active'); setSearch('');
      setCollectionRevision(value => value + 1);
    }
    refreshNotifications();
    if (linked && onResolveInvitation) {
      try { if (await onResolveInvitation(message)) return; }
      catch { /* Keep the confirmed response visible if navigation fails. */ }
    }
    await load(undefined, joined ? undefined : 'invitations');
  }

  if (accountRole !== 'teacher' && accountRole !== 'student') return <Notice error>No pudimos comprobar el rol de tu cuenta.</Notice>;
  return (
    <div className={`p5-app fm3-classrooms ${surface.scope} ${experience.application}${draft ? ' entry-wizard-reference entry-classrooms-reference collection-workspace-page' : !classroomId ? presentation === 'home' ? ' entry-home' : ' entry-classrooms-reference collection-workspace-page' : ' classroom-interior-reference'}`}>
      <a className="skip-link" href="#classroom-main">Saltar al contenido</a>
      <AppNavbar avatarKey={avatarKey} logoHref="/inicio" displayName={displayName} accountEmail={accountEmail} accountRole={accountRole} search={searchContent}
        quotaIndicator={subjectId ? <AiQuotaIndicator key={subjectId} subjectId={subjectId} /> : undefined}
        classroomLinks={[...(data.teach ?? []), ...(data.study ?? [])].filter(room => !room.archived).map(room => ({ href: `/mis-aulas?aula=${encodeURIComponent(room.id)}`, label: room.name,coverKey:room.coverKey, current: classroomId === room.id }))}
        links={[{ href: '/inicio', label: 'Inicio', current: !classroomId && presentation === 'home' },
            { href: '/mis-aulas', label: 'Mis aulas', current: presentation === 'classrooms' || Boolean(classroomId) },
            ...(accountRole==='student'?[{href:'/carpetas-de-estudio',label:'Mi estudio'}]:[]),
            { href: '/agenda', label: 'Agenda' },
            ...(accountRole === 'teacher' ? [{ href: '/foxy-ai', label: 'Foxy AI' }] : [])]}
        onNavigate={href => {
          if (draft) return;
          const searchTarget = brujulaSearchDestination(href);
          if (searchTarget) { openHomeTarget(searchTarget); return; }
          if (href.startsWith('/mis-aulas?aula=')) {
            const targetId = new URL(href, window.location.origin).searchParams.get('aula');
            if (targetId) { if (onEnterClassroom) void action(async () => { await onEnterClassroom(targetId); }); else { setSharedCode(null); setClassroomId(targetId); } }
            return;
          }
          if (href === '/profile' || href === '/settings' || (href === '/foxy-ai' && accountRole === 'teacher') || (href==='/carpetas-de-estudio'&&accountRole==='student')) { window.location.assign(href); return; }
          if (href === '/agenda') { if (onNavigate) onNavigate('agenda'); else window.location.assign('/agenda'); return; }
          showPresentation(href === '/inicio' ? 'home' : 'classrooms');
        }}
        homeNavigation={presentation === 'home' && !classroomId && !draft}
        notifications={(onSelectNotification
          ? <Notifications api={api} refresh={notificationRefresh} onSelect={id => void action(async () => { await onSelectNotification(id); })} />
          : <Notifications api={api} refresh={notificationRefresh} onOpen={openTarget} />)}
        accountActions={accountActions} />
      <main id="classroom-main" className="p5-main">
        {draft ? (
          <Suspense fallback={<Notice>Cargando asistente…</Notice>}>
            <Wizard
              api={api}
              draft={draft}
              onExit={leaveSavedDraft}
              onPublished={() => {
                setDraft(null);
                setClassroomId(null);
                setSharedCode(null);
                setSearch('');
                setCollectionRevision(value => value + 1);
                setNoticeKind('success'); setCollectionState('active');
                setNotice('Aula creada. Ya podés invitar a tus estudiantes.');
                if (presentation !== 'classrooms') {
                  setPresentation('classrooms');
                  onNavigate?.('classrooms', 'Aula creada. Ya podés invitar a tus estudiantes.', {kind:'success',collectionState:'active'});
                }
                void load();
              }}
            />
          </Suspense>
        ) : null}
        {classroomId ? (
          <Suspense fallback={<ClassroomLoading />}>
            <ClassroomView
              key={classroomId}
              api={api}
              id={classroomId}
              supportClient={accountRole==='teacher' ? supportClient : undefined}
              onExit={leaveView}
              onMembershipEnded={confirmed => {
                setData(current => ({ ...current, study: current.study?.filter(room => room.id !== classroomId) }));
                const message = confirmed ? 'Saliste del aula' : 'Ya no tenés acceso al aula';
                setNotice(message); setNoticeKind('info');
                showPresentation('classrooms', message);
              }}
              initialSection={activitiesRoom===classroomId?'activities':undefined}
              initialCode={sharedCode}
              wallTarget={wallTarget?.classroomId === classroomId ? wallTarget : null}
              homeTarget={homeTarget && 'classroomId' in homeTarget && homeTarget.classroomId === classroomId ? homeTarget : null}
              onWallChanged={refreshNotifications}
            />
          </Suspense>
        ) : presentation === 'home' ? (
          <>
            {error ? <Notice error>{error} <button disabled={busy} onClick={() => setError('')}>Cerrar aviso</button></Notice> : null}
            <Home teacherSupport={accountRole==='teacher' ? <TeacherSupportWidget key={subjectId} client={supportClient}/> : undefined} agendaClient={homeAgendaClient} data={{teach:data.teach??[],study:data.study??[],drafts:data.drafts??[],invitations:data.invitations??[]}} api={api} accountRole={accountRole} displayName={displayName} subjectId={subjectId} homeClient={homeClient} busy={busy}
              onOpenActivities={id=>{setActivitiesRoom(id);setHomeTarget(null);setWallTarget(null);setClassroomId(id);}} onAction={openHomeTarget} onAgenda={() => { if (onNavigate) onNavigate('agenda'); else window.location.assign('/agenda'); }}
              onCreate={() => void action(async () => { setDraft(await operations.createDraft()); })}
              onJoin={() => { setJoin(true); setJoinError(''); setPreview(null); }}
              onClassrooms={leaveView} />
          </>
        ) : (
          <div className="parity-catalog">
            <ClassroomCollectionHero accountRole={accountRole} busy={busy} activeCount={data.teach&&data.study?(accountRole==='teacher'?data.teach:data.study).filter(room=>!room.archived).length:undefined}
              onJoin={() => { setJoin(true); setJoinError(''); setPreview(null); }}
              onCreate={() => void action(async () => { setDraft(await operations.createDraft()); })} />
            {notice || navigationNotice ? <div className="collection-notice" data-notice-kind={notice ? noticeKind : navigationFeedback?.kind ?? 'info'}><Notice>{notice || navigationNotice}</Notice></div> : null}
            {error ? (
              <Notice error>
                {error}{' '}
                <button onClick={() => void action(() => load())}>
                  Volver a intentar
                </button>
              </Notice>
            ) : null}
            {!data.teach && !collectionErrors.rooms ? <Notice>Cargando tus aulas…</Notice> : null}
            {(['rooms', 'drafts', 'invitations'] as const).map(part => collectionErrors[part] ? (
              <Notice key={part} error>No pudimos cargar {collectionLabels[part]}.
                {' '}<button onClick={() => void load(undefined, part)}>Volver a intentar</button>
              </Notice>
            ) : null)}
            {data.invitations && pendingInvitationId && !data.invitations.some(item => item.id.toLowerCase() === pendingInvitationId) ? (
              <Notice>Esta invitación no está pendiente para la cuenta actual. Puede haber vencido, haberse utilizado o corresponder a otro correo. Revisa tus invitaciones o cambia de cuenta desde tu perfil.</Notice>
            ) : null}
            {accountRole==='student' && data.invitations?.length ? <PendingInvitations items={data.invitations} requested={pendingInvitationId}
              onAccept={invitation => respondToInvitation(invitation, 'accept')}
              onDecline={invitation => respondToInvitation(invitation, 'decline')}/> : null}
            {data.teach && data.study ? <ClassroomCollection key={`${collectionRevision}:${collectionState ?? navigationFeedback?.collectionState ?? 'active'}`} initialState={collectionState ?? navigationFeedback?.collectionState ?? 'active'} accountRole={accountRole} teach={data.teach} study={data.study} search={search} onSearch={setSearch}
              onJoin={() => { setJoin(true); setJoinError(''); setPreview(null); }}
              onCreate={() => void action(async () => { setDraft(await operations.createDraft()); })}
              drafts={data.drafts} busy={busy} onContinue={id => void action(async () => setDraft(await operations.getDraft(id)))}
              onDelete={item => { setDeleteError(''); setDeletingDraft(item); }}
              onEnter={id => {
                if (onEnterClassroom) { void action(async () => { await onEnterClassroom(id); }); return; }
                setSharedCode(null); setClassroomId(id);
              }} /> : null}
          </div>
        )}
      </main>
      {deletingDraft ? <Dialog title="Eliminar borrador" onClose={() => { if (!deleting.current) setDeletingDraft(null); }}>
        <p>Vas a eliminar «{deletingDraft.payload.name || 'Aula sin nombre'}». Se perderán los datos guardados de esta creación. Esta acción no se puede deshacer.</p>
        {deleteError ? <Notice error>{deleteError}</Notice> : null}
        <footer className="p5-form-footer">
          <button type="button" disabled={busy} onClick={() => setDeletingDraft(null)}>Cancelar</button>
          <button type="button" className="danger" disabled={busy} onClick={() => {
            if (deleting.current) return;
            deleting.current = true; setBusy(true); setDeleteError('');
            const item = deletingDraft;
            void operations.deleteDraft(item.id, item.revision).then(async () => {
              invalidate('drafts');
              setData(current => ({ ...current, drafts: current.drafts?.filter(d => d.id !== item.id) }));
              setDeletingDraft(null); setNoticeKind('success'); setNotice('Pendiente eliminado.');
              await load(undefined, 'drafts');
            }).catch(() => setDeleteError('No pudimos eliminar el borrador. Puede haber cambiado o ya estar creado. Cerrá este diálogo y actualizá la lista antes de volver a intentar.'))
              .finally(() => { deleting.current = false; setBusy(false); });
          }}>{busy ? 'Eliminando…' : 'Eliminar borrador'}</button>
        </footer>
      </Dialog> : null}
      {join ? (
        <Dialog
          className={`parity-collection-dialog ${preview ? 'invitation-dialog' : 'collection-join-dialog'}`}
          title={preview ? 'Hay un lugar para vos' : 'Un nuevo lugar para aprender'}
          onClose={() => {
            if (!busy) setJoin(false);
          }}
        >
          <p className="collection-dialog-subtitle">{preview ? 'Revisá el grupo antes de sumarte.' : 'Ingresá el código que compartió tu docente.'}</p>
          {joinError ? <Notice error>{joinError}</Notice> : null}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void enterCode();
            }}
          >
            {preview ? <InvitationPreview classroom={preview.classroom}/> : (
              <div className="collection-code-field"><label>Código del aula
                <input required autoFocus placeholder="ABCD-EFGH" value={code} maxLength={16}
                  autoCapitalize="characters" autoCorrect="off" spellCheck={false} aria-describedby="join-code-hint"
                  onChange={event=>setCode(event.target.value.toUpperCase())} autoComplete="off"/>
              </label><small id="join-code-hint">Son 8 letras y números. Los códigos anteriores de 6 dígitos también funcionan.</small></div>
            )}
            <footer className="p5-form-footer">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setJoin(false);
                }}
              >
                {preview ? 'Ahora no' : 'Cancelar'}
              </button>
              <button className="primary" disabled={busy}>
                {preview ? <FoxmindIcon name="arrow-right"/> : null}
                {busy
                  ? 'Consultando…'
                  : preview
                    ? 'Aceptar y unirme'
                    : 'Ver aula'}
                {!preview ? <FoxmindIcon name="arrow-right"/> : null}
              </button>
            </footer>
          </form>
        </Dialog>
      ) : null}
    </div>
  );
}
