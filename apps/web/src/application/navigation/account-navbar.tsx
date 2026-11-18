import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/router';
import { AppNavbar } from '../../../../shared-ui/AppNavbar.tsx';
import Link from 'next/link';
import { FoxmindBrand, FoxmindIcon } from '../../../../shared-ui/index.ts';
import { Notifications } from '../../features/notifications/index.ts';
import { createWebClassroomClient } from '../clients/classroom-client.ts';
import type { AccountSession } from '../../features/identity/index.ts';
import type { Classroom } from '../../../../../src/core/contracts/classrooms.ts';
import { createBrujulaSearchClient } from '../../../../shared-ui/brujula-search-client.ts';
import { AiQuotaIndicator } from './ai-quota-indicator.tsx';

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
  const search = useMemo(() => createBrujulaSearchClient(api), [api, user?.id]);
  const verified = Boolean(user?.emailVerified);
  const [rooms,setRooms]=useState<{subject:string;items:Classroom[]}|null>(null);
  useEffect(()=>{
    const controller=new AbortController();
    if(user?.id && verified && !minimal)void api.call<{teach:Classroom[];study:Classroom[]}>('',undefined,undefined,controller.signal)
      .then(value=>{if(!controller.signal.aborted)setRooms({subject:user.id,items:user.accountRole==='teacher'?value.teach:value.study});})
      .catch(()=>{if(!controller.signal.aborted)setRooms(null);});
    return()=>controller.abort();
  },[api,user?.id,user?.accountRole,verified,minimal]);
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
    quotaIndicator={user && verified ? <AiQuotaIndicator key={user.id} subjectId={user.id} /> : undefined}
    search={verified ? search : undefined}
    avatarKey={user?.avatarKey} accountRole={user?.accountRole} classroomLinks={rooms?.subject===user?.id ? rooms?.items.filter(room=>!room.archived).map(room=>({href:`/mis-aulas?aula=${encodeURIComponent(room.id)}`,label:room.name,coverKey:room.coverKey})):undefined}
    displayName={user ? `${user.firstName} ${user.lastName}` : undefined} accountEmail={user?.email} currentPath={view ? `/${view}` : undefined}
    links={verified ? [{ href: '/inicio', label: 'Inicio' }, { href: '/mis-aulas', label: 'Mis aulas' },
      ...(user?.accountRole==='student'?[{href:'/carpetas-de-estudio',label:'Mi estudio',current:view==='carpetas-de-estudio'}]:[]),
      { href: '/agenda', label: 'Agenda', current: view === 'agenda' },
      ...(user?.accountRole === 'teacher' ? [{ href: '/foxy-ai', label: 'Foxy AI', current: view === 'foxy-ai' }] : [])]
      : user ? [{ href: verifyHref, label: 'Verificar correo', current: view === 'verify-email' }]
        : [{ href: signInHref, label: 'Iniciar sesión', current: view === 'sign-in' }, { href: registerHref, label: 'Crear cuenta', current: view === 'register' }]}
    onNavigate={navigate}
    notifications={verified ? <Notifications api={api} refresh={0} onSelect={id => navigate(`/mis-aulas?notificacion=${encodeURIComponent(id)}`)} /> : undefined}
    accountActions={accountActions} />;
}
