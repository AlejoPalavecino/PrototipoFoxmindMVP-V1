import Head from 'next/head';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Notice } from '../../../shared-ui/feedback';
import { createAccountClient, type AccountSession } from '../features/identity/index.ts';
import { authHref } from '../application/navigation/destinations';
import { getDocumentEntryPath, isFoxyDocument } from '../application/foxy-document-boundary';
import { createFoxyNavigationBridge } from '../application/foxy-navigation-bridge';
import { AccountNavbar } from '../application/navigation/account-navbar.tsx';
import { FoxyWorkspaceSession } from './foxy-workspace-session';

const account = createAccountClient();
type Binding = { navigate: (href: string) => void; shouldBlock: () => boolean };
export function FoxyScreen() {
  const router = useRouter(), [session, setSession] = useState<AccountSession>(), [error, setError] = useState('');
  const [retry, setRetry] = useState(0), [boundary, setBoundary] = useState<'checking' | 'ready' | 'unavailable'>('checking');
  const root = useRef<HTMLDivElement>(null), bridge = useRef<ReturnType<typeof createFoxyNavigationBridge> | null>(null), binding = useRef<Binding | null>(null);
  const departed = useRef(false);
  const register = useCallback((value: Binding | null) => { binding.current = value; }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const entry = getDocumentEntryPath(window.document);
    const native = createFoxyNavigationBridge({ window, shouldBlock: () => binding.current?.shouldBlock() ?? false,
      hidePresentation: () => { departed.current = true; if (root.current) root.current.hidden = true; binding.current = null; setSession(undefined); },
      onError: () => { binding.current = null; setSession(undefined); setBoundary('unavailable'); setError('No pudimos abrir Foxy AI.'); } });
    bridge.current = native; native.install();
    if (!entry) setBoundary('unavailable');
    else if (!isFoxyDocument(window.document)) { setBoundary('checking'); native.replace('/foxy-ai'); }
    else setBoundary('ready');
    return () => { binding.current = null; bridge.current = null; native.dispose(); };
  }, []);
  useEffect(() => { if (boundary === 'unavailable' && root.current) root.current.hidden = false; }, [boundary]);
  useEffect(() => {
    if (!router.isReady || boundary !== 'ready' || departed.current) return;
    let active = true;
    setSession(undefined); setError('');
    void (async () => {
      try {
        const current = await account.session();
        if (!active || departed.current) return;
        if (!current.authenticated) { bridge.current?.replace(authHref('sign-in', '/foxy-ai')); return; }
        if (!current.user.emailVerified) { bridge.current?.replace(authHref('verify-email', '/foxy-ai')); return; }
        if (current.user.accountRole !== 'teacher') { setError('Foxy AI está disponible para docentes.'); return; }
        setSession(current);
      } catch { if (active && !departed.current) setError('No pudimos comprobar tu sesión. Intentá nuevamente.'); }
    })();
    return () => { active = false; };
  }, [router.isReady, retry, boundary]);
  return <div className="p5-app" ref={root}>
    <Head><title>Foxy AI · FoxMind</title><meta name="description" content="Tu espacio docente Foxy AI." /></Head>
    <a className="skip-link" href="#foxy-main">Saltar al contenido</a>
    {session?.authenticated && boundary === 'ready' ? <AccountNavbar session={session} view="foxy-ai" onNavigate={href => {
      if (href !== '/foxy-ai') binding.current?.navigate(href);
    }} /> : null}
    <main id="foxy-main" className="p5-main">
      {boundary === 'unavailable' ? <Notice error>{error || 'No pudimos abrir Foxy AI. Recargá la página para intentar nuevamente.'}</Notice>
        : boundary !== 'ready' ? <Notice>Abriendo Foxy AI…</Notice>
          : error ? <><Notice error>{error}</Notice><button onClick={() => setRetry(value => value + 1)}>Volver a intentar</button> <a href="/inicio">Ir a Inicio</a></>
            : session?.authenticated ? <FoxyWorkspaceSession key={session.user.id} subjectId={session.user.id} onRegister={register}
              onNavigate={href => bridge.current?.navigate(href)} onIdentityRequired={code => { binding.current = null; setSession(undefined);
                bridge.current?.replace(authHref(code === 'EMAIL_VERIFICATION_REQUIRED' ? 'verify-email' : 'sign-in', '/foxy-ai')); }} />
              : <Notice>Comprobando tu sesión…</Notice>}
    </main>
  </div>;
}
