import { FoxmindIcon } from '../../../../../../shared-ui/FoxmindIcon';
import s from '../../ui/study.module.css';
import { ChatByline, type ChatIdentity } from '../../../../../../shared-ui/FoxyChatLayout';
import { Notice } from '../../../../../../shared-ui/feedback';
import { AsyncFeedback } from '../../../../../../shared-ui/AsyncFeedback';
import type {
  StudyGenerationPresentation,
  StudyChatPresentation,
} from '../../workspace/study-chat-presentation';
export function StudyChatProgress({
  identity,
  generation,
  current,
  busy,
  active,
  chat,
}: {
  identity?: ChatIdentity;
  generation: StudyGenerationPresentation;
  current?: { id: string };
  busy: boolean;
  active: boolean;
  chat: StudyChatPresentation;
}) {
  const { pending, operation, cancelling, canStop, stop } = chat;
  return (
    <>
      {' '}
      {generation.local &&
        (!generation.local.conversationId ||
          !current ||
          generation.local.conversationId === current.id) && (
          <>
            <article className={`${s.userMessage} parity-ai-userMessage`}>
              <ChatByline user identity={identity} />
              <div className={`${s.prose} parity-ai-prose`}>{generation.local.data.message}</div>
            </article>
            {generation.local.phase === 'SENDING' || generation.local.phase === 'SYNCING' ? (
              <div className="study-exact-generation" role="status">
                <img src="/brujula/foxy-logotipo-redondo.webp" alt="Foxy" />
                <div>
                  <small>Foxy está trabajando en tu idea</small>
                  <strong>
                    {generation.local.phase === 'SYNCING'
                      ? 'Abriendo tu propuesta guardada'
                      : generation.local.conversationId
                        ? 'Preparando tu propuesta'
                        : 'Abriendo tu conversación'}
                  </strong>
                  <span className="study-exact-generation-track" aria-hidden="true" />
                </div>
                {generation.local.phase === 'SENDING' && generation.local.conversationId && (
                  <button
                    disabled={!!generation.cancelling}
                    onClick={() => void generation.stop(generation.local!.requestId)}
                  >
                    {generation.cancelling ? 'Deteniendo…' : 'Detener'}
                  </button>
                )}
              </div>
            ) : (
              <section className="study-exact-generation-notice" role="status">
                <p>
                  {generation.local.phase === 'UNCERTAIN'
                    ? 'No pudimos confirmar el estado de la solicitud. Tu indicación se conserva en esta pantalla.'
                    : generation.local.phase === 'CANCELLED'
                      ? 'La preparación se detuvo. Tu indicación se conserva.'
                      : generation.local.error}
                </p>
                <button
                  disabled={busy || generation.submitting || !active}
                  onClick={() => void generation.retryLocal()}
                >
                  <FoxmindIcon name="refresh" />
                  Reintentar
                </button>
              </section>
            )}
          </>
        )}
      {generation.error && <Notice error>{generation.error}</Notice>}
      {pending && (
        <>
          <article className={`${s.userMessage} parity-ai-userMessage`}>
            <ChatByline user identity={identity} />
            <div className={`${s.prose} parity-ai-prose`}>{pending}</div>
          </article>
          <AsyncFeedback
            compact
            showDelay
            title={operation === 'CHAT' ? 'Procesando tu solicitud' : 'Abriendo tu conversación'}
            detail={operation === 'CHAT' ? 'Tu respuesta va a quedar en este chat.' : undefined}
          />
          <button
            className={`${s.stop} parity-ai-stop`}
            type="button"
            disabled={cancelling || !canStop}
            onClick={() => void stop()}
          >
            Detener
          </button>
        </>
      )}
    </>
  );
}
