import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { AccountAvatar } from './AccountAvatar';
import { openDialog } from './dialog-focus';
import { FoxmindIcon } from './FoxmindIcon';
import s from './foxy-chat-layout.module.css';

export type ChatIdentity = { avatarKey?: string; initials: string };
export type ChatView = 'chat' | 'tools' | 'creations';

export function ChatByline({ user, identity }: { user?: boolean; identity?: ChatIdentity }) {
  return <div className={`${s.byline} parity-ai-byline ${user ? s.user : ''}`}>
    {user ? <><span>Vos</span><AccountAvatar {...(identity ?? { initials: 'V' })}/></>
      : <><img src="/brujula/foxy-logotipo-redondo.webp" alt="" width={32} height={32}/><span>Foxy</span></>}
  </div>;
}

export function FoxyDialog({ title, description, onClose, children, footer, className = '' }: {
  title: string; description?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null), titleId = useId(), descriptionId = useId();
  useEffect(() => openDialog(ref.current!), []);
  return <dialog ref={ref} className={`p5-dialog parity-foxy-dialog ${className}`} aria-labelledby={titleId}
    aria-describedby={description ? descriptionId : undefined} onCancel={event => { if (event.target !== event.currentTarget) return; event.preventDefault(); onClose(); }}>
    <header><div><h2 id={titleId}>{title}</h2>{description && <p id={descriptionId}>{description}</p>}</div>
      <button type="button" className="p5-close" aria-label="Cerrar diálogo" onClick={onClose}><FoxmindIcon name="close"/></button></header>
    <div className="brujula-dialog-body">{children}</div>
    {footer && <footer className="parity-foxy-dialogFooter">{footer}</footer>}
  </dialog>;
}

export function FoxyChatLayout({ view, onView, history, historyKey, historyOpenKey, tools, creations, creationsCount, context, onNew, newDisabled, children }: {
  view: ChatView; onView: (view: ChatView) => void; history: ReactNode; historyKey?: string; historyOpenKey?:number;
  tools: ReactNode; creations: ReactNode; creationsCount?: number; context?: ReactNode;
  onNew?: () => void; newDisabled?: boolean; children: ReactNode;
}) {
  const [historyVisible, setHistoryVisible] = useState(false);
  useEffect(() => {
    window.dispatchEvent?.(new Event('foxmind:chat-enter'));
    return () => { window.dispatchEvent?.(new Event('foxmind:chat-exit')); };
  }, []);
  useEffect(() => setHistoryVisible(false), [historyKey]);
  useEffect(() => { if(historyOpenKey) setHistoryVisible(true); }, [historyOpenKey]);
  const close = () => { setHistoryVisible(false); onView('chat'); };
  const tray = historyVisible ? 'history' : view === 'chat' ? null : view;
  return <section className={`${s.compact} parity-ai-chat`} aria-label="Conversación con Foxy">
    <header className={`${s.compactBar} parity-ai-compactBar`}>
      <div className={`${s.compactContext} parity-ai-compactContext`}><button type="button" className="parity-chat-mobile-menu" aria-label="Abrir menú de navegación" onClick={()=>window.dispatchEvent?.(new Event('foxmind:chat-menu'))}><FoxmindIcon name="menu"/></button>{context}</div>
      <nav className={`${s.shortcuts} parity-ai-shortcuts`} aria-label="Recursos de Foxy">
        <button type="button" aria-haspopup="dialog" aria-label="Historial" aria-expanded={tray === 'history'} onClick={() => { onView('chat'); setHistoryVisible(true); }}>
          <FoxmindIcon name="clock"/><span>Historial</span>
        </button>
        <button type="button" aria-haspopup="dialog" aria-label="Herramientas" aria-expanded={tray === 'tools'} onClick={() => { setHistoryVisible(false); onView('tools'); }}>
          <FoxmindIcon name="spark"/><span>Herramientas</span>
        </button>
        <button type="button" aria-haspopup="dialog" aria-label="Creaciones" aria-expanded={tray === 'creations'} onClick={() => { setHistoryVisible(false); onView('creations'); }}>
          <FoxmindIcon name="foxy-folder"/><span>Creaciones</span>{creationsCount !== undefined && <b className="parity-ai-creationCount">{creationsCount}</b>}
        </button>
      </nav>
      {onNew && <button className={`${s.newChat} parity-ai-newChat`} type="button" aria-label="Nuevo chat" disabled={newDisabled} onClick={() => { close(); onNew(); }}>
        <FoxmindIcon name="plus"/><span>Nuevo chat</span>
      </button>}
    </header>
    <div className={`${s.compactBody} parity-ai-compactBody`}>{children}</div>
    {tray && <FoxyDialog title={tray === 'history' ? 'Tu historial' : tray === 'tools' ? 'Herramientas de Foxy' : 'Tus creaciones'}
      description={tray === 'history' ? 'Volvé a una conversación o empezá una nueva.' : tray === 'tools' ? 'Elegí qué querés preparar. Lo revisamos juntos.' : 'Ideas guardadas para seguir trabajando.'}
      onClose={close} className={`${s.dialog} parity-ai-tray`}
      footer={<button type="button" onClick={close}><FoxmindIcon name="arrow-left"/>Volver al chat</button>}>
      {tray === 'history' ? <div onClick={event => {
        if ((event.target as HTMLElement).closest('button[data-foxy-thread],button[data-foxy-rename]')) close();
      }}>{history}</div> : tray === 'tools' ? tools : creations}
    </FoxyDialog>}
  </section>;
}
