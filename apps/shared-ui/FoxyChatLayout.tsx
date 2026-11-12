import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccountAvatar } from './AccountAvatar';
import { Dialog } from './feedback';
import { FoxmindIcon } from './FoxmindIcon';
import s from './foxy-chat-layout.module.css';

export type ChatIdentity = { avatarKey?: string; initials: string };
export type ChatView = 'chat' | 'tools' | 'creations';

export function ChatByline({ user, identity }: { user?: boolean; identity?: ChatIdentity }) {
  return <div className={`${s.byline} ${user ? s.user : ''}`}>
    {user ? <><span>Vos</span><AccountAvatar {...(identity ?? { initials: 'V' })}/></>
      : <><img src="/brujula/foxy-logotipo-redondo.webp" alt="" width={32} height={32}/><span>Foxy</span></>}
  </div>;
}

export function FoxyChatLayout({ view, onView, history, historyKey, tools, creations, children }: {
  view: ChatView; onView: (view: ChatView) => void; history: ReactNode; historyKey?: string;
  tools: ReactNode; creations: ReactNode; children: ReactNode;
}) {
  const [historyVisible, setHistoryVisible] = useState(true);
  const [historyDialog, setHistoryDialog] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const historyButton = useRef<HTMLButtonElement>(null);
  const expandButton = useRef<HTMLButtonElement>(null);

  useEffect(() => setHistoryDialog(false), [historyKey]);
  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented && !document.querySelector('dialog[open]')) {
        setExpanded(false);
        expandButton.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [expanded]);

  return <div className={`${s.layout} ${!historyVisible ? s.noHistory : ''} ${expanded ? s.expanded : ''}`}>
    {historyVisible && !expanded && <aside className={s.history} aria-label="Historial de conversaciones">
      <header><h2>Historial</h2><button type="button" aria-label="Cerrar historial" onClick={() => {
        setHistoryVisible(false);
        historyButton.current?.focus();
      }}><FoxmindIcon name="close"/> Ocultar</button></header>
      <div className={s.historyContent}>{history}</div>
      <footer className={s.historyNote}><FoxmindIcon name="lock"/><span><strong>Un espacio solo tuyo</strong><small>Tus conversaciones son privadas.</small></span></footer>
    </aside>}
    <section className={s.workarea} aria-label="Espacio Foxy">
      <nav className={s.tabs} aria-label="Vistas de Foxy">
        {!expanded && <button type="button" ref={historyButton} onClick={() => {
          if (matchMedia('(max-width: 900px)').matches) setHistoryDialog(true);
          else setHistoryVisible(visible => !visible);
        }}><FoxmindIcon name="menu"/>Historial</button>}
        <button type="button" aria-current={view === 'chat' ? 'page' : undefined} onClick={() => onView('chat')}>Chat</button>
        <button type="button" aria-current={view === 'tools' ? 'page' : undefined} onClick={() => onView('tools')}>Herramientas</button>
        <button type="button" aria-current={view === 'creations' ? 'page' : undefined} onClick={() => onView('creations')}>Creaciones</button>
      </nav>
      <div hidden={view !== 'chat'} className={s.chatPanel}>
        <button ref={expandButton} className={s.expand} type="button" onClick={() => setExpanded(value => !value)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d={expanded ? 'M3 8h5V3m13 5h-5V3M3 16h5v5m13-5h-5v5' : 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5'}/>
          </svg>
          <span>{expanded ? 'Volver a la vista normal' : 'Ampliar chat'}</span>
        </button>
        <span className={s.private}><FoxmindIcon name="lock"/>Chat privado</span>
        {children}
      </div>
      {view !== 'chat' && <div className={s.gallery}>{view === 'tools' ? tools : creations}</div>}
    </section>
    {historyDialog && <Dialog labeledClose title="Historial" onClose={() => setHistoryDialog(false)} className={s.dialog}>{history}</Dialog>}
  </div>;
}
