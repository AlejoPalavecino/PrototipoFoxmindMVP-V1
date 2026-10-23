import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { AccountError, createAccountClient, validateAccountFields, type AccountSession, type AccountUser } from '../lib/account-client';
import { classroomAuthHref, classroomDestination } from '../lib/classroom-client';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { AccountNavbar } from './account-navbar';
import { VerificationGuidance } from '../../../shared-ui/VerificationGuidance';
import { AccountFolderIcon, AccountSteps, AccountStory } from '../../../shared-ui/AccountStory';

declare global { interface Window { __foxmindTakeToken?: () => string | null } }
export type AccountView = 'sign-in' | 'register' | 'verify-email' | 'forgot-password' | 'recover-password' | 'profile';
const client = createAccountClient();
const content: Record<AccountView, { title: string; description: string }> = {
  'sign-in': { title: 'Qué bueno verte de nuevo', description: 'Inicia sesión para continuar con tu cuenta.' },
  register: { title: 'Crea tu cuenta', description: 'Un espacio para enseñar y aprender. Comienza con tus datos.' },
  'verify-email': { title: 'Verifica tu correo', description: 'Confirma tu dirección para empezar a usar FoxMind.' },
  'forgot-password': { title: 'Recupera tu acceso', description: 'Te enviaremos las instrucciones para crear una nueva contraseña.' },
  'recover-password': { title: 'Crea una nueva contraseña', description: 'El enlace de recuperación es válido durante 15 minutos y se utiliza una sola vez.' },
  profile: { title: 'Mi perfil', description: 'Tus datos y la seguridad de tu cuenta.' },
};

