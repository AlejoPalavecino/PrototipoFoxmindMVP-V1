import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { EntryIcon } from './EntryIcon';
import { markerFrames, type MarkerRect } from './navbar-motion';

// Ephemeral presentation geometry only: survives page-component remounts, not reloads.
let departure: { scope: string; rect: MarkerRect; time: number; viewport: number } | undefined;

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
  const nav = useRef<HTMLElement>(null), marker = useRef<HTMLSpanElement>(null);
  const scope = links.map(link => link.href.split('?')[0]).join('|');
  const activeHref = links.find(link => link.current)?.href;
  useLayoutEffect(() => {
    const node = nav.current!, indicator = marker.current!;
    let animation: Animation | undefined;
    const measure = (animate: boolean) => {
      const active = node.querySelector<HTMLElement>('[aria-current="page"]');
      if (!active || !node.getBoundingClientRect().width) { indicator.hidden = true; return; }
      const box = active.getBoundingClientRect(), parent = node.getBoundingClientRect();
      Object.assign(indicator.style, { left: `${box.x - parent.x}px`, top: `${box.y - parent.y}px`, width: `${box.width}px`, height: `${box.height}px` });
      indicator.hidden = false;
      if (animate && departure?.scope === scope && departure.viewport === innerWidth && Date.now() - departure.time < 5000) {
        const frames = markerFrames(departure.rect, box, matchMedia('(prefers-reduced-motion: reduce)').matches);
        if (frames) animation = indicator.animate(frames, { duration: 200, easing: 'ease-out' });
      }
      if (animate) departure = undefined;
    };
    measure(true);
    const observer = new ResizeObserver(() => measure(false)); observer.observe(node);
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const stop = () => { if (motion.matches) animation?.cancel(); };
    motion.addEventListener('change', stop);
    return () => { observer.disconnect(); animation?.cancel(); motion.removeEventListener('change', stop); };
  }, [activeHref, scope]);
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
    const current = nav.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (current && onNavigate) departure = { scope, rect: current.getBoundingClientRect(), time: Date.now(), viewport: innerWidth };
    if (onNavigate) { event.preventDefault(); onNavigate(href); }
  };
  const navigation = links.map(link => <a key={link.href} href={link.href} aria-current={link.current ? 'page' : undefined}
    onClick={event => follow(event, link.href)}><EntryIcon name={link.href.startsWith('/inicio') ? 'house-door-fill' : link.href.startsWith('/mis-aulas') ? 'book' : 'person-fill'} />{link.label}</a>);
  return <header className={`fm-navbar${displayName || accountActions ? ' fm-navbar-private' : ''}`} ref={header}
    onBlur={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) close(); }}>
    <a href={logoHref} className="fm-wordmark" aria-label="FoxMind" onClick={event => follow(event, logoHref)}><span>Fox</span>Mind</a>
    <nav ref={nav} className="fm-nav-links" aria-label="Navegación principal"><span ref={marker} className="fm-nav-marker" aria-hidden="true" hidden />{navigation}</nav>
    <div className="fm-nav-tools">
      {notifications}
      <button ref={trigger} type="button" className="fm-menu-toggle" aria-label={displayName ? `Abrir menú de cuenta de ${displayName}` : accountActions ? 'Abrir menú de cuenta' : 'Abrir menú de navegación'}
        aria-expanded={open} aria-controls="fm-account-menu" onClick={() => setOpen(value => !value)}>
        {displayName ? <><span className="fm-avatar" aria-hidden="true">{Array.from(displayName.trim())[0] ?? 'F'}</span><EntryIcon name="chevron-down" /></> : <><EntryIcon name="list" /><span className="entry-sr-only">Menú</span></>}
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
