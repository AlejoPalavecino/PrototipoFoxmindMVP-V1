import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import type { NavbarLink } from './navbar-types';
import { HomeReferenceIcon as FoxmindIcon } from './HomeReferenceIcon';
import { openDialog } from './dialog-focus';
import { AccountAvatar } from './AccountAvatar';

type Follow = (event: MouseEvent<HTMLAnchorElement>, href: string) => void;
export function ShellLinks({ links, follow }: { links: NavbarLink[]; follow: Follow }) {
  return <nav className="fm3d-shell-nav" aria-label="Navegación principal">{links.map(link =>
    <a key={link.href} href={link.href} title={link.label} aria-label={link.label} aria-current={link.current ? 'page' : undefined} onClick={event => follow(event, link.href)}>
      <FoxmindIcon name={link.href.startsWith('/carpetas-de-estudio')?'folder':link.href.startsWith('/agenda') ? 'calendar' : link.href.startsWith('/mis-aulas') ? 'layers' : link.href.startsWith('/foxy-ai') ? 'spark' : link.href.startsWith('/notificaciones') ? 'bell' : 'home'} /><span className="fm-navigation-label">{link.label}</span></a>)}</nav>;
}
export function ShellAccount({ avatarKey, privateShell, currentPath, displayName, accountEmail, accountActions, notifications, follow, homeNavigation, accountRole }: {
  avatarKey?: string; privateShell: boolean; currentPath?: string; displayName?: string; accountEmail?: string; accountActions?: ReactNode; notifications?: ReactNode; follow: Follow; homeNavigation?: boolean; accountRole?:'teacher'|'student';
}) {
  return <div className="fm3d-shell-account">
    {notifications ? <div className="fm3d-shell-notifications">{notifications}</div> : null}
    {privateShell && !homeNavigation ? <><a href="/settings" aria-current={currentPath === '/settings' ? 'page' : undefined} onClick={event => follow(event, '/settings')}><FoxmindIcon name="settings" />Configuración</a>
      {!homeNavigation ? <a href="/profile" aria-current={currentPath === '/profile' ? 'page' : undefined} onClick={event => follow(event, '/profile')}><FoxmindIcon name="profile" />Mi perfil</a> : null}</> : null}
    {homeNavigation && privateShell ? <a href="/profile" className="fm-home-account-trigger" aria-label={`Mi perfil${displayName?` de ${displayName}`:''}`} onClick={event=>follow(event,'/profile')}><AccountAvatar className="fm-brujula-avatar" avatarKey={avatarKey} initials={displayName?.trim().split(/\s+/).slice(0,2).map(word=>Array.from(word)[0]).join('')||'F'}/><span>{displayName?.trim()||'Mi perfil'}{accountRole?<small>{accountRole==='teacher'?'Docente':'Estudiante'}</small>:null}</span><FoxmindIcon name="settings"/></a> : <>
      {displayName ? <p className="fm3d-shell-name">{displayName}</p> : null}{accountActions}</>}
  </div>;
}
export function NavbarDrawer({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => openDialog(dialog.current!), []);
  return <dialog id="fm3d-navigation-drawer" ref={dialog} className="fm3d-drawer" aria-modal="true" aria-labelledby="fm3d-drawer-title"
    onCancel={event => { if (event.target === event.currentTarget) { event.preventDefault(); onClose(); } }}
    onClick={event => { const target = event.target as HTMLElement; if (target.closest('a,button') && !target.closest('.fm3d-shell-notifications,.fm-brujula-search,.fm-brujula-search-dialog,.fm-home-account-menu,.fm-brujula-account-dialog')) onClose(); }}>
    <header><h2 id="fm3d-drawer-title">Menú de navegación</h2>
      <button type="button" aria-label="Cerrar menú de navegación" onClick={onClose}><FoxmindIcon name="menu" /></button></header>
    {children}
  </dialog>;
}

export function ShellHelp({accountRole}:{accountRole?:'teacher'|'student'}) {
 const [open,setOpen]=useState(false);const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(open&&dialog.current)return openDialog(dialog.current);},[open]);
 return <div className="fm-sidebar-help"><button type="button" onClick={()=>setOpen(true)}><FoxmindIcon name="help"/><span className="fm-sidebar-help-label">Ayuda</span></button>{open?<dialog ref={dialog} className="fm-sidebar-help-dialog" aria-labelledby="fm-sidebar-help-title" onCancel={event=>{event.preventDefault();setOpen(false);}}><header><h2 id="fm-sidebar-help-title">Estamos para acompañarte</h2><button type="button" aria-label="Cerrar ayuda" onClick={()=>setOpen(false)}><FoxmindIcon name="close"/></button></header><p>Cada espacio tiene un próximo paso.</p><div><h3>Mis aulas</h3><p>Encontrá el plan, los materiales y las actividades de cada grupo.</p><h3>{accountRole==='teacher'?'Foxy AI':'Mi estudio'}</h3><p>Un espacio privado para preparar ideas y aprender a tu ritmo.</p><h3>Agenda</h3><p>Organizá tus momentos de clase y de estudio.</p></div><footer><button type="button" className="primary" onClick={()=>setOpen(false)}>Entendido</button></footer></dialog>:null}</div>;
}
