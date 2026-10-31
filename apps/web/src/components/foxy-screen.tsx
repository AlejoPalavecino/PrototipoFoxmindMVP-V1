import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Notice } from '../../../classrooms-ui/components';
import { createAccountClient, type AccountSession } from '../lib/account-client';
import { classroomAuthHref } from '../lib/classroom-client';
import { AccountNavbar } from './account-navbar';
import { FoxyWorkspaceSession } from './foxy-workspace-session';

const account = createAccountClient();
export function FoxyScreen() {
  const router = useRouter(), [session, setSession] = useState<AccountSession>(), [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!router.isReady) return;
    let active = true;
    setSession(undefined); setError('');
    void (async () => {
      try {
        const current = await account.session();
        if (!active) return;
        if (!current.authenticated) { await router.replace(classroomAuthHref('sign-in', '/foxy-ai')); return; }
        if (!current.user.emailVerified) { await router.replace(classroomAuthHref('verify-email', '/foxy-ai')); return; }
        if (current.user.accountRole !== 'teacher') { setError('Foxy AI está disponible para docentes.'); return; }
        setSession(current);
      } catch { if (active) setError('No pudimos comprobar tu sesión. Intentá nuevamente.'); }
    })();
    return () => { active = false; };
  }, [router, router.isReady, retry]);
  return <div className="p5-app">
    <Head><title>Foxy AI · FoxMind</title><meta name="description" content="Tu espacio docente Foxy AI." /></Head>
    <a className="skip-link" href="#foxy-main">Saltar al contenido</a>
    {session?.authenticated ? <AccountNavbar session={session} view="foxy-ai" /> : null}
    <main id="foxy-main" className="p5-main">
      {error ? <><Notice error>{error}</Notice><button onClick={() => setRetry(value => value + 1)}>Volver a intentar</button> <Link href="/inicio">Ir a Inicio</Link></>
        : session?.authenticated ? <FoxyWorkspaceSession key={session.user.id} subjectId={session.user.id} onNavigate={href => router.push(href).then(() => {})} onIdentityRequired={code => { setSession(undefined);
          void router.replace(classroomAuthHref(code === 'EMAIL_VERIFICATION_REQUIRED' ? 'verify-email' : 'sign-in', '/foxy-ai')); }} />
          : <Notice>Comprobando tu sesión…</Notice>}
    </main>
  </div>;
}
