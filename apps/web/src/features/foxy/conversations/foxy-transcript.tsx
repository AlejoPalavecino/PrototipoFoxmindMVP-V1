import { Fragment, type ReactNode } from 'react';
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
import { formatFoxyModelMarkdown } from './foxy-markdown-format';
import { FoxyVisualTimeline, type FoxyVisualTranscript } from '../visuals/foxy-visual-workspace';
import styles from '../workspace/foxy-workspace.module.css';

function failureMessage(turn: FoxyTurn) {
  if (turn.state === 'STALE') return 'El contexto de esta consulta cambió. Revisá los temas y las fuentes antes de enviarla de nuevo.';
  if (turn.errorCode === 'AI_BUDGET_EXCEEDED') return 'Se agotó el cupo de IA. Podés volver a intentar cuando se renueve.';
  if (turn.errorCode === 'AI_INPUT_LIMIT') return 'El contexto supera el límite. Elegí menos temas o fuentes y volvé a enviar.';
  if (turn.errorCode === 'AI_RATE_LIMITED') return 'El proveedor de IA está recibiendo muchas solicitudes. Volvé a intentar en unos minutos.';
  return 'No se pudo completar esta respuesta. Podés revisar tu mensaje y hacer una nueva solicitud.';
}

export function renderFoxyTranscript({ state, chatFollow, pendingVisible, visualTimeline, tool, chooseExample, identity,
  onOpenResource, onActivityHandoff, controller, attachmentCount, pendingText, setText, onSources, enabled, mode }: {
  state: FoxyChatState; chatFollow: ReturnType<typeof useChatFollow>; pendingVisible: boolean;
  visualTimeline?: FoxyVisualTranscript; tool?: { label: string; placeholder: string }; chooseExample: (text: string) => void;
  identity?: ChatIdentity;
  onOpenResource?: (conversationId: string, turnId: string) => void;
  onActivityHandoff?: (conversationId: string, turnId: string, mode: 'ACTIVITY'|'RUBRIC') => void;
  controller: FoxyChatActions; attachmentCount: number; pendingText?: string;
  setText: (text: string) => void; onSources: (turn: FoxyTurn) => void; enabled: boolean; mode: ToolMode | null;
}) {
  const canStop = !state.busy;
  const unreadActive = state.activeTurn && !state.turns.some(turn => turn.id === state.activeTurn?.id) ? state.activeTurn : null;
  const entries: { key: string; at: string; body: ReactNode }[] = state.turns.map(turn => ({
    key: turn.id, at: turn.createdAt,
    body: <article className={styles.turn + ' parity-ai-turn'}>
      <div className={styles.request + ' parity-ai-request'}><ChatByline user identity={identity}/><p>{turn.message}</p></div>
      {turn.answer ? <div className={styles.answer + ' parity-ai-answer'}><ChatByline/>
        {turn.state === 'READY' && turn.purpose !== 'CHAT' && onOpenResource && turn.answer.markdown.trim()
          ? <div className="parity-foxy-creationReply"><p>Tu propuesta está lista. Abrila para revisarla y darle tu mirada.</p>
            <button type="button" onClick={() => onOpenResource(state.current!.id, turn.id)}><FoxmindIcon name="file"/>Abrir creación</button>
            {onActivityHandoff && turn.purpose === 'RUBRIC' && <button type="button" onClick={() => onActivityHandoff(state.current!.id, turn.id, 'RUBRIC')}>Usar rúbrica en una actividad</button>}
            {onActivityHandoff && turn.purpose === 'ACTIVITY_IDEAS' && <button type="button" onClick={() => onActivityHandoff(state.current!.id, turn.id, 'ACTIVITY')}>Preparar en Actividades</button>}
          </div>
          : <>{turn.purpose !== 'CHAT' && <h4>{turn.answer.title}</h4>}<div className={styles.chatMarkdown + ' parity-ai-chatMarkdown'}><FoxyMarkdown markdown={formatFoxyModelMarkdown(turn.answer.markdown)}/></div></>}
        {turn.answer.warnings?.map((warning, index) => <p key={index}>{warning}</p>)}
        {turn.answer.missingInformation?.map((missing, index) => <p key={index}>{missing}</p>)}
      </div>
      : turn.state === 'CANCELLED' ? <p role="status">Detuviste la respuesta. <button type="button" onClick={() => setText(turn.message)}>Retomar mensaje</button></p>
      : turn.state === 'FAILED' || turn.state === 'STALE' ? <p role="status">{failureMessage(turn)} <button type="button" onClick={() => setText(turn.message)}>Retomar mensaje</button></p>
      : !state.pollError && <FoxyWait queued={turn.state === 'QUEUED'} generating={turn.purpose !== 'CHAT'}
        partialText={turn.state === 'RUNNING' && turn.purpose === 'CHAT' ? turn.partialMarkdown : undefined}
        title={turn.state === 'QUEUED' ? 'Tu solicitud está en cola' : turn.purpose === 'CHAT' ? 'Conectando las ideas' : 'Dándole forma a la propuesta'}
        onStop={() => void controller.cancel?.()} disabled={!canStop}/>}
      {turn.state === 'READY' && (turn.classroomSources || attachmentCount > 0 || !!state.citations?.[turn.id]?.length) &&
        <button type="button" className="parity-foxy-sourceNote" aria-haspopup="dialog" onClick={() => onSources(turn)}><FoxmindIcon name="book"/>{turn.classroomSources ? 'Plan de estudio · ' + turn.classroomSources.used.length + ' fuentes' : 'Materiales de esta respuesta'}</button>}
    </article>,
  }));
  if (visualTimeline) {
    for (const job of visualTimeline.jobs) {
      entries.push({ key: 'visual:' + job.id, at: job.createdAt,
        body: <FoxyVisualTimeline {...visualTimeline} jobs={[job]} pending={null} error={null} identity={identity}/> });
    }
  }
  entries.sort((a, b) => (a.at ?? '').localeCompare(b.at ?? ''));
  // The receipt already identifies the turn. Keep its waiting control mounted when the first full read arrives.
  if (unreadActive) entries.push({ key: unreadActive.id, at: '',
    body: <article className={styles.turn + ' parity-ai-turn'}>
      {pendingVisible && !state.error && <div className={styles.request + ' parity-ai-request'}><ChatByline user identity={identity}/><p>{pendingText}</p></div>}
      {!state.pollError && <FoxyWait title={unreadActive.state === 'QUEUED' ? 'Tu solicitud está en cola' : pendingVisible && !state.error ? 'Leyendo tu pregunta' : 'Conectando las ideas'}
        onStop={() => void controller.cancel?.()} disabled={!canStop}/>}
    </article>,
  });

  return <>
    <p className={styles.srOnly + ' parity-ai-srOnly'} role="status">{!state.activeTurn && !state.pending && state.turns.at(-1)?.state === 'READY' ? 'Respuesta de Foxy lista para leer.' : ''}</p>
    <div className={styles.transcript + ' parity-ai-transcript'} ref={chatFollow.ref} onScroll={chatFollow.onScroll} aria-label="Mensajes con Foxy">
      {!entries.length && !state.activeTurn && !pendingVisible && !visualTimeline?.pending && !visualTimeline?.error && <FoxyWelcome tool={tool} onExample={chooseExample}/>}
      {entries.map(({ key, body }) => <Fragment key={key}>{body}</Fragment>)}
      {pendingVisible && (!unreadActive || state.error) && <article className={styles.turn + ' parity-ai-turn'}>
        <div className={styles.request + ' parity-ai-request'}><ChatByline user identity={identity}/><p>{pendingText}</p></div>
        {state.error ? <p role="status">Envío sin confirmar. Tu mensaje se conserva. Usá Reintentar envío.</p>
          : !state.pollError && <FoxyWait title={state.pending ? 'Enviando tu mensaje' : state.activeTurn?.state === 'QUEUED' ? 'Tu solicitud está en cola' : 'Leyendo tu pregunta'}
            onStop={state.activeTurn ? () => void controller.cancel?.() : undefined} disabled={!canStop}/>}
      </article>}
      {state.pollError && state.activeTurn && <div role="status" className="parity-foxy-scopeBanner">
        <div><p>{state.pollError}</p><button type="button" onClick={() => controller.refreshActiveTurn?.()}>Volver a consultar</button>
          <button type="button" disabled={!canStop} onClick={() => void controller.cancel?.()}>Detener</button></div>
      </div>}
      {state.busy && !pendingVisible && !state.activeTurn && <AsyncFeedback compact title="Cargando conversación…"/>}
      {visualTimeline && (visualTimeline.pending || visualTimeline.error) &&
        <FoxyVisualTimeline {...visualTimeline} jobs={[]} identity={identity}/>}
    </div>
    {chatFollow.unread && <button type="button" onClick={chatFollow.jump}>Ver mensajes nuevos ↓</button>}
    {state.nextAfterSequence !== null && <button type="button" disabled={state.busy} onClick={() => void controller.loadMore()}>Más mensajes</button>}
    {!enabled && <p>{mode === 'DIAGRAM' ? 'La generación de esquemas no está disponible en este momento.' : 'La generación de texto no está disponible en este momento.'}</p>}
  </>;
}
