import type { ReactNode } from 'react';
import { AsyncFeedback } from '../../../../../shared-ui/AsyncFeedback';
import { FoxmindIcon } from '../../../../../shared-ui/index.ts';
import { ChatByline, type ChatIdentity } from '../../../../../shared-ui/FoxyChatLayout';
import { FoxyMarkdown } from '../../../../../shared-ui/markdown';
import type { useChatFollow } from '../../../../../shared-ui/use-chat-follow';
import type { FoxyTurn } from '../api/foxy-client.ts';
import type { ToolMode } from '../tools/foxy-tool-options.ts';
import type { FoxyChatState, FoxyChatActions } from './foxy-chat-view-types.ts';
import { FoxyWait } from './foxy-wait.tsx';
import { FoxyWelcome } from './foxy-welcome.tsx';
import styles from '../workspace/foxy-workspace.module.css';

export function renderFoxyTranscript({ state, chatFollow, pendingVisible, visualTimeline, tool, chooseExample, identity,
  onOpenResource, controller, attachmentCount, pendingText, setText, onSources, enabled, mode }: {
  state: FoxyChatState; chatFollow: ReturnType<typeof useChatFollow>; pendingVisible: boolean;
  visualTimeline?: ReactNode; tool?: { label: string; placeholder: string }; chooseExample: (text: string) => void;
  identity?: ChatIdentity; onOpenResource?: (conversationId: string, turnId: string) => void;
  controller: FoxyChatActions; attachmentCount: number; pendingText?: string;
  setText: (text: string) => void; onSources: (turn: FoxyTurn) => void; enabled: boolean; mode: ToolMode | null;
}) {
  return <>
          <p className={`${styles.srOnly} parity-ai-srOnly`} role="status">{!state.activeTurn&&!state.pending&&state.turns.at(-1)?.state==='READY'?'Respuesta de Foxy lista para leer.':''}</p><div className={`${styles.transcript} parity-ai-transcript`} ref={chatFollow.ref} onScroll={chatFollow.onScroll} aria-label="Mensajes con Foxy">
            {!state.turns.length && !state.activeTurn && !pendingVisible && !visualTimeline ? <FoxyWelcome tool={tool} onExample={chooseExample} /> : null}
            {state.turns.map(turn => <article className={`${styles.turn} parity-ai-turn`} key={turn.id}>
            <div className={`${styles.request} parity-ai-request`}><ChatByline user identity={identity}/><p>{turn.message}</p></div>
            {turn.answer ? <div className={`${styles.answer} parity-ai-answer`}><ChatByline/>
              {turn.state === 'READY' && turn.purpose !== 'CHAT' && onOpenResource ? <div className="parity-foxy-creationReply"><p>Tu propuesta está lista. Abrila para revisarla y darle tu mirada.</p><button type="button" onClick={() => onOpenResource(state.current!.id, turn.id)}><FoxmindIcon name="file"/>Abrir creación</button></div> : <>{turn.purpose !== 'CHAT' && <h4>{turn.answer.title}</h4>}<div className={`${styles.chatMarkdown} parity-ai-chatMarkdown`}><FoxyMarkdown markdown={turn.answer.markdown}/></div></>}
              {turn.answer.warnings?.map((warning, i) => <p key={i}>{warning}</p>)}
              {turn.answer.missingInformation?.map((missing, i) => <p key={i}>{missing}</p>)}
</div>
              : turn.state === 'CANCELLED' ? <p role="status">Detuviste la respuesta. <button type="button" onClick={()=>setText(turn.message)}>Retomar mensaje</button></p>
              : turn.state === 'FAILED' || turn.state === 'STALE' ? <p role="status">No se pudo completar esta respuesta. Podés revisar tu mensaje y hacer una nueva solicitud.</p> : <FoxyWait queued={turn.state==='QUEUED'} generating={turn.purpose!=='CHAT'} title={turn.state==='QUEUED'?'Tu solicitud está en cola':turn.purpose==='CHAT'?'Conectando las ideas':'Dándole forma a la propuesta'} onStop={()=>void controller.cancel?.()} disabled={state.busy}/>}
            {turn.state === 'READY' && (turn.classroomSources || attachmentCount>0 || !!state.citations?.[turn.id]?.length) && <button type="button" className="parity-foxy-sourceNote" aria-haspopup="dialog" onClick={() => onSources(turn)}><FoxmindIcon name="book"/>{turn.classroomSources?`Plan de estudio · ${turn.classroomSources.used.length} fuentes`:'Materiales de esta respuesta'}</button>}
          </article>)}
          {pendingVisible&&<article className={`${styles.turn} parity-ai-turn`}><div className={`${styles.request} parity-ai-request`}><ChatByline user identity={identity}/><p>{pendingText}</p></div>{state.error?<p role="status">Envío sin confirmar. Tu mensaje se conserva; usá Reintentar envío.</p>:<FoxyWait title={state.pending?'Enviando tu mensaje':state.activeTurn?.state==='QUEUED'?'Tu solicitud está en cola':'Leyendo tu pregunta'} onStop={state.activeTurn?()=>void controller.cancel?.():undefined} disabled={state.busy}/>}</article>}
          {state.activeTurn&&!state.turns.some(t=>t.id===state.activeTurn?.id)&&(!pendingVisible||!!state.error)&&<FoxyWait title={state.activeTurn.state==='QUEUED'?'Tu solicitud está en cola':'Conectando las ideas'} onStop={()=>void controller.cancel?.()} disabled={state.busy}/>}
          {state.busy&&!pendingVisible&&!state.activeTurn&&<AsyncFeedback compact title="Cargando conversación…"/>}{visualTimeline}</div>
          {chatFollow.unread&&<button type="button" onClick={chatFollow.jump}>Ver mensajes nuevos ↓</button>}
          {state.nextAfterSequence !== null ? <button type="button" disabled={state.busy} onClick={() => void controller.loadMore()}>Más mensajes</button> : null}
          {!enabled ? <p>{mode === 'DIAGRAM' ? 'La generación de esquemas no está disponible en este momento.' : 'La generación de texto no está disponible en este momento.'}</p> : null}
        </>;
}
