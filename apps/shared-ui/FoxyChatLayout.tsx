import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AccountAvatar } from './AccountAvatar';
import { openDialog } from './dialog-focus';
import { FoxmindIcon } from './FoxmindIcon';
import s from './foxy-chat-layout.module.css';

const nextFrame = (work: () => void) => { if (typeof requestAnimationFrame === 'function') requestAnimationFrame(work); };

export type ChatIdentity = { avatarKey?: string; initials: string };
export type ChatView = 'chat' | 'tools' | 'creations';

export function ChatByline({ user, identity }: { user?: boolean; identity?: ChatIdentity }) {
  return <div className={`${s.byline} parity-ai-byline ${user ? s.user : ''}`}>
    {user ? <><span>Vos</span><AccountAvatar {...(identity ?? { initials: 'V' })}/></>
      : <><img src="/brujula/foxy-logotipo-redondo.webp" alt="" width={32} height={32}/><span>Foxy</span></>}
  </div>;
}

export function FoxyDialog({ title, description, onClose, children, footer, focusTitle = false, className = '' }: {
  title: string; description?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; focusTitle?: boolean; className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null), titleId = useId(), descriptionId = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const restore = openDialog(ref.current!);
    if (focusTitle) heading.current?.focus({ preventScroll: true });
    return restore;
  }, [focusTitle]);
  return <dialog ref={ref} className={`p5-dialog parity-foxy-dialog ${className}`} aria-labelledby={titleId}
    aria-describedby={description ? descriptionId : undefined} onCancel={event => { if (event.target !== event.currentTarget) return; event.preventDefault(); onClose(); }}>
    <header><div><h2 ref={heading} tabIndex={focusTitle ? -1 : undefined} id={titleId}>{title}</h2>{description && <p id={descriptionId}>{description}</p>}</div>
      <button type="button" className="p5-close" aria-label="Cerrar diálogo" onClick={onClose}><FoxmindIcon name="close"/></button></header>
    <div className="brujula-dialog-body">{children}</div>
    {footer && <footer className="parity-foxy-dialogFooter">{footer}</footer>}
  </dialog>;
}

/** Remembers per device whether the workbench rail is folded. Storage may be unavailable (private mode, tests). */
function useFoldedRail(key?: string) {
  const [folded, setFolded] = useState(false);
  useEffect(() => {
    if (!key) return;
    try { setFolded(window.localStorage?.getItem(key) === 'folded'); } catch { /* storage unavailable */ }
  }, [key]);
  const change = (next: boolean) => {
    setFolded(next);
    if (!key) return;
    try { if (next) window.localStorage?.setItem(key, 'folded'); else window.localStorage?.removeItem(key); } catch { /* storage unavailable */ }
  };
  return [folded, change] as const;
}

/**
 * Tools as a dropdown anchored to its header button: reachable at any point of the conversation without hiding it.
 * The menu is positioned in viewport coordinates because the chat frame clips its overflow.
 */
function ToolsMenu({ open, onOpen, onClose, children }: { open: boolean; onOpen: () => void; onClose: () => void; children: ReactNode }) {
  const trigger = useRef<HTMLButtonElement>(null), menu = useRef<HTMLDivElement>(null), id = useId();
  const [place, setPlace] = useState<{ top: number; right: number }>();
  const items = () => [...(menu.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])];
  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const measure = () => {
      const box = trigger.current?.getBoundingClientRect();
      if (box) setPlace({ top: box.bottom + 8, right: Math.max(8, window.innerWidth - box.right) });
    };
    measure();
    nextFrame(() => items()[0]?.focus({ preventScroll: true }));
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menu.current?.contains(target) && !trigger.current?.contains(target)) onClose();
    };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', measure);
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', measure); };
  }, [open]);
  const dismiss = (restore: boolean) => { onClose(); if (restore) nextFrame(() => trigger.current?.focus({ preventScroll: true })); };
  return <>
    <button ref={trigger} type="button" className="parity-ai-toolsTrigger" aria-label="Herramientas" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => (open ? dismiss(false) : onOpen())}>
      <FoxmindIcon name="spark"/><span>Herramientas</span><FoxmindIcon name="chevron-down"/>
    </button>
    {open && <div ref={menu} id={id} role="group" aria-label="Herramientas" className={`${s.toolsMenu} parity-ai-toolsMenu`}
      style={place ? { top: place.top, right: place.right } : undefined}
      onKeyDown={event => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); dismiss(true); return; }
        if (event.key === 'Tab') { onClose(); return; }
        const list = items(), at = list.indexOf(document.activeElement as HTMLButtonElement);
        const next = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: list.length - 1 }[event.key];
        if (next === undefined || !list.length) return;
        event.preventDefault();
        list[(next + list.length) % list.length]?.focus();
      }}
      // Choosing a tool closes the menu; the tool decides where focus goes next (usually the composer).
      onClick={event => { const chosen = (event.target as HTMLElement).closest('button'); if (chosen && !chosen.disabled) onClose(); }}>
      {children}
    </div>}
  </>;
}

