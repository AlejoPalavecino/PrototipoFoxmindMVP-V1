import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { FoxmindBrand } from './FoxmindBrand';
import { FoxmindIcon } from './FoxmindIcon';
import { NavbarDrawer, ShellLinks, ShellAccount } from './NavbarParts';
import { NavigationSearch } from './NavigationSearch';

import type { NavbarLink } from './navbar-types';
import type { BrujulaSearchClient } from '../../src/core/domain/brujula-search.ts';
export type { NavbarLink } from './navbar-types';
export interface AppNavbarProps {
  logoHref: string; links: NavbarLink[]; displayName?: string; accountEmail?: string;
  notifications?: ReactNode; accountActions?: ReactNode; onNavigate?: (href: string) => void;
  currentPath?: string; restricted?: boolean; homeNavigation?: boolean;
  classroomLinks?: NavbarLink[]; accountRole?: 'teacher'|'student';
  search?: BrujulaSearchClient;
}

/** Routing, session and mutations stay with each caller. */
export function AppNavbar(props: AppNavbarProps) {
  const [open, setOpen] = useState(false);
  const restricted = props.restricted ?? false;
  // Private screens share one navigation policy, including future callers.
  const privateShell = props.links.some(link => link.href === '/mis-aulas');
  const homeNavigation = privateShell || props.homeNavigation === true;
  useEffect(() => { setOpen(false); }, [homeNavigation, props.currentPath]);
  useEffect(() => {
    if (!open || !window.matchMedia) return;
    const desktop = window.matchMedia('(min-width: 801px)');
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, [open]);
  const initials = props.displayName?.trim().split(/\s+/).map(part => Array.from(part)[0]).slice(0, 2).join('').toUpperCase() || 'F';
  const follow = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    setOpen(false);
    if (props.onNavigate) { event.preventDefault(); props.onNavigate(href); }
  };
  return <header className={`fm3d-shell${privateShell ? ' fm-navbar-private' : ''}${homeNavigation ? ' fm-home-navigation' : ''}`} data-private={privateShell}>
    <a href={props.logoHref} className="fm3d-shell-brand" aria-label="FoxMind" onClick={event => follow(event, props.logoHref)}>{privateShell ? <span className="fm-brujula-brand"><img src="/brujula/foxy-logotipo-redondo.webp" alt=""/><span>FoxMind<small>BRÚJULA</small></span></span> : <FoxmindBrand decorative />}</a>
    {privateShell && !restricted ? <div className="fm-brujula-search-slot"><NavigationSearch links={props.links} follow={follow} shortcut={!open} search={props.search}/><span className="fm-brujula-nav-label">Mi espacio</span></div> : null}
    <ShellLinks links={props.links} follow={follow} />
    {!restricted && !open && props.notifications ? <div className="fm-brujula-nav-notices fm3d-shell-notifications">{props.notifications}</div>:null}
    {!restricted && props.classroomLinks?.length ? <nav className="fm-brujula-classroom-links" aria-label="Accesos a mis aulas"><span className="fm-brujula-nav-label">Mis aulas</span>{props.classroomLinks.map(link=><a key={link.href} href={link.href} data-cover={link.coverKey} onClick={event=>follow(event,link.href)} aria-current={link.current?'page':undefined}><i/>{link.label}</a>)}</nav>:null}
    <div className="fm3d-shell-tools">{privateShell && !homeNavigation ? <span className="fm3d-shell-location">{props.currentPath === '/profile' ? 'Mi perfil' : props.currentPath === '/settings' ? 'Configuración' : props.links.find(link => link.current)?.label ?? 'Tu espacio de aprendizaje'}</span> : null}{!restricted && !homeNavigation ? props.notifications : null}
      {privateShell && !restricted && !homeNavigation ? <a className="fm3d-shell-avatar" href="/profile" aria-label={`Mi perfil${props.displayName ? ` de ${props.displayName}` : ''}`}
        onClick={event => follow(event, '/profile')}><span aria-hidden="true">{initials}</span></a> : null}
      {privateShell ? <button type="button" className="fm3d-shell-toggle" aria-label="Abrir menú de navegación"
        aria-expanded={open} aria-controls="fm3d-navigation-drawer" onClick={() => setOpen(true)}><FoxmindIcon name="menu" /><span>Menú</span></button> : null}
    </div>
    {!restricted ? <ShellAccount homeNavigation={homeNavigation} accountRole={props.accountRole} accountEmail={props.accountEmail} privateShell={privateShell} currentPath={props.currentPath} displayName={props.displayName} accountActions={props.accountActions} follow={follow} /> : null}
    {open ? <NavbarDrawer onClose={() => setOpen(false)}>
      {!restricted ? <NavigationSearch links={props.links} follow={follow} search={props.search}/> : null}
      <ShellLinks links={props.links} follow={follow} />
      {props.classroomLinks?.length ? <nav className="fm-brujula-drawer-classrooms" aria-label="Accesos a mis aulas">{props.classroomLinks.map(link=><a key={link.href} href={link.href} onClick={event=>follow(event,link.href)}>{link.label}</a>)}</nav>:null}
      {!restricted ? <ShellAccount homeNavigation={homeNavigation} accountRole={props.accountRole} accountEmail={props.accountEmail} notifications={homeNavigation ? props.notifications : undefined} privateShell={privateShell} currentPath={props.currentPath} displayName={props.displayName} accountActions={props.accountActions} follow={follow} /> : null}
    </NavbarDrawer> : null}
  </header>;
}
