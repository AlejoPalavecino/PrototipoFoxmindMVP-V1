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
export function ShellAccount({ privateShell, currentPath, displayName, accountActions, follow }: {
  privateShell: boolean; currentPath?: string; displayName?: string; accountActions?: ReactNode; follow: Follow;
}) {
  return <div className="fm3d-shell-account">
    {privateShell ? <><a href="/settings" aria-current={currentPath === '/settings' ? 'page' : undefined} onClick={event => follow(event, '/settings')}><FoxmindIcon name="settings" />Configuración</a>
      <a href="/profile" aria-current={currentPath === '/profile' ? 'page' : undefined} onClick={event => follow(event, '/profile')}><FoxmindIcon name="profile" />Mi perfil</a></> : null}
    {displayName ? <p className="fm3d-shell-name">{displayName}</p> : null}
    {accountActions}
  </div>;
}
export function NavbarDrawer({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => openDialog(dialog.current!), []);
  return <dialog id="fm3d-navigation-drawer" ref={dialog} className="fm3d-drawer" aria-modal="true" aria-labelledby="fm3d-drawer-title"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onClick={event => { if ((event.target as HTMLElement).closest('a,button')) onClose(); }}>
    <header><h2 id="fm3d-drawer-title">Menú de navegación</h2>
      <button type="button" aria-label="Cerrar menú de navegación" onClick={onClose}><FoxmindIcon name="close" /></button></header>
    {children}
  </dialog>;
}
