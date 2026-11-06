import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import type { NavbarLink } from './navbar-types';
import { FoxmindIcon } from './FoxmindIcon';
import { openDialog } from './dialog-focus';

type Follow = (event: MouseEvent<HTMLAnchorElement>, href: string) => void;
export function ShellLinks({ links, follow }: { links: NavbarLink[]; follow: Follow }) {
  return <nav className="fm3d-shell-nav" aria-label="Navegación principal">{links.map(link =>
    <a key={link.href} href={link.href} aria-current={link.current ? 'page' : undefined} onClick={event => follow(event, link.href)}>
      <FoxmindIcon name={link.href.startsWith('/agenda') ? 'calendar' : link.href.startsWith('/mis-aulas') ? 'layers' : link.href.startsWith('/foxy-ai') ? 'spark' : 'home'} />{link.label}</a>)}</nav>;
}
export function ShellAccount({ privateShell, currentPath, displayName, accountEmail, accountActions, notifications, follow, homeNavigation, accountRole }: {
  privateShell: boolean; currentPath?: string; displayName?: string; accountEmail?: string; accountActions?: ReactNode; notifications?: ReactNode; follow: Follow; homeNavigation?: boolean; accountRole?:'teacher'|'student';
}) {
  return <div className="fm3d-shell-account">
    {notifications ? <div className="fm3d-shell-notifications">{notifications}</div> : null}
    {privateShell && !homeNavigation ? <><a href="/settings" aria-current={currentPath === '/settings' ? 'page' : undefined} onClick={event => follow(event, '/settings')}><FoxmindIcon name="settings" />Configuración</a>
      {!homeNavigation ? <a href="/profile" aria-current={currentPath === '/profile' ? 'page' : undefined} onClick={event => follow(event, '/profile')}><FoxmindIcon name="profile" />Mi perfil</a> : null}</> : null}
    {homeNavigation && privateShell ? <HomeAccountMenu displayName={displayName} accountEmail={accountEmail} follow={follow} accountActions={accountActions} accountRole={accountRole}/> : <>
      {displayName ? <p className="fm3d-shell-name">{displayName}</p> : null}{accountActions}</>}
  </div>;
}
function HomeAccountMenu({displayName,accountEmail,follow,accountActions,accountRole}:{displayName?:string;accountEmail?:string;follow:Follow;accountActions?:ReactNode;accountRole?:'teacher'|'student'}) {
  const [open,setOpen]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null);
  useEffect(()=>{if(open && dialog.current)return openDialog(dialog.current);},[open]);
  const initials=displayName?.trim().split(/\s+/).slice(0,2).map(word=>Array.from(word)[0]).join('')||'F';
  const navigate=(event:MouseEvent<HTMLAnchorElement>,href:string)=>{
    if(event.button===0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey)setOpen(false);
    follow(event,href);
  };
  return <div className="fm-home-account-menu">
    <button type="button" className="fm-home-account-trigger" aria-haspopup="dialog" aria-expanded={open} aria-label={`Mi cuenta${displayName ? ` de ${displayName}` : ''}`} onClick={()=>setOpen(true)}>
      <b className="fm-brujula-avatar" aria-hidden="true">{initials}</b><span>{displayName?.trim() || 'Mi cuenta'}{accountRole?<small>{accountRole==='teacher'?'Docente':'Alumno'}</small>:null}</span><FoxmindIcon name="settings"/>
    </button>
    {open ? <dialog ref={dialog} className="fm-brujula-account-dialog" aria-modal="true" aria-label="Mi cuenta" onCancel={event=>{event.preventDefault();event.stopPropagation();setOpen(false);}} onClick={event=>{if(event.target===event.currentTarget)setOpen(false);}}>
      <header><h2>Mi cuenta</h2><button type="button" aria-label="Cerrar Mi cuenta" onClick={()=>setOpen(false)}><FoxmindIcon name="close"/></button></header>
      <div className="fm-brujula-account-body"><div className="fm-brujula-account-summary"><b className="fm-brujula-avatar" aria-hidden="true">{initials}</b><div><h3>{displayName?.trim() || 'Mi cuenta'}</h3><small>{accountRole ? accountRole==='teacher'?'Docente':'Alumno' : ''}{accountRole && accountEmail ? ' · ' : ''}{accountEmail}</small></div></div>
        <nav aria-label="Opciones de Mi cuenta"><a href="/profile" onClick={event=>navigate(event,'/profile')}><FoxmindIcon name="profile"/>Mi perfil<FoxmindIcon name="chevron-right"/></a><a href="/settings" onClick={event=>navigate(event,'/settings')}><FoxmindIcon name="settings"/>Configuración de la cuenta<FoxmindIcon name="chevron-right"/></a>{accountActions ? <div className="fm-brujula-session-action"><FoxmindIcon name="logout"/>{accountActions}<FoxmindIcon name="chevron-right"/></div> : null}</nav>
      </div>
    </dialog>:null}
  </div>;
}
export function NavbarDrawer({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => openDialog(dialog.current!), []);
  return <dialog id="fm3d-navigation-drawer" ref={dialog} className="fm3d-drawer" aria-modal="true" aria-labelledby="fm3d-drawer-title"
    onCancel={event => { if (event.target === event.currentTarget) { event.preventDefault(); onClose(); } }}
    onClick={event => { const target = event.target as HTMLElement; if (target.closest('a,button') && !target.closest('.fm3d-shell-notifications,.fm-brujula-search,.fm-brujula-search-dialog,.fm-home-account-menu,.fm-brujula-account-dialog')) onClose(); }}>
    <header><h2 id="fm3d-drawer-title">Menú de navegación</h2>
      <button type="button" aria-label="Cerrar menú de navegación" onClick={onClose}><FoxmindIcon name="close" /></button></header>
    {children}
  </dialog>;
}
