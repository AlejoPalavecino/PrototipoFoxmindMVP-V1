import { useEffect, useState, type MouseEvent, type ReactNode } from 'react';
import { FoxmindBrand } from './FoxmindBrand';
import { HomeReferenceIcon as FoxmindIcon } from './HomeReferenceIcon';
import { NavbarDrawer, ShellLinks, ShellAccount, ShellHelp } from './NavbarParts';
import { NavigationSearch } from './NavigationSearch';

import type { NavbarLink } from './navbar-types';
import type { BrujulaSearchClient } from '../../src/core/domain/classrooms/brujula-search.ts';
export type { NavbarLink } from './navbar-types';
export interface AppNavbarProps {
  logoHref: string; links: NavbarLink[]; displayName?: string; accountEmail?: string;
  notifications?: ReactNode; accountActions?: ReactNode; onNavigate?: (href: string) => void;
  currentPath?: string; restricted?: boolean; homeNavigation?: boolean;
  classroomLinks?: NavbarLink[]; accountRole?: 'teacher'|'student';
  search?: BrujulaSearchClient;
  avatarKey?: string;
}

/** Routing, session and mutations stay with each caller. */
export function AppNavbar(props: AppNavbarProps) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => { try { setCollapsed(localStorage.getItem('foxmind.navigation.collapsed') === 'true'); } catch { /* Optional preference. */ } }, []);
  useEffect(() => {
    const enterChat = () => setCollapsed(true);
    const exitChat = () => { try { setCollapsed(localStorage.getItem('foxmind.navigation.collapsed') === 'true'); } catch { setCollapsed(false); } };
    const openChatMenu = () => setOpen(true);
    window.addEventListener('foxmind:chat-menu', openChatMenu);
    window.addEventListener('foxmind:chat-enter', enterChat);
    window.addEventListener('foxmind:chat-exit', exitChat);
    return () => { window.removeEventListener('foxmind:chat-menu', openChatMenu); window.removeEventListener('foxmind:chat-enter', enterChat); window.removeEventListener('foxmind:chat-exit', exitChat); };
  }, []);
  const toggleSidebar = () => setCollapsed(current => {
    try { localStorage.setItem('foxmind.navigation.collapsed', String(!current)); } catch { /* Navigation remains usable without storage. */ }
    return !current;
  });
  const restricted = props.restricted ?? false;
  // Private screens share one navigation policy, including future callers.
  const privateShell = props.links.some(link => link.href === '/mis-aulas');
  const homeNavigation = privateShell || props.homeNavigation === true;
  useEffect(() => { setOpen(false); }, [homeNavigation, props.currentPath]);
  useEffect(() => {
    if (!open || !window.matchMedia) return;
    const desktop = window.matchMedia('(min-width: 1001px)');
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
  const classrooms = restricted ? [] : props.classroomLinks?.slice(0, 3) ?? [];
  const classroomShortcuts = (placement: string) => classrooms.length > 0 ? (
    <nav className={`fm-classroom-shortcuts ${placement}`} aria-label="Accesos a mis aulas">
      <span className="fm-brujula-nav-label">Tus aulas</span>
      {classrooms.map(link => (
        <a key={link.href} href={link.href} onClick={event => follow(event, link.href)} aria-current={link.current ? 'page' : undefined}>
          <i className="fm-classroom-dot" aria-hidden="true" />
          <span className="fm-classroom-name">{link.label}</span>
        </a>
      ))}
    </nav>
  ) : null;
  return <header className={`fm3d-shell${privateShell ? ' fm-navbar-private' : ''}${homeNavigation ? ' fm-home-navigation' : ''}`} data-private={privateShell} data-collapsed={collapsed}>
    <a href={props.logoHref} className="fm3d-shell-brand" aria-label="FoxMind" onClick={event => follow(event, props.logoHref)}>{privateShell ? <span className="fm-brujula-brand"><img src="/foxmind/logo.webp" alt=""/><span>Fox<em>Mind</em></span></span> : <FoxmindBrand decorative />}</a>
    {privateShell ? <button type="button" className="fm-sidebar-collapse" aria-label={collapsed ? 'Expandir navegación' : 'Plegar navegación'} title={collapsed ? 'Expandir navegación' : 'Plegar navegación'} aria-expanded={!collapsed} onClick={toggleSidebar}><FoxmindIcon name={collapsed ? 'arrow-right' : 'arrow-left'}/></button> : null}
    {privateShell && !restricted ? <div className="fm-brujula-search-slot"><NavigationSearch links={props.links} follow={follow} shortcut={!open} search={props.search}/></div> : null}
    <ShellLinks links={props.links} follow={follow} />
    {!restricted && !open && props.notifications ? <div className="fm-brujula-nav-notices fm3d-shell-notifications">{props.notifications}</div>:null}
    {!collapsed ? classroomShortcuts('fm-brujula-classroom-links') : null}
    <div className="fm3d-shell-tools">{privateShell && !homeNavigation ? <span className="fm3d-shell-location">{props.currentPath === '/profile' ? 'Mi perfil' : props.currentPath === '/settings' ? 'Configuración' : props.links.find(link => link.current)?.label ?? 'Tu espacio de aprendizaje'}</span> : null}{!restricted && !homeNavigation ? props.notifications : null}
      {privateShell && !restricted && !homeNavigation ? <a className="fm3d-shell-avatar" href="/profile" aria-label={`Mi perfil${props.displayName ? ` de ${props.displayName}` : ''}`}
        onClick={event => follow(event, '/profile')}><span aria-hidden="true">{initials}</span></a> : null}
      {privateShell ? <button type="button" className="fm3d-shell-toggle" aria-label="Abrir menú de navegación"
        aria-expanded={open} aria-controls="fm3d-navigation-drawer" onClick={() => setOpen(value=>!value)}><FoxmindIcon name="menu" /><span>Menú</span></button> : null}
    </div>
    {privateShell && !restricted ? <ShellHelp accountRole={props.accountRole}/> : null}
    {!restricted ? <ShellAccount avatarKey={props.avatarKey} homeNavigation={homeNavigation} accountRole={props.accountRole} accountEmail={props.accountEmail} privateShell={privateShell} currentPath={props.currentPath} displayName={props.displayName} accountActions={props.accountActions} follow={follow} /> : null}
    {open ? <NavbarDrawer onClose={() => setOpen(false)}>
      <a href={props.logoHref} className="fm-drawer-brand fm-brujula-brand" onClick={event=>follow(event,props.logoHref)} aria-label="FoxMind"><img src="/foxmind/logo.webp" alt=""/><span>Fox<em>Mind</em></span></a>
      {!restricted ? <NavigationSearch links={props.links} follow={follow} search={props.search}/> : null}
      <ShellLinks links={props.links} follow={follow} />
      {!restricted&&props.notifications?<div className="fm-drawer-notices fm3d-shell-notifications">{props.notifications}</div>:null}
      {classroomShortcuts('fm-brujula-drawer-classrooms')}
      {!restricted ? <ShellAccount avatarKey={props.avatarKey} homeNavigation={homeNavigation} accountRole={props.accountRole} accountEmail={props.accountEmail} notifications={undefined} privateShell={privateShell} currentPath={props.currentPath} displayName={props.displayName} accountActions={props.accountActions} follow={follow} /> : null}
    </NavbarDrawer> : null}
  </header>;
}
