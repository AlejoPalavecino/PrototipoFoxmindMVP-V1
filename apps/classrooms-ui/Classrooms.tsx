'use client';
import { useState, useEffect, useCallback, lazy, Suspense, type ReactNode } from 'react';
import type { ClassroomClient, Classroom, Draft, Invitation, NotificationTarget } from './api.ts';
import { Cover, Dialog, Notice } from './components.tsx';
import { Notifications } from './Notifications.tsx';
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
  accountActions,
  requestedInvitation,
}: {
  api: ClassroomClient;
  displayName: string;
  accountActions?: ReactNode;
  requestedInvitation?: string;
}) {
  const [data, setData] = useState<HomeData | null>(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false),
    [search, setSearch] = useState(''),
    [draft, setDraft] = useState<Draft | null>(null),
    [classroomId, setClassroomId] = useState<string | null>(null);
  const [wallTarget, setWallTarget] = useState<NotificationTarget | null>(null), [notificationRefresh, setNotificationRefresh] = useState(0);
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
    const controller = new AbortController();
    void load(controller.signal).catch((e) => {
      if (!controller.signal.aborted) setError(e.message);
    });
    return () => controller.abort();
  }, [load]);
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
  const leaveView = () => {
    setDraft(null);
    setClassroomId(null);
    setWallTarget(null);
    void action(() => load());
  };
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
  return (
    <div className="p5-app">
      <nav className="p5-nav" aria-label="Navegación principal">
        <a
          className="p5-brand"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            if (!draft) leaveView();
          }}
        >
          <span>Fox</span>Mind
        </a>
        <button
          className="p5-nav-active"
          onClick={() => {
            if (!draft) leaveView();
          }}
        >
          Mis Aulas
        </button>
        {!draft ? <Notifications api={api} refresh={notificationRefresh} onOpen={target => {
          setWallTarget(target); setSharedCode(null); setClassroomId(target.classroomId);
        }} /> : null}
        <span className="p5-profile">{displayName}</span>
        {!draft ? accountActions : null}
      </nav>
      <main className="p5-main">
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
              onWallChanged={refreshNotifications}
            />
          </Suspense>
        ) : (
          <>
            <header className="p5-page-head">
              <div>
                <h1>Mis Aulas</h1>
                <p className="p5-lead">
                  Lo que enseñás. Todo lo que podés aprender.
                </p>
              </div>
              <div className="p5-actions">
                <button
                  disabled={busy}
                  onClick={() => {
                    setJoin(true);
                    setJoinError('');
                    setPreview(null);
                  }}
                >
                  Unirse con código
                </button>
                <button
                  className="primary"
                  disabled={busy}
                  onClick={() =>
                    void action(async () => {
                      setDraft(await api.call<Draft>('/drafts', 'POST', {}));
                    })
                  }
                >
                  ＋ Crear aula
                </button>
              </div>
            </header>
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
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() => void action(() => accept(invitation))}
                    >
                      Aceptar invitación
                    </button>
                  </article>
                ))}
              </section>
            ) : null}
            {data?.drafts.length ? (
              <section className="p5-drafts">
                <h2>Continuar un borrador</h2>
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
            {data ? (
              <>
                <label className="p5-search">
                  Buscar aula
                  <input
                    type="search"
                    placeholder="Nombre, materia o división"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                {(['teach', 'study'] as const).map((kind) => (
                  <section className="p5-classroom-group" key={kind}>
                    <h2>{kind === 'teach' ? 'Enseño' : 'Estudio'}</h2>
                    <div className="p5-grid">
                      {data[kind]
                        .filter((room) =>
                          `${room.name} ${room.subject} ${room.division}`
                            .toLocaleLowerCase()
                            .includes(search.toLocaleLowerCase()),
                        )
                        .map((room) => (
                          <article className="p5-card" key={room.id}>
                            <Cover kind={room.coverKey} />
                            <div>
                              <h3>{room.name}</h3>
                              {room.archived ? (
                                <span className="p5-tag">
                                  Archivada · Solo lectura
                                </span>
                              ) : null}
                              <p>{room.subject}</p>
                              <p>
                                {room.division} · Ciclo lectivo{' '}
                                {room.academicYear}
                              </p>
                              <button
                                onClick={() => {
                                  setSharedCode(null);
                                  setClassroomId(room.id);
                                }}
                              >
                                Entrar al aula
                              </button>
                            </div>
                          </article>
                        ))}
                    </div>
                    {data[kind].length === 0 ? (
                      <p className="p5-empty">
                        {kind === 'teach'
                          ? 'Tu próxima aula empieza con lo que sabés. Creá una para compartirlo.'
                          : 'Ingresá con un código o aceptá una invitación para empezar.'}
                      </p>
                    ) : null}
                  </section>
                ))}
              </>
            ) : null}
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
