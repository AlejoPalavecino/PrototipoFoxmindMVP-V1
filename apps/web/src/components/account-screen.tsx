import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { AccountError, createAccountClient, validateAccountFields, type AccountSession, type AccountUser } from '../lib/account-client';
import { classroomAuthHref, classroomDestination } from '../lib/classroom-client';
import { Button } from './ui/button';
import { AccountNavbar } from './account-navbar';
import { AccountFolderIcon, AccountStory } from '../../../shared-ui/AccountStory';
import { FoxmindIllustration } from '../../../shared-ui/index';
declare global { interface Window { __foxmindTakeToken?: () => string | null } }
import { accountContent as content, type AccountView } from './account-view';
export type { AccountView } from './account-view';
const client = createAccountClient();

export { AccountField } from './account-field';
import { AccountFlowForms } from './account-flow-forms';
import { AccountProfile } from './account-profile';
import { AccountSettings } from './account-settings';
import { AccountArtwork } from './account-artwork';

export function AccountScreen({ view }: { view: AccountView }) {
  const router = useRouter();
  const [session, setSession] = useState<AccountSession>();
  const [profile, setProfile] = useState<AccountUser>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ error: boolean; text: string }>();
  const [deadline, setDeadline] = useState(0);
  const [now, setNow] = useState(0);
  const [hasToken, setHasToken] = useState(false);
  const token = useRef<string | null>(null);
  const tokenView = useRef<AccountView | null>(null);
  const status = useRef<HTMLDivElement>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const waitSeconds = Math.max(0, Math.ceil((deadline - now) / 1000));
  const locked = busy || waitSeconds > 0 || loading;
  const user = session?.authenticated ? session.user : undefined;
  const verified = Boolean(user?.emailVerified);
  const [classroomNext, setClassroomNext] = useState<string | null>(null);
  useEffect(() => {
    if (!router.isReady) return;
    const requested = classroomDestination(router.query.next);
    // The remembered value is only a bounded local classroom path, never proof
    // or identity. It survives reopening a verification email in this tab.
    try {
      if (requested) {
        sessionStorage.setItem('foxmind-classroom-next', JSON.stringify({ path: requested, expires: Date.now() + 30 * 60_000 }));
        setClassroomNext(requested);
      } else if (view === 'verify-email') {
        const saved = JSON.parse(sessionStorage.getItem('foxmind-classroom-next') ?? 'null');
        setClassroomNext(saved && saved.expires > Date.now() ? classroomDestination(saved.path) : null);
      } else setClassroomNext(null);
    } catch { setClassroomNext(requested); }
  }, [router.isReady, router.query.next, view]);
  const nextAccountHref = (target: 'sign-in' | 'verify-email' | 'register') => classroomAuthHref(target, classroomNext ?? (view === 'settings' ? '/settings' : null));
  const report = useCallback((error: unknown) => {
    const safe = error instanceof AccountError ? error : new AccountError('SERVICE_UNAVAILABLE', 503);
    setMessage({ error: true, text: safe.message });
    if (safe.code === 'AUTH_REQUIRED') { setSession({ authenticated: false }); setProfile(undefined); }
    if (safe.code === 'EMAIL_VERIFICATION_REQUIRED') {
      setProfile(undefined);
      setSession(current => current?.authenticated ? { authenticated: true, user: { ...current.user, emailVerified: false } } : current);
    }
    if (safe.retryAfter) { const current = Date.now(); setNow(current); setDeadline(current + safe.retryAfter * 1000); }
  }, []);
  const load = useCallback(async () => {
    setLoading(true);
    setMessage(undefined);
    try {
      const current = await client.session();
      setSession(current);
      if (view === 'profile' && current.authenticated && current.user.emailVerified) {
        const data = await client.read<AccountUser>('/account');
        setProfile(data); setFirstName(data.firstName); setLastName(data.lastName);
      } else setProfile(undefined);
    } catch (error) { report(error); }
    finally { setLoading(false); }
  }, [view, report]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    // Cooldowns and notices belong to the current form, not a subsequent route.
    setDeadline(0); setNow(Date.now()); setMessage(undefined);
    if (view !== 'verify-email' && view !== 'recover-password') {
      token.current = null; tokenView.current = null; setHasToken(false);
    } else if (tokenView.current !== view) {
      // A proof opened for verification must never be offered as a recovery proof.
      token.current = window.__foxmindTakeToken?.() ?? null;
      tokenView.current = view;
      setHasToken(Boolean(token.current));
    }
  }, [view]);
  useEffect(() => {
    const receiveProof = () => {
      if ((view !== 'verify-email' && view !== 'recover-password') || window.location.pathname !== `/${view}`) return;
      token.current = window.__foxmindTakeToken?.() ?? null;
      tokenView.current = view;
      setHasToken(Boolean(token.current)); setMessage(undefined);
    };
    window.addEventListener('foxmind:account-proof', receiveProof);
    return () => window.removeEventListener('foxmind:account-proof', receiveProof);
  }, [view]);
  useEffect(() => { if (message) status.current?.focus(); }, [message]);
  useEffect(() => {
    if (!deadline) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  async function action(path: string, fields: Record<string, string>, success: string, method = 'POST') {
    if (busy || loading || (waitSeconds > 0 && path !== '/auth/logout')) return;
    const invalid = validateAccountFields(fields);
    if (invalid) { setMessage({ error: true, text: invalid }); return; }
    setBusy(true); setMessage(undefined);
    try {
      const response = await client.mutate<AccountUser>(path, fields, method);
      if (response.session) setSession(response.session);
      setMessage({ error: false, text: success });
      if (path === '/auth/login') {
        const next = response.session ?? await client.session();
        setSession(next);
        if (next.authenticated) {
          if (next.user.emailVerified && classroomNext) { try { sessionStorage.removeItem('foxmind-classroom-next'); } catch {} }
          await router.push(next.user.emailVerified ? classroomNext ?? '/inicio' : nextAccountHref('verify-email'));
        }
      } else if (path === '/auth/logout') {
        setSession({ authenticated: false }); setProfile(undefined);
        await router.push('/sign-in');
      } else if (path === '/account') {
        setProfile(response.result);
        setFirstName(response.result.firstName); setLastName(response.result.lastName);
      } else if (path.endsWith('/confirm')) {
        token.current = null; setHasToken(false);
        if (path.includes('password-recovery')) setSession({ authenticated: false });
      }
      if (path === '/auth/register' || path === '/auth/password-recovery/request' || path.endsWith('/resend')) {
        const current = Date.now(); setNow(current); setDeadline(current + 60_000);
      }
    } catch (error) { report(error); }
    finally { setBusy(false); }
  }
  function submit(path: string, success: string, method = 'POST') {
    return (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = Object.fromEntries([...new FormData(form)].filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
      if (path.endsWith('/confirm')) {
        if (!token.current) { setMessage({ error: true, text: 'Abre el enlace original del correo para continuar.' }); return; }
        data.token = token.current;
      }
      void action(path, data, success, method).then(() => {
        // Remove password values from the visible form after each request.
        form.querySelectorAll<HTMLInputElement>('input[data-password-field]').forEach(input => { input.value = ''; });
      });
    };
  }
  const signOut = <Button variant="outline" disabled={busy || loading} onClick={() => void action('/auth/logout', {}, 'Cerraste tu sesión.')}>Cerrar sesión</Button>;
  const polished = view === 'sign-in' || view === 'register';
  return <>
    <Head><title>{`${content[view].title} · FoxMind`}</title><meta name="description" content="Accede a tu cuenta FoxMind." /></Head>
    <a className="skip-link" href="#main">Saltar al contenido</a>
    <div className={`entry-page${polished ? ` entry-auth-polish entry-auth-reference auth-${view}` : ''}${(view === 'profile' || view === 'settings') ? ' entry-profile' : ''}`}>
    <AccountNavbar minimal={polished} session={session} view={view} signInHref={nextAccountHref('sign-in')} registerHref={nextAccountHref('register')} verifyHref={nextAccountHref('verify-email')}
      accountActions={user ? <div className="fm-profile-actions"><Link href={verified ? '/profile' : nextAccountHref('verify-email')}>{verified ? 'Mi perfil' : 'Verificar correo'}</Link>{signOut}</div> : undefined} />
    <main id="main" className={(view === 'profile' || view === 'settings') ? 'main profile-main' : `main auth-main${view === 'verify-email' ? ' auth-verification' : ''}`}>
      {view !== 'settings' && view !== 'profile' && view !== 'verify-email' ? <AccountStory polished={polished} register={view === 'register'} security={view === 'forgot-password' || view === 'recover-password'} /> : null}
      <section className={(view === 'profile' || view === 'settings') ? 'surface profile-account' : 'surface folder-panel tone-yellow'} aria-label={content[view].title} aria-busy={loading || busy}>
        {!polished && view !== 'profile' && view !== 'settings' ? <span className="folder-tab" aria-hidden="true"><AccountFolderIcon kind="mail" />{content[view].title}</span> : null}
        {(view === 'profile' || view === 'settings') ? <nav className="breadcrumbs" aria-label="Ubicación"><Link href="/inicio">Inicio</Link><span aria-hidden="true"> / </span><span aria-current="page">{content[view].title}</span></nav> : null}
        {view === 'verify-email' ? <FoxmindIllustration className="verification-foxy" name="scenes/auth" sizes="140px" /> : null}
        <div className="page-heading"><div><h1>{content[view].title}</h1><p>{content[view].description}</p></div></div>
        {loading ? <p role="status" className="loading">Cargando tu cuenta…</p> : null}
        {message ? <div ref={status} tabIndex={-1} className={`notice ${message.error ? 'notice-error' : 'notice-success'}`} role={message.error ? 'alert' : 'status'}>{message.text}</div> : null}
        {waitSeconds > 0 ? <p className="cooldown" role="status">Podrás volver a intentar en {waitSeconds} segundos.</p> : null}
        {!loading && !session ? <div className="state"><p>No se pudo comprobar tu sesión.</p><Button disabled={busy || waitSeconds > 0} onClick={() => void load()}>Volver a intentar</Button></div> : null}
        <AccountFlowForms view={view} session={session} user={user} verified={verified} classroomNext={classroomNext} nextAccountHref={nextAccountHref}
          locked={locked} busy={busy} hasToken={hasToken} submit={submit} message={message} signOut={signOut} load={load} action={action} />
        {session && view === 'profile' ? <>
          {!user ? <div className="state"><h2>Inicia sesión para ver tu perfil</h2><Link className="button button-primary" href="/sign-in">Iniciar sesión</Link></div> : null}
          {user && !verified ? <div className="state"><h2>Primero verifica tu correo</h2><p>La edición del perfil estará disponible después de verificar tu dirección.</p><Link className="button button-primary" href="/verify-email">Verificar correo</Link></div> : null}
          {verified && !profile && !loading ? <div className="state"><p>No pudimos cargar tus datos.</p><Button disabled={locked} onClick={() => void load()}>Volver a intentar</Button></div> : null}
          {verified && profile && !loading ? <AccountProfile profile={profile} firstName={firstName} lastName={lastName} locked={locked} busy={busy}
            onFirstName={setFirstName} onLastName={setLastName} onCancel={() => { setFirstName(profile.firstName); setLastName(profile.lastName); setMessage(undefined); }} submit={submit} /> : null}
        </> : null}
        {session && !loading && view === 'settings' ? !verified ? <div className="state"><h2>{user ? 'Primero verifica tu correo' : 'Inicia sesión para ver Configuración'}</h2>
          <Link className="button button-primary" href={user ? nextAccountHref('verify-email') : classroomAuthHref('sign-in', '/settings')}>{user ? 'Verificar correo' : 'Iniciar sesión'}</Link></div>
          : <AccountSettings user={user!} locked={locked} busy={busy} submit={submit} signOut={signOut} /> : null}
      </section>
      {(view === 'profile' || view === 'settings') && verified && !loading ? <AccountArtwork user={profile ?? user!} settings={view === 'settings'} /> : null}
      {!polished ? <footer className="page-footer">FoxMind · Enseñar y aprender, en un mismo lugar.</footer> : null}
    </main>
    </div>
  </>;
}