export function FoxyChatLayout({ view, onView, history, historyKey, historyOpenKey, tools, creations, creationsCount, context, onNew, newDisabled, aside, asideMini, asideFoldKey, asideLabel, panel, panelLabel, children }: {
  view: ChatView; onView: (view: ChatView) => void; history: ReactNode; historyKey?: string; historyOpenKey?:number;
  tools: ReactNode; creations: ReactNode; creationsCount?: number; context?: ReactNode;
  onNew?: () => void; newDisabled?: boolean;
  /** Workbench: an optional rail beside the chat (wide screens) and an optional panel with the open creation. */
  aside?: ReactNode; asideLabel?: string; panel?: ReactNode; panelLabel?: string;
  /** Folded rail: a narrow strip shown instead of the rail; the fold is remembered on this device under asideFoldKey. */
  asideMini?: ReactNode; asideFoldKey?: string;
  children: ReactNode;
}) {
  const [historyVisible, setHistoryVisible] = useState(false);
  const [folded, setFolded] = useFoldedRail(asideMini ? asideFoldKey : undefined);
  const railFolded = !!asideMini && folded;
  useEffect(() => {
    window.dispatchEvent?.(new Event('foxmind:chat-enter'));
    return () => { window.dispatchEvent?.(new Event('foxmind:chat-exit')); };
  }, []);
  useEffect(() => setHistoryVisible(false), [historyKey]);
  useEffect(() => { if(historyOpenKey) setHistoryVisible(true); }, [historyOpenKey]);
  const close = () => { setHistoryVisible(false); onView('chat'); };
  const tray = historyVisible ? 'history' : view === 'creations' ? 'creations' : null;
  const fold = (next: boolean) => {
    setFolded(next);
    nextFrame(() => document.querySelector<HTMLButtonElement>(`[data-rail-fold="${next ? 'open' : 'close'}"]`)?.focus({ preventScroll: true }));
  };
  return <section className={`${s.compact} parity-ai-chat`} aria-label="Conversación con Foxy">
    <header className={`${s.compactBar} parity-ai-compactBar`}>
      <div className={`${s.compactContext} parity-ai-compactContext`}><button type="button" className="parity-chat-mobile-menu" aria-label="Abrir menú de navegación" onClick={()=>window.dispatchEvent?.(new Event('foxmind:chat-menu'))}><FoxmindIcon name="menu"/></button>{context}</div>
      <nav className={`${s.shortcuts} parity-ai-shortcuts`} aria-label="Recursos de Foxy">
        <button type="button" aria-haspopup="dialog" aria-label="Historial" aria-expanded={tray === 'history'} onClick={() => { onView('chat'); setHistoryVisible(true); }}>
          <FoxmindIcon name="clock"/><span>Historial</span>
        </button>
        <ToolsMenu open={view === 'tools' && !historyVisible} onOpen={() => { setHistoryVisible(false); onView('tools'); }} onClose={() => onView('chat')}>{tools}</ToolsMenu>
        <button type="button" aria-haspopup="dialog" aria-label="Creaciones" aria-expanded={tray === 'creations'} onClick={() => { setHistoryVisible(false); onView('creations'); }}>
          <FoxmindIcon name="foxy-folder"/><span>Creaciones</span>{creationsCount !== undefined && <b className="parity-ai-creationCount">{creationsCount}</b>}
        </button>
      </nav>
      {onNew && <button className={`${s.newChat} parity-ai-newChat`} type="button" aria-label="Nuevo chat" disabled={newDisabled} onClick={() => { close(); onNew(); }}>
        <FoxmindIcon name="plus"/><span>Nuevo chat</span>
      </button>}
    </header>
    {aside || panel
      ? <div className={`${s.compactBody} ${s.workbench} parity-ai-compactBody parity-ai-workbench`} data-panel={panel ? 'open' : undefined} data-rail={railFolded ? 'folded' : undefined}>
        {aside && (railFolded
          ? <aside className={`${s.rail} ${s.railMini} parity-ai-rail parity-ai-railMini`} aria-label={`${asideLabel ?? 'Tu espacio'} (plegado)`}>
            <button type="button" className="parity-ai-railFold" data-rail-fold="open" aria-expanded={false} aria-label="Desplegar el panel" title="Desplegar el panel" onClick={() => fold(false)}>
              <FoxmindIcon name="chevron-right"/>
            </button>
            {asideMini}
          </aside>
          : <aside className={`${s.rail} parity-ai-rail`} aria-label={asideLabel ?? 'Tu espacio'}>
            {asideMini && <button type="button" className="parity-ai-railFold" data-rail-fold="close" aria-expanded aria-label="Plegar el panel para darle más espacio al chat" title="Plegar el panel" onClick={() => fold(true)}>
              <FoxmindIcon name="chevron-right"/>
            </button>}
            {aside}
          </aside>)}
        <div className={`${s.workbenchMain} parity-ai-workbenchMain`}>{children}</div>
        {panel && <section className={`${s.panel} parity-ai-panel`} aria-label={panelLabel ?? 'Creación abierta'}>{panel}</section>}
      </div>
      : <div className={`${s.compactBody} parity-ai-compactBody`}>{children}</div>}
    {tray && <FoxyDialog title={tray === 'history' ? 'Tu historial' : 'Tus creaciones'}
      description={tray === 'history' ? 'Volvé a una conversación o empezá una nueva.' : 'Ideas guardadas para seguir trabajando.'}
      onClose={close} focusTitle className={`${s.dialog} parity-ai-tray tray-${tray}`}
      footer={<button type="button" onClick={close}><FoxmindIcon name="arrow-left"/>Volver al chat</button>}>
      {tray === 'history' ? <div onClick={event => {
        if ((event.target as HTMLElement).closest('button[data-foxy-thread],button[data-foxy-rename]')) close();
      }}>{history}</div> : creations}
    </FoxyDialog>}
  </section>;
}
