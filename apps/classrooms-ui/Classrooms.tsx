'use client';
import { useState, useEffect, useCallback, lazy, Suspense, type ReactNode } from 'react';
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
  initialPresentation = 'classrooms',
  onNavigate,
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
  onNavigate?: (presentation: 'home' | 'classrooms' | 'agenda') => void;
  requestedTarget?: { classroomId: string; activityId: string | null };
}) {
  const [presentation, setPresentation] = useState(initialPresentation);
  const [data, setData] = useState<HomeData | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false),
    [search, setSearch] = useState(''),
    [draft, setDraft] = useState<Draft | null>(null),
    [classroomId, setClassroomId] = useState<string | null>(null);
  const [wallTarget, setWallTarget] = useState<NotificationTarget | null>(null), [notificationRefresh, setNotificationRefresh] = useState(0);
  const [homeTarget, setHomeTarget] = useState<HomeTarget | null>(null);
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
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const [mine, drafts, invitations] = await Promise.all([
        api.call<{ teach: Classroom[]; study: Classroom[] }>(
          '',
          undefined,
          undefined,
          signal,
        ),
        api.call<Draft[]>('/drafts', undefined, undefined, signal),
        api.call<Invitation[]>('/invitations', undefined, undefined, signal),
      ]);
      setData({ ...mine, drafts, invitations });
      setError('');
    },
    [api],
  );
  useEffect(() => {
    if (initialPresentation === 'home') return;
    const controller = new AbortController();
    void load(controller.signal).catch((e) => {
      if (!controller.signal.aborted) setError(e.message);
    });
    return () => controller.abort();
  }, [load, initialPresentation]);
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
  const showPresentation = (next: 'home' | 'classrooms') => {
    setDraft(null);
    setClassroomId(null);
    setSharedCode(null);
    setWallTarget(null);
    setHomeTarget(null);
    setError('');
    setPresentation(next);
    if ((next !== initialPresentation || requestedTarget) && onNavigate) { onNavigate(next); return; }
    if (next === 'classrooms') void action(() => load());
  };
  const leaveView = () => showPresentation('classrooms');
  const openTarget = (target: NotificationTarget) => {
    setHomeTarget(null); setWallTarget(target); setSharedCode(null); setClassroomId(target.classroomId);
  };
  const openHomeTarget = (target: HomeTarget) => {
    if (target.kind === 'private-event') { window.location.assign(`/agenda?event=${encodeURIComponent(target.eventId)}&date=${encodeURIComponent(target.date)}`); return; }
    setDraft(null); setSharedCode(null); setWallTarget(null); setHomeTarget(target); setClassroomId(target.classroomId);
  };
  useEffect(() => {
    if (!requestedTarget) return;
    setDraft(null); setSharedCode(null); setHomeTarget(null); setClassroomId(requestedTarget.classroomId);
    setWallTarget(requestedTarget.activityId ? { kind: 'activity', ...requestedTarget, activityId: requestedTarget.activityId, attemptId: null } : null);
  }, [requestedTarget]);
  useEffect(() => {
    if (!requestedNotification) return;
    let active = true;
    void api.call<NotificationTarget>(`/notifications/${requestedNotification}/open`, 'POST', {})
      .then(target => { if (active) { openTarget(target); refreshNotifications(); } })
      .catch(failure => { if (active) setError(failure.message); });
    return () => { active = false; };
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
        setClassroomId(result.id);
        setPreview(null);
        setCode('');
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
    <div className={`p5-app fm3-classrooms${draft ? ' entry-wizard-reference' : !classroomId ? presentation === 'home' ? ' entry-home' : ' entry-classrooms-reference' : ' classroom-interior-reference'}`}>
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
        notifications={!draft ? <Notifications api={api} refresh={notificationRefresh} onOpen={openTarget} /> : undefined}
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
            {notice ? <Notice>{notice}</Notice> : null}
            {error ? (
              <Notice error>
                {error}{' '}
                <button onClick={() => void action(() => load())}>
                  Volver a intentar
                </button>
              </Notice>
            ) : null}
            {!data && !error ? <Notice>Cargando tus aulas…</Notice> : null}
            {data && requestedInvitation && !data.invitations.some(item => item.id.toLowerCase() === requestedInvitation.toLowerCase()) ? (
              <Notice>Esta invitación no está pendiente para la cuenta actual. Puede haber vencido, haberse utilizado o corresponder a otro correo. Revisa tus invitaciones o cambia de cuenta desde tu perfil.</Notice>
            ) : null}
            {data ? <ClassroomCollection accountRole={accountRole} teach={data.teach} study={data.study} search={search} onSearch={setSearch}
              onEnter={id => { setSharedCode(null); setClassroomId(id); }} /> : null}
            {data && (data.invitations.length > 0 || data.drafts.length > 0) ? <section className="folder-panel tone-yellow folder-pending" aria-label="Pendientes">
              <h2 className="folder-tab"><EntryIcon name="bell" />Pendientes <span className="collection-pending-count">{data.invitations.length + data.drafts.length}</span></h2>
            {data?.invitations.length ? (
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
            {data?.drafts.length ? (
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
