import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react';
import type { NavbarLink } from './AppNavbar';
import { FoxmindIcon } from './FoxmindIcon';
import { openDialog } from './dialog-focus';

type Follow = (event: MouseEvent<HTMLAnchorElement>, href: string) => void;
export function ShellLinks({ links, follow }: { links: NavbarLink[]; follow: Follow }) {
  return <nav className="fm3d-shell-nav" aria-label="Navegación principal">{links.map(link =>
    <a key={link.href} href={link.href} aria-current={link.current ? 'page' : undefined} onClick={event => follow(event, link.href)}>
      <FoxmindIcon name={link.href.startsWith('/agenda') ? 'calendar' : link.href.startsWith('/mis-aulas') ? 'book' : 'home'} />{link.label}</a>)}</nav>;
}
export function ShellAccount({ privateShell, currentPath, displayName, accountActions, notifications, follow, homeNavigation }: {
  privateShell: boolean; currentPath?: string; displayName?: string; accountActions?: ReactNode; notifications?: ReactNode; follow: Follow; homeNavigation?: boolean;
}) {
  return <div className="fm3d-shell-account">
    {notifications ? <div className="fm3d-shell-notifications">{notifications}</div> : null}
    {privateShell ? <><a href="/settings" aria-current={currentPath === '/settings' ? 'page' : undefined} onClick={event => follow(event, '/settings')}><FoxmindIcon name="settings" />Configuración</a>
      {!homeNavigation ? <a href="/profile" aria-current={currentPath === '/profile' ? 'page' : undefined} onClick={event => follow(event, '/profile')}><FoxmindIcon name="profile" />Mi perfil</a> : null}</> : null}
    {homeNavigation && privateShell ? <HomeAccountMenu displayName={displayName} follow={follow} accountActions={accountActions}/> : <>
      {displayName ? <p className="fm3d-shell-name">{displayName}</p> : null}{accountActions}</>}
  </div>;
}
function HomeAccountMenu({displayName,follow,accountActions}:{displayName?:string;follow:Follow;accountActions?:ReactNode}) {
  const menu=useRef<HTMLDetailsElement>(null);
  useEffect(()=>{
    const close=(event:PointerEvent)=>{if(menu.current && !menu.current.contains(event.target as Node))menu.current.open=false;};
    document.addEventListener('pointerdown',close);
    return ()=>document.removeEventListener('pointerdown',close);
  },[]);
  return <details ref={menu} className="fm-home-account-menu" onKeyDown={event=>{
    if(event.key==='Escape' && menu.current?.open){event.preventDefault();event.stopPropagation();menu.current.open=false;menu.current.querySelector('summary')?.focus();}
  }}>
    <summary><FoxmindIcon name="profile"/><span>{displayName?.trim() || 'Mi cuenta'}</span><FoxmindIcon name="chevron-down"/></summary>
    <div className="fm-home-account-options"><a href="/profile" onClick={event=>{if(menu.current)menu.current.open=false;follow(event,'/profile');}}>Ver mi perfil</a>{accountActions}</div>
  </details>;
}
export function NavbarDrawer({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => openDialog(dialog.current!), []);
  return <dialog id="fm3d-navigation-drawer" ref={dialog} className="fm3d-drawer" aria-modal="true" aria-labelledby="fm3d-drawer-title"
    onCancel={event => { if (event.target === event.currentTarget) { event.preventDefault(); onClose(); } }}
    onClick={event => { const target = event.target as HTMLElement; if (target.closest('a,button') && !target.closest('.fm3d-shell-notifications')) onClose(); }}>
    <header><h2 id="fm3d-drawer-title">Menú de navegación</h2>
      <button type="button" aria-label="Cerrar menú de navegación" onClick={onClose}><FoxmindIcon name="close" /></button></header>
    {children}
  </dialog>;
}
