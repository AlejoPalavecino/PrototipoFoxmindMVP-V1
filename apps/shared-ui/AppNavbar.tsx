import { useState, type MouseEvent, type ReactNode } from 'react';
import { FoxmindBrand } from './FoxmindBrand';
import { FoxmindIcon } from './FoxmindIcon';
import { NavbarDrawer, ShellLinks, ShellAccount } from './NavbarParts';

export interface NavbarLink { href: string; label: string; current?: boolean }
export interface AppNavbarProps {
  logoHref: string; links: NavbarLink[]; displayName?: string;
  notifications?: ReactNode; accountActions?: ReactNode; onNavigate?: (href: string) => void;
  currentPath?: string;
}

/** Routing, session and mutations stay with each caller. */
export function AppNavbar(props: AppNavbarProps) {
  const [open, setOpen] = useState(false);
  const privateShell = props.links.some(link => link.href === '/mis-aulas');
  const initials = props.displayName?.trim().split(/\s+/).map(part => Array.from(part)[0]).slice(0, 2).join('').toUpperCase() || 'F';
  const follow = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    setOpen(false);
    if (props.onNavigate) { event.preventDefault(); props.onNavigate(href); }
  };
  return <header className={`fm3d-shell${privateShell ? ' fm-navbar-private' : ''}`} data-private={privateShell}>
    <a href={props.logoHref} className="fm3d-shell-brand" aria-label="FoxMind" onClick={event => follow(event, props.logoHref)}><FoxmindBrand decorative /></a>
    <ShellLinks links={props.links} follow={follow} />
    <div className="fm3d-shell-tools">{privateShell ? <span className="fm3d-shell-location">{props.currentPath === '/profile' ? 'Mi perfil' : props.currentPath === '/settings' ? 'Configuración' : props.links.find(link => link.current)?.label ?? 'Tu espacio de aprendizaje'}</span> : null}{props.notifications}
      {privateShell ? <a className="fm3d-shell-avatar" href="/profile" aria-label={`Mi perfil${props.displayName ? ` de ${props.displayName}` : ''}`}
        onClick={event => follow(event, '/profile')}><span aria-hidden="true">{initials}</span></a> : null}
      {privateShell ? <button type="button" className="fm3d-shell-toggle" aria-label="Abrir menú de navegación"
        aria-expanded={open} aria-controls="fm3d-navigation-drawer" onClick={() => setOpen(true)}><FoxmindIcon name="menu" /></button> : null}
    </div>
    <ShellAccount privateShell={privateShell} currentPath={props.currentPath} displayName={props.displayName} accountActions={props.accountActions} follow={follow} />
    {open ? <NavbarDrawer onClose={() => setOpen(false)}>
      <ShellLinks links={props.links} follow={follow} />
      <ShellAccount privateShell={privateShell} currentPath={props.currentPath} displayName={props.displayName} accountActions={props.accountActions} follow={follow} />
    </NavbarDrawer> : null}
  </header>;
}
