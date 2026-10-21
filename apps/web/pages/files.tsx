import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { PrivateFilePanel } from '../src/components/private-file-panel';
import { parseFileContext } from '../src/lib/file-client';
import { useEffect, useState } from 'react';
import { AccountNavbar } from '../src/components/account-navbar';
import { createAccountClient, type AccountSession } from '../src/lib/account-client';
const account = createAccountClient();

export { accountPageProps as getServerSideProps } from '../src/lib/page-server';
export default function Files() {
  const router = useRouter();
  const context = parseFileContext(router.query);
  const [session, setSession] = useState<AccountSession>();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const hasContext = Boolean(context);
  useEffect(() => {
    if (hasContext) return;
    let active = true;
    void account.session().then(value => { if (active) setSession(value); }).catch(failure => { if (active) setError(failure.message); });
    return () => { active = false; };
  }, [hasContext]);
  async function logout() {
    if (busy) return;
    setBusy(true); setError('');
    try { await account.mutate('/auth/logout'); setSession({ authenticated: false }); await router.push('/sign-in'); }
    catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  return <>
    <Head><title>Archivos privados | FoxMind</title><meta name="referrer" content="no-referrer" /></Head>
    <a className="skip-link" href="#main">Saltar al contenido</a>
    <AccountNavbar session={session} accountActions={session?.authenticated ? <div className="fm-profile-actions"><Link href="/profile">Mi perfil</Link><button disabled={busy} onClick={() => void logout()}>Cerrar sesión</button></div> : undefined} />
    <main id="main" className="main profile-main">
      <div className="page-heading"><div><h1>Archivos privados</h1><p>Plan y materiales del contexto actual.</p></div></div>
      {error ? <p role="alert">{error}</p> : null}
      <section className="surface">{context ? <PrivateFilePanel key={`${context.kind}:${context.id}:${context.purpose}`} context={context} onSessionChange={setSession} /> : <p>Abre los archivos desde un borrador o aula existente con su contexto completo.</p>}</section>
      <footer className="page-footer">FoxMind · Enseñar y aprender, en un mismo lugar.</footer>
    </main>
  </>;
}
