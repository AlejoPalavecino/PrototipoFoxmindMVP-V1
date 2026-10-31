import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClassroomsApp } from '../../../classrooms-ui/Classrooms';
import { Notice } from '../../../classrooms-ui/components';
import { createAccountClient, type AccountUser } from '../lib/account-client';
import { classroomAuthHref, classroomDestination, createWebClassroomClient } from '../lib/classroom-client';
import { createWebAgendaClient } from '../lib/agenda-client';
import { createWebHomeClient } from '../lib/home-client';
import { useAgendaTarget } from '../../../classrooms-ui/useAgendaTarget';

const account = createAccountClient();

export function ClassroomsScreen({ initialPresentation = 'classrooms' }: { initialPresentation?: 'home' | 'classrooms' }) {
  const router = useRouter();
  const [user, setUser] = useState<AccountUser>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const destination = classroomDestination(router.asPath) ?? (initialPresentation === 'home' ? '/inicio' : '/mis-aulas');
  const requireAccount = useCallback((code: string) => {
    setUser(undefined);
    void router.replace(classroomAuthHref(code === 'EMAIL_VERIFICATION_REQUIRED' ? 'verify-email' : 'sign-in', destination));
  }, [router, destination]);
  const api = useMemo(() => createWebClassroomClient(fetch, requireAccount), [requireAccount]);
  const agendaApi = useMemo(() => createWebAgendaClient(fetch, requireAccount), [requireAccount]);
  const homeClient = useMemo(() => createWebHomeClient(fetch, requireAccount), [requireAccount]);
  const target = useAgendaTarget(agendaApi, destination, Boolean(user));
  const load = useCallback(async () => {
    setError('');
    try {
      const current = await account.session();
      if (!current.authenticated) { requireAccount('AUTH_REQUIRED'); return; }
      if (!current.user.emailVerified) { requireAccount('EMAIL_VERIFICATION_REQUIRED'); return; }
      if (current.user.accountRole !== 'teacher' && current.user.accountRole !== 'student') { setError('No pudimos comprobar el rol de tu cuenta. Vuelve a iniciar sesion o intenta de nuevo.'); return; }
      setUser(current.user);
    } catch (failure) { setError((failure as Error).message); }
  }, [requireAccount]);
  useEffect(() => { if (router.isReady) void load(); }, [load, router.isReady]);

  async function logout() {
    if (busy) return;
    setBusy(true); setError('');
    try { await account.mutate('/auth/logout'); requireAccount('AUTH_REQUIRED'); }
    catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  const invitation = destination.startsWith('/mis-aulas?invitacion=') ? destination.slice(destination.indexOf('=') + 1) : undefined;
  return <>
    <Head><title>{initialPresentation === 'home' ? 'Inicio' : 'Mis Aulas'} · FoxMind</title><meta name="description" content="Tus aulas, borradores e invitaciones de FoxMind." /></Head>
    {user ? <>
      {error ? <div className="p5-app p5-gate"><Notice error>{error}</Notice></div> : null}
      {target.requested && !target.target ? <div className="p5-main"><Notice error={Boolean(target.error)}>{target.error ?? 'Comprobando acceso a la actividad…'}
        {target.error ? <button onClick={target.reload}>Volver a intentar</button> : null}</Notice><Link href="/agenda">Volver a Agenda</Link></div> :
      <ClassroomsApp key={user.id} accountRole={user.accountRole} subjectId={user.id} homeClient={homeClient} api={api} displayName={`${user.firstName} ${user.lastName}`} requestedInvitation={invitation} requestedTarget={target.target}
        requestedNotification={typeof router.query.notificacion === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(router.query.notificacion) ? router.query.notificacion : undefined}
        initialPresentation={initialPresentation} onNavigate={presentation => { void router.push(presentation === 'home' ? '/inicio' : presentation === 'agenda' ? '/agenda' : '/mis-aulas'); }}
        accountActions={<div className="p5-actions p5-account-actions"><Link href="/profile">Mi perfil</Link><button disabled={busy} onClick={() => void logout()}>{busy ? 'Cerrando sesión…' : 'Cerrar sesión'}</button></div>} />}
    </> : <div className="p5-app"><main className="p5-main">
      {error ? <Notice error>{error} <button onClick={() => void load()}>Volver a intentar</button></Notice> : <Notice>Comprobando tu sesión…</Notice>}
      <Link href={classroomAuthHref('sign-in', destination)}>Iniciar sesión</Link>
    </main></div>}
  </>;
}
