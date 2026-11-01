import { useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/router';
import { AppNavbar } from '../../../shared-ui/AppNavbar';
import Link from 'next/link';
import { FoxmindBrand, FoxmindIcon } from '../../../shared-ui/index';
import { Notifications } from '../../../classrooms-ui/Notifications';
import { createWebClassroomClient } from '../lib/classroom-client';
import type { AccountSession } from '../lib/account-client';

/** The page supplies its existing session and logout operation. */
export function AccountNavbar({ session, view, signInHref = '/sign-in', registerHref = '/register', verifyHref = '/verify-email', accountActions, minimal = false, onNavigate }: {
  session?: AccountSession;
  view?: string;
  signInHref?: string;
  registerHref?: string;
  verifyHref?: string;
  accountActions?: ReactNode;
  minimal?: boolean;
  onNavigate?: (href: string) => void;
}) {
  const router = useRouter();
  const api = useMemo(() => createWebClassroomClient(), []);
  const user = session?.authenticated ? session.user : undefined;
  const verified = Boolean(user?.emailVerified);
  const navigate = (href: string) => { if (onNavigate) onNavigate(href); else void router.push(href); };
  if (minimal) return <header className="auth-brand-header">
    <div className="auth-reference-brand"><Link href={user ? (verified ? '/inicio' : verifyHref) : signInHref} aria-label="FoxMind"><FoxmindBrand decorative /></Link>
      <p>Un espacio para aprender y enseñar.</p></div>
    {!user && !accountActions && (view === 'sign-in' || view === 'register') ? <div className="auth-reference-switch">
      <span>{view === 'register' ? '¿Ya tenés cuenta?' : '¿No tenés cuenta?'}</span>
      <Link href={view === 'register' ? signInHref : registerHref}>{view === 'register' ? 'Iniciar sesión' : 'Crear cuenta'}<FoxmindIcon name="arrow-right" /></Link>
    </div> : null}
    {accountActions}
  </header>;
  return <AppNavbar logoHref={user ? (verified ? '/inicio' : verifyHref) : '/sign-in'}
    displayName={user ? `${user.firstName} ${user.lastName}` : undefined} currentPath={view ? `/${view}` : undefined}
    links={verified ? [{ href: '/inicio', label: 'Inicio' }, { href: '/mis-aulas', label: 'Mis aulas' }, { href: '/agenda', label: 'Agenda', current: view === 'agenda' },
      ...(user?.accountRole === 'teacher' ? [{ href: '/foxy-ai', label: 'Foxy AI', current: view === 'foxy-ai' }] : [])]
      : user ? [{ href: verifyHref, label: 'Verificar correo', current: view === 'verify-email' }]
        : [{ href: signInHref, label: 'Iniciar sesión', current: view === 'sign-in' }, { href: registerHref, label: 'Crear cuenta', current: view === 'register' }]}
    onNavigate={navigate}
    notifications={verified ? <Notifications api={api} refresh={0} onSelect={id => navigate(`/mis-aulas?notificacion=${encodeURIComponent(id)}`)} /> : undefined}
    accountActions={accountActions} />;
}
