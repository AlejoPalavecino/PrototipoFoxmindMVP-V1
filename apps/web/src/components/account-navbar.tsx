import { useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/router';
import { AppNavbar } from '../../../shared-ui/AppNavbar';
import { Notifications } from '../../../classrooms-ui/Notifications';
import { createWebClassroomClient } from '../lib/classroom-client';
import type { AccountSession } from '../lib/account-client';

/** The page supplies its existing session and logout operation. */
export function AccountNavbar({ session, view, signInHref = '/sign-in', registerHref = '/register', verifyHref = '/verify-email', accountActions }: {
  session?: AccountSession;
  view?: string;
  signInHref?: string;
  registerHref?: string;
  verifyHref?: string;
  accountActions?: ReactNode;
}) {
  const router = useRouter();
  const api = useMemo(() => createWebClassroomClient(), []);
  const user = session?.authenticated ? session.user : undefined;
  const verified = Boolean(user?.emailVerified);
  return <AppNavbar logoHref={user ? (verified ? '/profile' : verifyHref) : '/sign-in'}
    displayName={user ? `${user.firstName} ${user.lastName}` : undefined}
    links={verified ? [{ href: '/inicio', label: 'Inicio' }, { href: '/mis-aulas', label: 'Mis aulas' }]
      : user ? [{ href: verifyHref, label: 'Verificar correo', current: view === 'verify-email' }]
        : [{ href: signInHref, label: 'Iniciar sesión', current: view === 'sign-in' }, { href: registerHref, label: 'Crear cuenta', current: view === 'register' }]}
    onNavigate={href => { void router.push(href); }}
    notifications={verified ? <Notifications api={api} refresh={0} onSelect={id => { void router.push(`/mis-aulas?notificacion=${encodeURIComponent(id)}`); }} /> : undefined}
    accountActions={accountActions} />;
}
