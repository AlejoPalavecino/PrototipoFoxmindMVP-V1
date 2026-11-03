'use client';
import surface from './classrooms-surface.module.css';
import { useState, useEffect, useCallback, useRef, lazy, Suspense, type ReactNode } from 'react';
import type { ClassroomClient, Classroom, Draft, Invitation, NotificationTarget } from './api.ts';
import type { HomeTarget } from '../../src/core/domain/index.ts';
import type { HomeClient } from './home-api.ts';
import { Dialog, Notice } from './components.tsx';
import { ClassroomCollection } from './ClassroomCollection.tsx';
import { ClassroomCollectionHero } from './ClassroomCollectionHero.tsx';
import { Notifications } from './Notifications.tsx';
import { Home } from './Home.tsx';
import { EntryIcon } from '../shared-ui/EntryIcon';
import { AppNavbar } from '../shared-ui/AppNavbar.tsx';
const Wizard = lazy(() =>
  import('./Wizard.tsx').then((module) => ({ default: module.Wizard })),
);
const ClassroomView = lazy(() =>
  import('./ClassroomView.tsx').then((module) => ({
    default: module.ClassroomView,
  })),
);
const collectionLabels = { rooms: 'tus aulas', drafts: 'tus borradores', invitations: 'tus invitaciones' } as const;
type CollectionPart = keyof typeof collectionLabels;
interface HomeData {
  teach: Classroom[];
  study: Classroom[];
  drafts: Draft[];
  invitations: Invitation[];
}
export function ClassroomsApp({
  api,
  displayName,
  accountRole,
  subjectId,
  homeClient,
  accountActions,
  requestedInvitation,
  requestedNotification,
  requestedTarget,
  navigationNotice,
  initialPresentation = 'classrooms',
  onNavigate,
  onEnterClassroom,
  onOpenHomeTarget,
  onSelectNotification,
  requestedHomeTarget,
}: {
  api: ClassroomClient;
  displayName: string;
  accountRole?: 'teacher' | 'student';
  subjectId?: string;
  homeClient?: HomeClient;
  accountActions?: ReactNode;
  requestedInvitation?: string;
  requestedNotification?: string;
  initialPresentation?: 'home' | 'classrooms';
  onNavigate?: (presentation: 'home' | 'classrooms' | 'agenda', notice?: string) => void;
  onEnterClassroom?: (id: string) => Promise<unknown>;
  onOpenHomeTarget?: (target: Exclude<HomeTarget, { kind: 'private-event' }>) => Promise<unknown>;
  onSelectNotification?: (id: string) => Promise<unknown>;
  requestedHomeTarget?: Exclude<HomeTarget, { kind: 'private-event' }>;
  requestedTarget?: { classroomId: string; activityId: string | null };
  navigationNotice?: string;
}) {
  const [presentation, setPresentation] = useState(initialPresentation);
  const [data, setData] = useState<Partial<HomeData>>({}),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false),
    [search, setSearch] = useState(''),
    [draft, setDraft] = useState<Draft | null>(null),
    [classroomId, setClassroomId] = useState<string | null>(requestedHomeTarget?.classroomId ?? null);
  const [wallTarget, setWallTarget] = useState<NotificationTarget | null>(null), [notificationRefresh, setNotificationRefresh] = useState(0);
  const [homeTarget, setHomeTarget] = useState<HomeTarget | null>(requestedHomeTarget ?? null);
  const refreshNotifications = useCallback(() => setNotificationRefresh(value => value + 1), []);
  const [join, setJoin] = useState(false),
    [code, setCode] = useState(''),
    [preview, setPreview] = useState<{
      confirmation: string;
      classroom: {
        name: string;
        subject: string;
        division: string;
        academicYear: number;
        teacher: string;
      };
    } | null>(null);
  const [joinError, setJoinError] = useState(''),
    [sharedCode, setSharedCode] = useState<string | null>(null);
  const [collectionErrors, setCollectionErrors] = useState<Partial<Record<CollectionPart, boolean>>>({});
  const requests = useRef<Partial<Record<CollectionPart, symbol>>>({});
  const load = useCallback(async (signal?: AbortSignal, only?: CollectionPart) => {
    async function read(part: CollectionPart, request: () => Promise<Partial<HomeData>>) {
      const token = Symbol(part);
      requests.current[part] = token;
      setCollectionErrors(current => ({ ...current, [part]: false }));
      const current = () => !signal?.aborted && requests.current[part] === token;
      try {
        const values = await request();
        if (current()) setData(previous => ({ ...previous, ...values }));
      } catch {
        if (current()) setCollectionErrors(previous => ({ ...previous, [part]: true }));
      }
    }
    await Promise.all([
      !only || only === 'rooms' ? read('rooms', () => api.call<Pick<HomeData, 'teach' | 'study'>>('', undefined, undefined, signal)) : undefined,
      !only || only === 'drafts' ? read('drafts', async () => ({ drafts: await api.call<Draft[]>('/drafts', undefined, undefined, signal) })) : undefined,
      !only || only === 'invitations' ? read('invitations', async () => ({ invitations: await api.call<Invitation[]>('/invitations', undefined, undefined, signal) })) : undefined,
    ]);
  }, [api]);
  useEffect(() => {
    if (initialPresentation === 'home') return;
    const controller = new AbortController();
    if (!requestedTarget && !requestedHomeTarget) void load(controller.signal);
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
  const openTarget = (target: NotificationTarget) => {
    setHomeTarget(null); setWallTarget(target); setSharedCode(null); setClassroomId(target.classroomId);
  };
  const openHomeTarget = (target: HomeTarget) => {
    if (target.kind === 'private-event') { window.location.assign(`/agenda?event=${encodeURIComponent(target.eventId)}&date=${encodeURIComponent(target.date)}`); return; }
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
  async function accept(invitation: Invitation) {
    await api.call(`/invitations/${invitation.id}/accept`, 'POST', {});
    setNotice(`Ya formás parte de ${invitation.name}.`);
    await load();
  }
  async function enterCode() {
    setBusy(true);
    setJoinError('');
    try {
      if (preview) {
        const result = await api.call<{ id: string }>(
          '/codes/confirm',
          'POST',
          { confirmation: preview.confirmation },
        );
        setJoin(false);
        setSharedCode(null);
        setPreview(null);
        setCode('');
        if (onEnterClassroom) {
          try { if (await onEnterClassroom(result.id)) return; }
          catch { /* Enrollment succeeded; keep the classroom accessible if navigation fails. */ }
        }
        setClassroomId(result.id);
      } else
        setPreview(
          await api.call('/codes/preview', 'POST', { code: code.trim() }),
        );
    } catch (e) {
      setJoinError((e as Error).message);
      setPreview(null);
    } finally {
      setBusy(false);
    }
  }
  if (accountRole !== 'teacher' && accountRole !== 'student') return <Notice error>No pudimos comprobar el rol de tu cuenta.</Notice>;
  return (
    <div className={`p5-app fm3-classrooms ${surface.scope}${draft ? ' entry-wizard-reference' : !classroomId ? presentation === 'home' ? ' entry-home' : ' entry-classrooms-reference' : ' classroom-interior-reference'}`}>
      <a className="skip-link" href="#classroom-main">Saltar al contenido</a>
      <AppNavbar logoHref="/mis-aulas" displayName={displayName} restricted={Boolean(draft)}
        links={draft ? [{ href: '/mis-aulas', label: 'Mis aulas', current: true }]
          : [{ href: '/inicio', label: 'Inicio', current: !classroomId && presentation === 'home' },
            { href: '/mis-aulas', label: 'Mis aulas', current: presentation === 'classrooms' || Boolean(classroomId) },
            { href: '/agenda', label: 'Agenda' },
            ...(accountRole === 'teacher' ? [{ href: '/foxy-ai', label: 'Foxy AI' }] : [])]}
        onNavigate={href => {
          if (draft) return;
          if (href === '/profile' || href === '/settings' || (href === '/foxy-ai' && accountRole === 'teacher')) { window.location.assign(href); return; }
          if (href === '/agenda') { if (onNavigate) onNavigate('agenda'); else window.location.assign('/agenda'); return; }
          showPresentation(href === '/inicio' ? 'home' : 'classrooms');
        }}
        notifications={!draft ? (onSelectNotification
          ? <Notifications api={api} refresh={notificationRefresh} onSelect={id => void action(async () => { await onSelectNotification(id); })} />
          : <Notifications api={api} refresh={notificationRefresh} onOpen={openTarget} />) : undefined}
        accountActions={!draft ? accountActions : undefined} />
      <main id="classroom-main" className="p5-main">
        {classroomId && sharedCode ? <section className="folder-created" role="status">
          <div><h2>Aula creada</h2><p>Tu espacio ya está listo. Compartí el código o invitá estudiantes desde Alumnos.</p></div>
          <img src="/foxmind-3d/states/success-320.webp" alt="" width="120" height="120" />
        </section> : null}
        {draft ? (
          <Suspense fallback={<Notice>Cargando asistente…</Notice>}>
            <Wizard
              api={api}
              draft={draft}
              onExit={leaveView}
              onPublished={(id, newCode) => {
                setDraft(null);
                setClassroomId(id);
                setSharedCode(newCode);
                setNotice('Aula creada. Ya podés invitar a tus estudiantes.');
              }}
            />
          </Suspense>
        ) : classroomId ? (
          <Suspense fallback={<Notice>Cargando aula…</Notice>}>
            <ClassroomView
              key={classroomId}
              api={api}
              id={classroomId}
              onExit={leaveView}
              onMembershipEnded={confirmed => {
                setData(current => ({ ...current, study: current.study?.filter(room => room.id !== classroomId) }));
                const message = confirmed ? 'Saliste del aula' : 'Ya no tenés acceso al aula';
                setNotice(message);
                showPresentation('classrooms', message);
              }}
              initialCode={sharedCode}
              wallTarget={wallTarget?.classroomId === classroomId ? wallTarget : null}
              homeTarget={homeTarget && 'classroomId' in homeTarget && homeTarget.classroomId === classroomId ? homeTarget : null}
              onWallChanged={refreshNotifications}
            />
          </Suspense>
        ) : presentation === 'home' ? (
          <>
            {error ? <Notice error>{error} <button disabled={busy} onClick={() => setError('')}>Cerrar aviso</button></Notice> : null}
            <Home accountRole={accountRole} displayName={displayName} subjectId={subjectId} homeClient={homeClient} busy={busy}
              onAction={openHomeTarget} onAgenda={() => { if (onNavigate) onNavigate('agenda'); else window.location.assign('/agenda'); }}
              onCreate={() => void action(async () => { setDraft(await api.call<Draft>('/drafts', 'POST', {})); })}
              onJoin={() => { setJoin(true); setJoinError(''); setPreview(null); }}
              onClassrooms={leaveView} />
          </>
        ) : (
          <>
            <ClassroomCollectionHero accountRole={accountRole} busy={busy}
              onJoin={() => { setJoin(true); setJoinError(''); setPreview(null); }}
              onCreate={() => void action(async () => { setDraft(await api.call<Draft>('/drafts', 'POST', {})); })} />
            {notice || navigationNotice ? <Notice>{notice || navigationNotice}</Notice> : null}
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
            {data.invitations && requestedInvitation && !data.invitations.some(item => item.id.toLowerCase() === requestedInvitation.toLowerCase()) ? (
              <Notice>Esta invitación no está pendiente para la cuenta actual. Puede haber vencido, haberse utilizado o corresponder a otro correo. Revisa tus invitaciones o cambia de cuenta desde tu perfil.</Notice>
            ) : null}
            {data.teach && data.study ? <ClassroomCollection accountRole={accountRole} teach={data.teach} study={data.study} search={search} onSearch={setSearch}
              onEnter={id => {
                if (onEnterClassroom) { void action(async () => { await onEnterClassroom(id); }); return; }
                setSharedCode(null); setClassroomId(id);
              }} /> : null}
            {((data.invitations?.length ?? 0) > 0 || (data.drafts?.length ?? 0) > 0) ? <section className="folder-panel tone-yellow folder-pending" aria-label="Pendientes">
              <h2 className="folder-tab"><EntryIcon name="bell" />Pendientes <span className="collection-pending-count">{(data.invitations?.length ?? 0) + (data.drafts?.length ?? 0)}</span></h2>
            {data.invitations?.length ? (
              <section className="p5-invitations">
                <h2>Tenés una invitación</h2>
                {[...data.invitations].sort((a, b) => Number(b.id.toLowerCase() === requestedInvitation?.toLowerCase()) - Number(a.id.toLowerCase() === requestedInvitation?.toLowerCase())).map((invitation) => (
                  <article key={invitation.id} aria-label={invitation.id.toLowerCase() === requestedInvitation?.toLowerCase() ? 'Invitación seleccionada del correo' : undefined}>
                    <div>
                      {invitation.id.toLowerCase() === requestedInvitation?.toLowerCase() ? <strong>Invitación seleccionada del correo</strong> : null}
                      <h3>{invitation.name}</h3>
                      <p>{invitation.teacher} te invita a su aula.</p>
                      <small>
                        Vence el{' '}
                        {new Date(invitation.expiresAt).toLocaleDateString(
                          'es-AR',
                        )}
                      </small>
                    </div>
                    {accountRole === 'student' ? <button
                      className="primary"
                      disabled={busy}
                      onClick={() => void action(() => accept(invitation))}
                    >
                      Aceptar invitación
                    </button> : <p>Las invitaciones para estudiar requieren una cuenta de estudiante.</p>}
                  </article>
                ))}
              </section>
            ) : null}
            {data.drafts?.length ? (
              <section className="p5-drafts">
                <h3>Continuar un borrador</h3>
                {data.drafts.map((item) => (
                  <button
                    key={item.id}
                    onClick={() =>
                      void action(async () =>
                        setDraft(await api.call<Draft>(`/drafts/${item.id}`)),
                      )
                    }
                  >
                    <strong>{item.payload.name || 'Aula sin nombre'}</strong>
                    <span>Continuar creación</span>
                  </button>
                ))}
              </section>
            ) : null}
            </section> : null}
          </>
        )}
      </main>
      {join ? (
        <Dialog
          title={preview ? 'Confirmá tu inscripción' : 'Unirse a un aula'}
          onClose={() => {
            if (!busy) setJoin(false);
          }}
        >
          {joinError ? <Notice error>{joinError}</Notice> : null}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void enterCode();
            }}
          >
            {preview ? (
              <>
                <h3>{preview.classroom.name}</h3>
                <p>
                  {preview.classroom.subject} · {preview.classroom.division} ·{' '}
                  {preview.classroom.academicYear}
                </p>
                <p>Docente: {preview.classroom.teacher}</p>
                <p>Al confirmar, vas a incorporarte como estudiante.</p>
              </>
            ) : (
              <label>
                Código del aula
                <input
                  required
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoComplete="off"
                />
              </label>
            )}
            <footer className="p5-form-footer">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (preview) setPreview(null);
                  else setJoin(false);
                }}
              >
                Volver
              </button>
              <button className="primary" disabled={busy}>
                {busy
                  ? 'Consultando…'
                  : preview
                    ? 'Confirmar inscripción'
                    : 'Ver aula'}
              </button>
            </footer>
          </form>
        </Dialog>
      ) : null}
    </div>
  );
}
