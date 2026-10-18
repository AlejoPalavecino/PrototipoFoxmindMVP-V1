'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import type { ClassroomClient, Detail, Invitation, Member, WallTarget } from './api.ts';
import { Cover, Dialog, Notice, initials } from './components.tsx';
import { Plan } from './Plan.tsx';
import { Library } from './Library.tsx';
import { Wall } from './Wall.tsx';

interface Summary {
  firstName: string;
  lastName: string;
  attempts: {
    id: string;
    title: string;
    submittedAt: string;
    number: number;
    grade: string | null;
    published: boolean | null;
  }[];
}
export function ClassroomView({
  api,
  id,
  onExit,
  initialCode,
  wallTarget,
  onWallChanged,
}: {
  api: ClassroomClient;
  id: string;
  onExit: () => void;
  initialCode: string | null;
  wallTarget?: WallTarget | null;
  onWallChanged?: () => void;
}) {
  const [room, setRoom] = useState<Detail | null>(null),
    [members, setMembers] = useState<Member[]>([]),
    [history, setHistory] = useState<Member[]>([]),
    [invitations, setInvitations] = useState<Invitation[]>([]);
  const [tab, setTab] = useState(wallTarget ? 'wall' : 'members'),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false);
  const tabs = useRef<HTMLElement>(null);
  const [code, setCode] = useState(initialCode),
    [email, setEmail] = useState(''),
    [inviting, setInviting] = useState(false),
    [summary, setSummary] = useState<Summary | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    text: string;
    run: () => Promise<void>;
  } | null>(null);
  const [settings, setSettings] = useState({
    name: '',
    subject: '',
    division: '',
    academicYear: 2026,
  });
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const detail = await api.call<Detail>(
        `/${id}`,
        undefined,
        undefined,
        signal,
      );
      setRoom(detail);
      setSettings({
        name: detail.name,
        subject: detail.subject,
        division: detail.division,
        academicYear: detail.academicYear,
      });
      const [current, past, pending] = await Promise.all([
        api.call<Member[]>(`/${id}/members`, undefined, undefined, signal),
        detail.role === 'teacher'
          ? api.call<Member[]>(`/${id}/history`, undefined, undefined, signal)
          : Promise.resolve([]),
        detail.role === 'teacher'
          ? api.call<Invitation[]>(
              `/${id}/invitations`,
              undefined,
              undefined,
              signal,
            )
          : Promise.resolve([]),
      ]);
      setMembers(current);
      setHistory(past);
      setInvitations(pending);
      setError('');
    },
    [api, id],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal).catch((e) => {
      if (!controller.signal.aborted) setError(e.message);
    });
    return () => controller.abort();
  }, [load]);
  useEffect(() => { if (wallTarget) setTab('wall'); }, [wallTarget]);
  useEffect(() => {
    const nav = tabs.current;
    if (!nav) return;
    const reveal = () => {
      const active = nav.querySelector<HTMLElement>('[aria-current="page"]');
      if (!active) return;
      const bounds = nav.getBoundingClientRect(), selected = active.getBoundingClientRect();
      if (selected.left < bounds.left) nav.scrollLeft += Math.floor(selected.left - bounds.left);
      else if (selected.right > bounds.right) nav.scrollLeft += Math.ceil(selected.right - bounds.right);
    };
    reveal();
    const observer = new ResizeObserver(reveal);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [tab, room?.id, room?.role, wallTarget]);
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
  async function invite() {
    await api.call(`/${id}/invitations`, 'POST', { email });
    setEmail('');
    setInviting(false);
    setNotice(
      'Invitación guardada para enviar. La inscripción requiere que la persona la acepte.',
    );
    await load();
  }
  const teacher = room?.role === 'teacher';
  return (
    <>
      <button className="p5-link" onClick={onExit}>
        Mis Aulas / Volver a mis aulas
      </button>
      {error ? (
        <Notice error>
          {error}{' '}
          <button onClick={() => void action(() => load())}>
            Actualizar aula
          </button>
        </Notice>
      ) : null}
      {!room && !error ? <Notice>Cargando aula…</Notice> : null}
      {room ? (
        <>
          <header className="p5-room-head">
            <div className="p5-room-cover">
              <Cover kind={room.coverKey} />
            </div>
            <div>
              <p>
                {room.subject} · {room.division} · Ciclo lectivo{' '}
                {room.academicYear}
              </p>
              <h1>{room.name}</h1>
              <p>Docente: {room.teacher}</p>
              <small>{room.timezone}</small>
            </div>
          </header>
          {room.archived ? (
            <Notice>
              Esta aula está archivada. Podés consultar su contenido; los
              cambios están deshabilitados.
            </Notice>
          ) : null}
          {notice ? <Notice>{notice}</Notice> : null}
          <nav ref={tabs} className="p5-tabs" aria-label="Secciones del aula">
            {[
              { key: 'members', label: teacher ? 'Alumnos' : 'Compañeros' },
              ...(teacher ? [{ key: 'history', label: 'Historial' }] : []),
              { key: 'plan', label: 'Plan' },
              { key: 'library', label: 'Biblioteca' },
              { key: 'wall', label: 'Muro' },
              ...(teacher ? [{ key: 'settings', label: 'Configuración' }] : []),
            ].map((item) => (
              <button
                key={item.key}
                aria-current={tab === item.key ? 'page' : undefined}
                onClick={() => setTab(item.key)}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <section className="p5-surface">
            {tab === 'members' || tab === 'history' ? (
              <>
                <header className="p5-section-head">
                  <div>
                    <h2>
                      {tab === 'history'
                        ? 'Historial de estudiantes'
                        : teacher
                          ? 'Alumnos'
                          : 'Compañeros'}
                    </h2>
                    <p>
                      {tab === 'history'
                        ? 'Las personas que salieron conservan sus registros.'
                        : teacher
                          ? 'Acompañá a quienes forman parte del aula.'
                          : 'Las personas con las que compartís el aprendizaje.'}
                    </p>
                  </div>
                  {teacher && tab === 'members' ? (
                    <button
                      className="primary"
                      disabled={busy || room.archived}
                      onClick={() => setInviting(true)}
                    >
                      Invitar estudiantes
                    </button>
                  ) : null}
                </header>
                {(tab === 'history' ? history : members).length === 0 ? (
                  <p className="p5-empty">
                    {tab === 'history'
                      ? 'Todavía no hay salidas registradas.'
                      : 'Todavía no hay estudiantes en el aula.'}
                  </p>
                ) : null}
                <ul className="p5-roster">
                  {(tab === 'history' ? history : members).map(
                    (member, index) => (
                      <li key={member.enrollmentId ?? index}>
                        <span className="p5-avatar" aria-hidden="true">
                          {initials(member.firstName, member.lastName)}
                        </span>
                        <div>
                          <strong>
                            {member.firstName} {member.lastName}
                          </strong>
                          {teacher
                            ? member.periods?.map((period, i) => (
                                <small key={i}>
                                  {new Date(period.joinedAt).toLocaleDateString(
                                    'es-AR',
                                  )}{' '}
                                  —{' '}
                                  {period.endedAt
                                    ? `${new Date(period.endedAt).toLocaleDateString('es-AR')} · ${period.endReason === 'LEFT' ? 'Salida voluntaria' : 'Removido por docente'}`
                                    : 'Actualmente inscripto'}
                                </small>
                              ))
                            : null}
                        </div>
                        {teacher ? (
                          <div className="p5-actions">
                            <button
                              disabled={busy}
                              onClick={() =>
                                void action(async () =>
                                  setSummary(
                                    await api.call<Summary>(
                                      `/${id}/members/${member.studentId}`,
                                    ),
                                  ),
                                )
                              }
                            >
                              Ver resumen
                            </button>
                            {tab === 'members' ? (
                              <button
                                disabled={busy || room.archived}
                                onClick={() =>
                                  setConfirm({
                                    title: 'Remover estudiante',
                                    text: `${member.firstName} perderá acceso al aula. Sus entregas, calificaciones y conversaciones se conservan.`,
                                    run: async () => {
                                      await api.call(
                                        `/${id}/members/${member.studentId}/remove`,
                                        'POST',
                                        {},
                                      );
                                      await load();
                                    },
                                  })
                                }
                              >
                                Remover
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    ),
                  )}
                </ul>
                {teacher && tab === 'members' ? (
                  <>
                    <hr />
                    <h3>Código del aula</h3>
                    <p>
                      Solo sirve para el primer ingreso. Para reingresar, hace
                      falta una invitación nueva.
                    </p>
                    {code ? (
                      <div className="p5-code">
                        <code>{code}</code>
                        <button
                          onClick={() =>
                            void action(async () => {
                              await navigator.clipboard.writeText(code);
                              setNotice('Código copiado.');
                            })
                          }
                        >
                          Copiar código
                        </button>
                      </div>
                    ) : (
                      <p>Generá un código nuevo para compartirlo.</p>
                    )}
                    <button
                      disabled={busy || room.archived}
                      onClick={() =>
                        setConfirm({
                          title: 'Generar un código nuevo',
                          text: 'El código anterior dejará de funcionar. Las inscripciones actuales se conservan.',
                          run: async () => {
                            const result = await api.call<{ code: string }>(
                              `/${id}/code`,
                              'POST',
                              {},
                            );
                            setCode(result.code);
                          },
                        })
                      }
                    >
                      Generar código nuevo
                    </button>
                    <h3>Invitaciones</h3>
                    {invitations.length === 0 ? (
                      <p>No hay invitaciones enviadas.</p>
                    ) : (
                      <ul className="p5-invite-list">
                        {invitations.map((invitation) => (
                          <li key={invitation.id}>
                            <span>
                              {invitation.recipient}
                              <small>
                                {invitation.acceptedAt
                                  ? 'Aceptada'
                                  : invitation.revokedAt
                                    ? 'Revocada'
                                    : new Date(invitation.expiresAt).getTime() <
                                        Date.now()
                                      ? 'Vencida'
                                      : 'Pendiente'}
                              </small>
                              <small>
                                {invitation.deliveryError ===
                                'P5_INVITATION_STALE'
                                  ? 'Correo no enviado: la invitación ya no está activa.'
                                  : invitation.deliveryError
                                    ? 'No se pudo enviar el correo. Podés reenviar la invitación.'
                                    : invitation.deliveryStatus === 'COMPLETED'
                                      ? 'Correo aceptado para envío.'
                                      : 'Correo en cola de envío.'}
                              </small>
                            </span>
                            {!invitation.acceptedAt && !invitation.revokedAt ? (
                              <div className="p5-actions">
                                <button
                                  disabled={busy || room.archived}
                                  onClick={() =>
                                    void action(async () => {
                                      await api.call(
                                        `/${id}/invitations`,
                                        'POST',
                                        { email: invitation.recipient },
                                      );
                                      setNotice('Invitación renovada.');
                                      await load();
                                    })
                                  }
                                >
                                  Reenviar
                                </button>
                                <button
                                  disabled={busy || room.archived}
                                  onClick={() =>
                                    setConfirm({
                                      title: 'Revocar invitación',
                                      text: 'Esta invitación dejará de permitir el ingreso al aula.',
                                      run: async () => {
                                        await api.call(
                                          `/${id}/invitations/${invitation.id}/revoke`,
                                          'POST',
                                          {},
                                        );
                                        await load();
                                      },
                                    })
                                  }
                                >
                                  Revocar
                                </button>
                              </div>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : null}
              </>
            ) : null}
            {tab === 'plan' ? <Plan api={api} room={room} reload={load} /> : null}
            {tab === 'library' ? <Library api={api} room={room} reload={load} /> : null}
            {tab === 'wall' ? <Wall api={api} room={room} reload={load} target={wallTarget} onChanged={onWallChanged} /> : null}
            {tab === 'settings' && teacher ? (
              <>
                <h2>Configuración del aula</h2>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void action(async () => {
                      await api.call(`/${id}/settings`, 'PATCH', {
                        ...settings,
                        revision: room.revision,
                      });
                      setNotice('Cambios guardados.');
                      await load();
                    });
                  }}
                >
                  <fieldset disabled={busy || room.archived}>
                    <div className="p5-fields">
                      {(['name', 'subject', 'division'] as const).map((key) => (
                        <label key={key}>
                          {key === 'name'
                            ? 'Nombre del aula'
                            : key === 'subject'
                              ? 'Materia'
                              : 'División'}
                          <input
                            required
                            maxLength={key === 'division' ? 60 : 120}
                            value={settings[key]}
                            onChange={(e) =>
                              setSettings((previous) => ({
                                ...previous,
                                [key]: e.target.value,
                              }))
                            }
                          />
                        </label>
                      ))}
                      <label>
                        Ciclo lectivo
                        <input
                          required
                          type="number"
                          min="1"
                          max="9999"
                          value={settings.academicYear}
                          onChange={(e) =>
                            setSettings((previous) => ({
                              ...previous,
                              academicYear: Number(e.target.value),
                            }))
                          }
                        />
                      </label>
                    </div>
                    <p>Zona horaria fija: {room.timezone}</p>
                    <button className="primary">Guardar cambios</button>
                  </fieldset>
                </form>
                <hr />
                <h3>{room.archived ? 'Reactivar aula' : 'Archivar aula'}</h3>
                <p>
                  {room.archived
                    ? 'Se habilitarán las acciones habituales. Los plazos existentes se conservan.'
                    : 'Se conserva todo el contenido y el aula pasa a ser de solo lectura.'}
                </p>
                <button
                  disabled={busy}
                  onClick={() =>
                    setConfirm({
                      title: room.archived ? 'Reactivar aula' : 'Archivar aula',
                      text: room.archived
                        ? 'La reactivación no modifica fechas límite ni historial.'
                        : 'Mientras esté archivada, no se podrán realizar cambios ni nuevas inscripciones.',
                      run: async () => {
                        await api.call(`/${id}/archive`, 'POST', {
                          archived: !room.archived,
                          revision: room.revision,
                        });
                        await load();
                      },
                    })
                  }
                >
                  {room.archived ? 'Reactivar aula' : 'Archivar aula'}
                </button>
              </>
            ) : null}
            {!teacher ? (
              <footer className="p5-student-footer">
                <button
                  disabled={busy || room.archived}
                  onClick={() =>
                    setConfirm({
                      title: 'Salir del aula',
                      text: 'Perderás acceso al aula. Tu historial se conserva y para volver necesitarás una invitación nueva del docente.',
                      run: async () => {
                        await api.call(`/${id}/leave`, 'POST', {});
                        onExit();
                      },
                    })
                  }
                >
                  Salir del aula
                </button>
              </footer>
            ) : null}
          </section>
        </>
      ) : null}
      {inviting ? (
        <Dialog
          title="Invitar estudiantes"
          onClose={() => {
            if (!busy) setInviting(false);
          }}
        >
          <p>
            Enviaremos una invitación que deberán aceptar con ese mismo correo.
          </p>
          {error ? <Notice error>{error}</Notice> : null}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void action(invite);
            }}
          >
            <label>
              Correo electrónico
              <input
                required
                type="text"
                inputMode="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <footer className="p5-form-footer">
              <button
                type="button"
                disabled={busy}
                onClick={() => setInviting(false)}
              >
                Cancelar
              </button>
              <button className="primary" disabled={busy}>
                {busy ? 'Guardando…' : 'Enviar invitación'}
              </button>
            </footer>
          </form>
        </Dialog>
      ) : null}
      {confirm ? (
        <Dialog
          title={confirm.title}
          onClose={() => {
            if (!busy) setConfirm(null);
          }}
        >
          <p>{confirm.text}</p>
          {error ? <Notice error>{error}</Notice> : null}
          <footer className="p5-form-footer">
            <button disabled={busy} onClick={() => setConfirm(null)}>
              Cancelar
            </button>
            <button
              className="primary"
              disabled={busy}
              onClick={() =>
                void action(async () => {
                  await confirm.run();
                  setConfirm(null);
                })
              }
            >
              {busy ? 'Procesando…' : 'Confirmar'}
            </button>
          </footer>
        </Dialog>
      ) : null}
      {summary ? (
        <Dialog
          title={`${summary.firstName} ${summary.lastName}`}
          onClose={() => setSummary(null)}
        >
          <h3>Entregas y calificaciones</h3>
          {summary.attempts.length ? (
            <ul>
              {summary.attempts.map((attempt) => (
                <li key={attempt.id}>
                  <strong>{attempt.title}</strong>
                  <p>
                    Intento {attempt.number} ·{' '}
                    {new Date(attempt.submittedAt).toLocaleDateString('es-AR')}
                  </p>
                  <p>
                    {attempt.grade === null
                      ? 'Sin calificación'
                      : `${Number(attempt.grade).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · ${attempt.published ? 'Publicada' : 'Sin publicar'}`}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p>Todavía no hay entregas registradas.</p>
          )}
        </Dialog>
      ) : null}
    </>
  );
}
