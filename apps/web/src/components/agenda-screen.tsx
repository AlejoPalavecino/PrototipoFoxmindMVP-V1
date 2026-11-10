import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Agenda } from '../../../agenda-ui/index';
import { Notice } from '../../../shared-ui/feedback';
import { AccountNavbar } from './account-navbar';
import { createAccountClient, type AccountSession } from '../lib/account-client';
import { createWebAgendaClient } from '../lib/agenda-client';
import { authHref } from '../application/navigation/destinations';
import { parseAgendaEventTarget } from '../lib/agenda-target';
import surface from '../../../agenda-ui/agenda-surface.module.css';

const account = createAccountClient();
function useAgendaSession() {
  const router = useRouter();
  const [session, setSession] = useState<AccountSession>(), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const requireAccount = useCallback((code: string) => {
    setSession(undefined);
    void router.replace(authHref(code === 'EMAIL_VERIFICATION_REQUIRED' ? 'verify-email' : 'sign-in', '/agenda'));
  }, [router]);
  const load = useCallback(async () => {
    setError('');
    try {
      const current = await account.session();
      if (!current.authenticated) { requireAccount('AUTH_REQUIRED'); return; }
      if (!current.user.emailVerified) { requireAccount('EMAIL_VERIFICATION_REQUIRED'); return; }
      setSession(current);
    } catch (failure) { setError((failure as Error).message); }
  }, [requireAccount]);
  useEffect(() => { if (router.isReady) void load(); }, [load, router.isReady]);
  const logout = async () => {
    if (busy) return; setBusy(true); setError('');
    try { await account.mutate('/auth/logout'); requireAccount('AUTH_REQUIRED'); }
    catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  };
  return { session, error, busy, load, logout, requireAccount };
}
export function AgendaScreen() {
  const router = useRouter(), identity = useAgendaSession();
  const api = useMemo(() => createWebAgendaClient(fetch, identity.requireAccount), [identity.requireAccount]);
  const requestedEvent = parseAgendaEventTarget(router.query);
  return <div className={`p5-app agenda-app ${surface.screen}`}>
    <Head><title>Agenda · FoxMind</title><meta name="description" content="Tu calendario privado y los próximos plazos de tus aulas." /></Head>
    <a className="skip-link" href="#agenda-main">Saltar al contenido</a>
    {identity.session?.authenticated ? <>
      <AccountNavbar session={identity.session} view="agenda" accountActions={<div className="p5-actions p5-account-actions"><Link href="/profile">Mi perfil</Link>
        <button disabled={identity.busy} onClick={() => void identity.logout()}>{identity.busy ? 'Cerrando sesión…' : 'Cerrar sesión'}</button></div>} />
      {identity.error ? <Notice error>{identity.error}</Notice> : null}
      {router.isReady && Object.keys(router.query).length > 0 && !requestedEvent ? <Notice error>El enlace del evento no es válido. Puedes consultar tu agenda.</Notice> : null}
      <Agenda key={identity.session.user.id} api={api} requestedEvent={requestedEvent} onEventSelected={target=>{if(target)void router.push({pathname:'/agenda',query:{event:target.eventId,date:target.date}},undefined,{shallow:true});else if(router.query.event)void router.push('/agenda',undefined,{shallow:true});}} onOpen={target => { void router.push(`/mis-aulas?aula=${target.classroomId}${target.activityId ? `&actividad=${target.activityId}` : ''}`); }} />
    </> : <main id="agenda-main" className="p5-main">{identity.error ? <Notice error>{identity.error} <button onClick={() => void identity.load()}>Volver a intentar</button></Notice>
      : <Notice>Comprobando tu sesión…</Notice>}<Link href={authHref('sign-in', '/agenda')}>Iniciar sesión</Link></main>}
  </div>;
}
