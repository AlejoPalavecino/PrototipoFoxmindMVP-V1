import { FoxmindIcon } from '../../../../../../shared-ui/FoxmindIcon';
import s from '../../ui/study.module.css';
import { Fragment } from 'react';
import { ChatByline, type ChatIdentity } from '../../../../../../shared-ui/FoxyChatLayout';
import { FoxyMarkdown } from '../../../../../../shared-ui/markdown';
import { StudyGenerationStatus } from '../../ui/study-generation-status';
import { studyGenerationResult } from '../../model/study-generation';
import type { StudyDetail, StudyTurn, StudyCreation } from '../../model/study-contracts.ts';
import type { StudyGenerationPresentation } from '../../workspace/study-chat-presentation';
export function StudyMessageList({
  identity,
  detail,
  messages,
  generation,
  busy,
  active,
  onCreation,
  onPractice,
  onSources,
  onReload,
}: {
  identity?: ChatIdentity;
  detail: Pick<StudyDetail, 'creations' | 'practices'>;
  messages: StudyTurn[];
  generation: StudyGenerationPresentation;
  busy: boolean;
  active: boolean;
  onCreation: (value: StudyCreation | undefined) => void;
  onPractice: (id: string) => void;
  onSources: (refs: NonNullable<StudyTurn['sourceRefs']>) => void;
  onReload: () => void;
}) {
  return (
    <>
      {messages.map((message, index) => {
        const result = studyGenerationResult(detail, message),
          request =
            message.generation &&
            generation.requests.find((item) => item.requestId === message.generation!.requestId);
        return (
          <Fragment key={message.id ?? index}>
            <article
              className={
                message.role === 'user'
                  ? `${s.userMessage} parity-ai-userMessage`
                  : `${s.foxyMessage} parity-ai-foxyMessage`
              }
            >
              <ChatByline user={message.role === 'user'} identity={identity} />
              {result ? (
                <button
                  type="button"
                  className="study-exact-generation-result"
                  onClick={() => {
                    if (result.kind === 'creation')
                      onCreation(detail.creations.find((item) => item.id === result.id));
                    else onPractice(result.id);
                  }}
                >
                  <span className="study-exact-tool-icon sky">
                    <FoxmindIcon name={result.kind === 'practice' ? 'edit' : 'file'} />
                  </span>
                  <span>
                    <small>Tu propuesta está lista</small>
                    <strong>{result.title}</strong>
                    <b>Abrir creación</b>
                  </span>
                  <FoxmindIcon name="chevron-right" />
                </button>
              ) : message.creationId || message.practiceId ? (
                <div className="study-exact-generation-notice">
                  <p>No pudimos abrir la propuesta guardada. Volvé a consultar la carpeta.</p>
                  <button onClick={() => onReload()}>Actualizar</button>
                </div>
              ) : (
                <div className={`${s.prose} parity-ai-prose`}>
                  {message.role === 'user' ? (
                    (message.content ?? message.text)
                  ) : (
                    <FoxyMarkdown markdown={message.content ?? message.text ?? ''} />
                  )}
                </div>
              )}
              {message.role !== 'user' && message.sourceRefs?.length ? (
                <div className={`${s.citations} parity-ai-citations`}>
                  <button
                    type="button"
                    aria-haspopup="dialog"
                    onClick={() => onSources(message.sourceRefs ?? [])}
                  >{`Fuentes consultadas · ${message.sourceRefs.length}`}</button>
                </div>
              ) : null}
            </article>
            {request && (
              <StudyGenerationStatus
                request={request}
                disabled={busy || !active || generation.blocked}
                cancelling={generation.cancelling === request.requestId}
                onStop={() => void generation.stop(request.requestId)}
                onRetry={() => void generation.retry(request)}
              />
            )}
          </Fragment>
        );
      })}
    </>
  );
}
