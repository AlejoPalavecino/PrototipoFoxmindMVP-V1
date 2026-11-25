import s from '../../ui/study.module.css';
import { Notice } from '../../../../../../shared-ui/feedback';
import type { ChatIdentity } from '../../../../../../shared-ui/FoxyChatLayout';
import type { useChatFollow } from '../../../../../../shared-ui/use-chat-follow';
import type {
  StudyDetail,
  StudyTurn,
  StudyCreation,
  StudyConversation as Conversation,
} from '../../model/study-contracts.ts';
import type {
  StudyGenerationPresentation,
  StudyChatPresentation,
} from '../../workspace/study-chat-presentation';
import { StudyChatWelcome } from './study-chat-welcome';
import { StudyMessageList } from './study-message-list';
import { StudyChatProgress } from './study-chat-progress';
import { StudyChatComposer } from './study-chat-composer';
import { StudyToolChips } from '../../tools/study-tool-chips';
export function StudyConversation({
  identity,
  current,
  detail,
  messages,
  generation,
  chat,
  busy,
  active,
  follow,
  text,
  folderName,
  attachmentsBusy,
  sourceCount,
  onPrompt,
  onText,
  onCreation,
  onPractice,
  onExam,
  onSources,
  onReload,
  onLibrary,
  onAttach,
  onTool,
}: {
  identity?: ChatIdentity;
  current?: Pick<Conversation, 'id' | 'sourceUnavailable'>;
  detail: Pick<StudyDetail, 'creations' | 'practices' | 'exams'> & { imageGenerationAvailable?: boolean };
  messages: StudyTurn[];
  generation: StudyGenerationPresentation;
  chat: StudyChatPresentation;
  busy: boolean;
  active: boolean;
  follow: ReturnType<typeof useChatFollow>;
  text: string;
  folderName: string;
  attachmentsBusy: boolean;
  sourceCount: number;
  onPrompt: (value: string) => void;
  onText: (value: string) => void;
  onCreation: (value: StudyCreation | undefined) => void;
  onPractice: (id: string) => void;
  onExam: (id: string) => void;
  onSources: (refs: NonNullable<StudyTurn['sourceRefs']>) => void;
  onReload: () => void;
  onLibrary: (launcher: HTMLButtonElement) => void;
  onAttach: (id: string, file: File, copy: boolean) => Promise<void>;
  onTool?: (tool: { kind: string; title: string }) => void;
}) {
  const { pending } = chat;
  return (
    <section className={`${s.chat} parity-ai-conversation`} aria-label="Conversación con Foxy">
      {current?.sourceUnavailable && (
        <Notice>
          Una fuente de esta conversación ya no está disponible. El historial se conserva.
        </Notice>
      )}
      <div
        className={`${s.messages} parity-ai-messages`}
        ref={follow.ref}
        onScroll={follow.onScroll}
        aria-label="Mensajes con Foxy"
      >
        {!messages.length && !pending && !generation.local ? (
          <StudyChatWelcome onPrompt={onPrompt} />
        ) : (
          <StudyMessageList
            identity={identity}
            detail={detail}
            messages={messages}
            generation={generation}
            busy={busy}
            active={active}
            onCreation={onCreation}
            onPractice={onPractice}
            onExam={onExam}
            onSources={onSources}
            onReload={onReload}
            sourceCount={sourceCount}
            onAddMaterial={onLibrary}
          />
        )}
        <StudyChatProgress
          identity={identity}
          generation={generation}
          current={current}
          busy={busy}
          active={active}
          chat={chat}
        />
      </div>
      {follow.unread && (
        <button type="button" onClick={follow.jump}>
          Ver mensajes nuevos ↓
        </button>
      )}
      {onTool && (
        <StudyToolChips
          disabled={busy || !active || generation.blocked}
          imageGenerationAvailable={detail.imageGenerationAvailable}
          onChoose={onTool}
        />
      )}
      <StudyChatComposer
        text={text}
        pending={pending}
        busy={busy}
        active={active}
        generationBlocked={generation.blocked}
        attachmentsBusy={attachmentsBusy}
        sourceCount={sourceCount}
        folderName={folderName}
        onText={onText}
        onSend={chat.send}
        onLibrary={onLibrary}
        onAttach={onAttach}
      />
      <p className={`${s.chatDisclaimer} parity-ai-chatDisclaimer`}>
        Foxy puede equivocarse. Revisá sus propuestas.
      </p>
    </section>
  );
}
