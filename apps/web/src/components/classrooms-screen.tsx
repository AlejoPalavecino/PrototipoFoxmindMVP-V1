import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClassroomsApp } from '../../../classrooms-ui/Classrooms';
import { Notice } from '../../../classrooms-ui/components';
import { createAccountClient, type AccountUser } from '../lib/account-client';
import { classroomAuthHref, classroomDestination, createWebClassroomClient } from '../lib/classroom-client';

const account = createAccountClient();

export function ClassroomsScreen() {
  const router = useRouter();
  const [user, setUser] = useState<AccountUser>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const destination = classroomDestination(router.asPath) ?? '/mis-aulas';
  const requireAccount = useCallback((code: string) => {
    setUser(undefined);
    void router.replace(classroomAuthHref(code === 'EMAIL_VERIFICATION_REQUIRED' ? 'verify-email' : 'sign-in', destination));
  }, [router, destination]);
  const api = useMemo(() => createWebClassroomClient(fetch, requireAccount), [requireAccount]);
  const load = useCallback(async () => {
    setError('');
    try {
      const current = await account.session();
      if (!current.authenticated) { requireAccount('AUTH_REQUIRED'); return; }
      if (!current.user.emailVerified) { requireAccount('EMAIL_VERIFICATION_REQUIRED'); return; }
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
  const invitation = destination.includes('?') ? destination.slice(destination.indexOf('=') + 1) : undefined;
  return <>
    <Head><title>Mis Aulas · FoxMind</title><meta name="description" content="Tus aulas, borradores e invitaciones de FoxMind." /></Head>
    {user ? <>
      {error ? <div className="p5-app p5-gate"><Notice error>{error}</Notice></div> : null}
      <ClassroomsApp api={api} displayName={`${user.firstName} ${user.lastName}`} requestedInvitation={invitation}
        accountActions={<div className="p5-actions p5-account-actions"><Link href="/profile">Mi perfil</Link><button disabled={busy} onClick={() => void logout()}>{busy ? 'Cerrando sesión…' : 'Cerrar sesión'}</button></div>} />
    </> : <div className="p5-app"><main className="p5-main">
      {error ? <Notice error>{error} <button onClick={() => void load()}>Volver a intentar</button></Notice> : <Notice>Comprobando tu sesión…</Notice>}
      <Link href={classroomAuthHref('sign-in', destination)}>Iniciar sesión</Link>
    </main></div>}
  </>;
}
