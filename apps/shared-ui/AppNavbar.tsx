import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';

export interface NavbarLink { href: string; label: string; current?: boolean }

/** Presentation only: callers retain their session, routing and logout owners. */
export function AppNavbar({ logoHref, links, displayName, notifications, accountActions, onNavigate }: {
  logoHref: string;
  links: NavbarLink[];
  displayName?: string;
  notifications?: ReactNode;
  accountActions?: ReactNode;
  onNavigate?: (href: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const header = useRef<HTMLElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const close = (restoreFocus = false) => { setOpen(false); if (restoreFocus) trigger.current?.focus(); };
  useEffect(() => {
    if (!open) return;
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); close(true); } };
    const outside = (event: PointerEvent) => { if (!header.current?.contains(event.target as Node)) close(); };
    document.addEventListener('keydown', key); document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('keydown', key); document.removeEventListener('pointerdown', outside); };
  }, [open]);
  const follow = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    close();
    if (onNavigate) { event.preventDefault(); onNavigate(href); }
  };
  const navigation = links.map(link => <a key={link.href} href={link.href} aria-current={link.current ? 'page' : undefined}
    onClick={event => follow(event, link.href)}>{link.label}</a>);
  return <header className={`fm-navbar${displayName || accountActions ? ' fm-navbar-private' : ''}`} ref={header}
    onBlur={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) close(); }}>
    <a href={logoHref} className="fm-wordmark" aria-label="FoxMind" onClick={event => follow(event, logoHref)}><span>Fox</span>Mind</a>
    <nav className="fm-nav-links" aria-label="Navegación principal">{navigation}</nav>
    <div className="fm-nav-tools">
      {notifications}
      <button ref={trigger} type="button" className="fm-menu-toggle" aria-label={displayName ? `Abrir menú de cuenta de ${displayName}` : accountActions ? 'Abrir menú de cuenta' : 'Abrir menú de navegación'}
        aria-expanded={open} aria-controls="fm-account-menu" onClick={() => setOpen(value => !value)}>
        {displayName ? <><span className="fm-avatar" aria-hidden="true">{Array.from(displayName.trim())[0] ?? 'F'}</span><span className="fm-menu-label">Mi cuenta</span></> : 'Menú'}
      </button>
    </div>
    {open ? <div id="fm-account-menu" className="fm-account-menu" onClick={event => {
      if ((event.target as HTMLElement).closest('a,button')) close(true);
    }}>
      {displayName ? <p className="fm-menu-name">{displayName}</p> : null}
      <nav className="fm-mobile-links" aria-label="Navegación móvil">{navigation}</nav>
      {accountActions}
    </div> : null}
  </header>;
}