export function AccountField({ name, label, password, value, autoComplete, onChange }: {
  name: string; label: string; password?: boolean; value?: string; autoComplete?: string; onChange?: (value: string) => void;
}) {
  const [shown, setShown] = useState(false);
  const passwordHelp = password && autoComplete === 'new-password';
  return <div className="field">
    <Label htmlFor={name}>{label}</Label>
    <div className={password ? 'password-control' : undefined}>
    <Input id={name} name={name} type={password && !shown ? 'password' : 'text'} required data-password-field={password || undefined}
      autoComplete={autoComplete} inputMode={name === 'email' ? 'email' : undefined}
      autoCapitalize={name === 'email' ? 'none' : undefined} spellCheck={name === 'email' ? false : undefined}
      value={value} onChange={onChange ? event => onChange(event.target.value) : undefined}
      aria-describedby={passwordHelp ? `${name}-help` : undefined} />
    {password ? <button type="button" aria-label={`${shown ? 'Ocultar' : 'Mostrar'} ${label.toLowerCase()}`} aria-controls={name}
      aria-pressed={shown} className="password-toggle" onClick={() => setShown(current => !current)}>{shown ? 'Ocultar' : 'Mostrar'}</button> : null}
    </div>
    {passwordHelp ? <p className="field-help" id={`${name}-help`}>Entre 16 y 128 caracteres. Puedes usar espacios y cualquier idioma.</p> : null}
  </div>;
}
const Field = AccountField;

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
  const nextAccountHref = (target: 'sign-in' | 'verify-email' | 'register') => classroomAuthHref(target, classroomNext);

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
          await router.push(next.user.emailVerified ? classroomNext ?? '/profile' : nextAccountHref('verify-email'));
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

  return <>
    <Head><title>{`${content[view].title} · FoxMind`}</title><meta name="description" content="Accede a tu cuenta FoxMind." /></Head>
    <a className="skip-link" href="#main">Saltar al contenido</a>
    <div className={`entry-page${view === 'profile' ? ' entry-profile' : ''}`}>
    <AccountNavbar session={session} view={view} signInHref={nextAccountHref('sign-in')} registerHref={nextAccountHref('register')} verifyHref={nextAccountHref('verify-email')}
      accountActions={user ? <div className="fm-profile-actions"><Link href={verified ? '/profile' : nextAccountHref('verify-email')}>{verified ? 'Mi perfil' : 'Verificar correo'}</Link>{signOut}</div> : undefined} />
    <main id="main" className={view === 'profile' ? 'main profile-main' : `main auth-main${view === 'verify-email' ? ' auth-verification' : ''}`}>
      {view !== 'profile' && view !== 'verify-email' ? <AccountStory register={view === 'register'} /> : null}
      <section className={view === 'profile' ? 'surface profile-account' : 'surface folder-panel tone-yellow'} aria-label={content[view].title} aria-busy={loading || busy}>
        {view !== 'profile' ? <span className="folder-tab" aria-hidden="true"><AccountFolderIcon kind={view === 'sign-in' ? 'home' : view === 'register' ? 'book' : 'mail'} />{view === 'sign-in' ? 'Iniciar sesión' : view === 'register' ? 'Crear cuenta' : content[view].title}</span> : null}
        {view === 'profile' ? <nav className="breadcrumbs" aria-label="Ubicación"><Link href="/inicio">Inicio</Link><span aria-hidden="true"> / </span><span aria-current="page">Mi perfil</span></nav> : null}
        {view === 'verify-email' ? <img className="verification-foxy" src="/folders/foxy-welcome.png" width="220" height="220" alt="" /> : null}
        <div className="page-heading"><div><h1>{view === 'profile' ? <>Mi <span>perfil</span></> : content[view].title}</h1><p>{content[view].description}</p></div></div>
        {loading ? <p role="status" className="loading">Cargando tu cuenta…</p> : null}
        {message ? <div ref={status} tabIndex={-1} className={`notice ${message.error ? 'notice-error' : 'notice-success'}`} role={message.error ? 'alert' : 'status'}>{message.text}</div> : null}
        {waitSeconds > 0 ? <p className="cooldown" role="status">Podrás volver a intentar en {waitSeconds} segundos.</p> : null}
        {!loading && !session ? <div className="state"><p>No se pudo comprobar tu sesión.</p><Button disabled={busy || waitSeconds > 0} onClick={() => void load()}>Volver a intentar</Button></div> : null}

        {session && view === 'sign-in' ? <>
          {user ? <div className="notice">Ya tienes una sesión abierta. <Link href={verified ? classroomNext ?? '/profile' : nextAccountHref('verify-email')}>Continuar con mi cuenta</Link></div> : null}
          <form noValidate onSubmit={submit('/auth/login', 'Sesión iniciada.')}><fieldset disabled={locked}>
            <Field name="email" label="Correo electrónico" autoComplete="username" />
            <Field name="password" label="Contraseña" password autoComplete="current-password" />
            <div className="form-link"><Link href="/forgot-password">Olvidé mi contraseña</Link></div>
            <Button type="submit" className="full-width">{busy ? 'Iniciando sesión…' : 'Iniciar sesión'}</Button>
          </fieldset></form>
          <p className="after-form">¿Aún no tienes una cuenta? <Link href={nextAccountHref('register')}>Crear cuenta</Link></p>
        </> : null}

        {session && view === 'register' ? <>
          <AccountSteps />
          <form noValidate onSubmit={submit('/auth/register', 'Si los datos son válidos para crear una cuenta, recibirás un correo de verificación. Revisa también la carpeta de correo no deseado. Si ya tienes cuenta, puedes iniciar sesión o recuperar el acceso.')}><fieldset disabled={locked}>
            <div className="field-grid"><Field name="firstName" label="Nombre" autoComplete="given-name" /><Field name="lastName" label="Apellido" autoComplete="family-name" /></div>
            <Field name="email" label="Correo electrónico" autoComplete="email" />
            <Field name="password" label="Contraseña" password autoComplete="new-password" />
            <Button type="submit" className="full-width">{busy ? 'Creando cuenta…' : 'Crear cuenta'}</Button>
          </fieldset></form>
          <p className="field-help registration-next">Después vas a verificar tu correo para acceder a las aulas.</p>
          <p className="after-form">¿Ya tienes cuenta? <Link href={nextAccountHref('sign-in')}>Iniciar sesión</Link></p>
        </> : null}

        {session && view === 'verify-email' ? <div className="verification-content">
          {hasToken ? <><h2>Confirma tu dirección</h2><p>Al continuar se utilizará el enlace que abriste desde tu correo. El enlace vence después de una hora.</p>
            <form noValidate onSubmit={submit('/auth/email-verification/confirm', 'Tu correo está verificado. Ya puedes continuar con tu cuenta.')}><Button disabled={locked} type="submit">{busy ? 'Verificando…' : 'Confirmar verificación'}</Button></form></> : null}
          {user && !verified ? <><h2>Revisa tu correo</h2><p>Enviamos el enlace a <strong className="email-value">{user.email}</strong>. Abre el mensaje y confirma la verificación.</p><p>Si recargas esta página después de abrir un enlace, vuelve a abrir el mensaje original para usarlo.</p>
            <div className="actions"><Button disabled={locked} onClick={() => void action('/auth/email-verification/resend', {}, 'Solicitud aceptada. Revisa tu correo; usa el enlace más reciente.')}>{busy ? 'Enviando…' : 'Reenviar correo'}</Button><Button variant="outline" disabled={locked} onClick={() => void load()}>Actualizar estado</Button>{signOut}</div></> : null}
          {verified ? <><h2>Tu correo está verificado</h2><Link className="button button-primary" href={classroomNext ?? '/profile'}>{classroomNext === '/inicio' ? 'Ir a Inicio' : classroomNext ? 'Ir a Mis Aulas' : 'Ir a mi perfil'}</Link><div className="actions">{signOut}</div></> : null}
          {!user ? <><VerificationGuidance confirmed={Boolean(message && !message.error && !hasToken)} /><div className="actions"><Link className="button button-primary" href={nextAccountHref('sign-in')}>Iniciar sesión</Link><Link href={nextAccountHref('register')}>Crear cuenta</Link></div></> : null}
        </div> : null}

        {session && view === 'forgot-password' ? <>
          <form noValidate onSubmit={submit('/auth/password-recovery/request', 'Si existe una cuenta con ese correo, recibirás un enlace para recuperar el acceso. Revisa también la carpeta de correo no deseado.')}><fieldset disabled={locked}>
            <Field name="email" label="Correo electrónico" autoComplete="email" />
            <Button type="submit" className="full-width">{busy ? 'Solicitando enlace…' : 'Enviar enlace de recuperación'}</Button>
          </fieldset></form><p className="after-form"><Link href="/sign-in">Volver a iniciar sesión</Link></p>
        </> : null}

        {session && view === 'recover-password' ? <>
          {hasToken ? <form noValidate onSubmit={submit('/auth/password-recovery/confirm', 'Contraseña actualizada. Las sesiones anteriores se cerraron. Inicia sesión con tu nueva contraseña.')}><fieldset disabled={locked}>
            <Field name="newPassword" label="Nueva contraseña" password autoComplete="new-password" />
            <Button type="submit" className="full-width">{busy ? 'Actualizando contraseña…' : 'Confirmar nueva contraseña'}</Button>
          </fieldset></form> : <p>Para establecer tu contraseña, abre el enlace original del correo. Si ya lo utilizaste, inicia sesión; si venció, solicita uno nuevo.</p>}
          <div className="actions"><Link href="/sign-in">Iniciar sesión</Link><Link href="/forgot-password">Solicitar otro enlace</Link></div>
        </> : null}

        {session && view === 'profile' ? <>
          {!user ? <div className="state"><h2>Inicia sesión para ver tu perfil</h2><Link className="button button-primary" href="/sign-in">Iniciar sesión</Link></div> : null}
          {user && !verified ? <div className="state"><h2>Primero verifica tu correo</h2><p>La edición del perfil estará disponible después de verificar tu dirección.</p><Link className="button button-primary" href="/verify-email">Verificar correo</Link></div> : null}
          {verified && !profile && !loading ? <div className="state"><p>No pudimos cargar tus datos.</p><Button disabled={locked} onClick={() => void load()}>Volver a intentar</Button></div> : null}
          {verified && profile ? <>
            <div className="profile-summary"><span className="initials" aria-hidden="true">{[...profile.firstName][0]}{[...profile.lastName][0]}</span><div><h2>{profile.firstName} {profile.lastName}</h2><p className="profile-verified">Correo verificado</p></div></div>
            <section className="profile-details folder-panel tone-yellow" aria-labelledby="profile-details-heading">
            <h2 id="profile-details-heading" className="folder-tab"><AccountFolderIcon kind="person" />Datos personales</h2>
            <form noValidate onSubmit={submit('/account', 'Guardaste los cambios de tu perfil.', 'PATCH')}><fieldset disabled={locked}>
              <div className="field-grid"><Field name="firstName" label="Nombre" autoComplete="given-name" value={firstName} onChange={setFirstName} /><Field name="lastName" label="Apellido" autoComplete="family-name" value={lastName} onChange={setLastName} /></div>
              <div className="field"><Label htmlFor="profile-email">Correo electrónico</Label><Input id="profile-email" value={profile.email} readOnly autoComplete="email" aria-describedby="email-help" /><p id="email-help" className="field-help">El correo no se puede modificar desde el perfil.</p></div>
              <div className="form-actions"><Button variant="outline" onClick={() => { setFirstName(profile.firstName); setLastName(profile.lastName); setMessage(undefined); }}>Cancelar</Button><Button type="submit">{busy ? 'Guardando…' : 'Guardar cambios'}</Button></div>
            </fieldset></form></section>
            <section className="password-section folder-panel tone-mint" aria-labelledby="password-heading"><h2 id="password-heading" className="folder-tab"><AccountFolderIcon kind="lock" />Seguridad</h2><p>Tu sesión se renovará y se cerrarán las demás sesiones de tu cuenta.</p>
              <form noValidate onSubmit={submit('/account/password', 'Contraseña actualizada. Tu sesión continúa y las demás sesiones se cerraron.')}><fieldset disabled={locked}>
                <div className="field-grid"><Field name="currentPassword" label="Contraseña actual" password autoComplete="current-password" /><Field name="newPassword" label="Nueva contraseña" password autoComplete="new-password" /></div>
                <Button type="submit">{busy ? 'Actualizando…' : 'Cambiar contraseña'}</Button>
              </fieldset></form>
            </section><div className="signout-row">{signOut}</div>
          </> : null}
        </> : null}
      </section>
      <footer className="page-footer">FoxMind · Enseñar y aprender, en un mismo lugar.</footer>
    </main>
    </div>
  </>;
}
