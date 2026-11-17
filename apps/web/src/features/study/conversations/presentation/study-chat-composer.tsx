import { FoxmindIcon } from '../../../../../../shared-ui/FoxmindIcon';
import s from '../../ui/study.module.css';
import { ChatAttachmentButton } from '../../../../../../shared-ui/ChatAttachmentControls';
export function StudyChatComposer({
  text,
  pending,
  busy,
  active,
  generationBlocked,
  attachmentsBusy,
  sourceCount,
  folderName,
  onText,
  onSend,
  onLibrary,
  onAttach,
}: {
  text: string;
  pending: string | null;
  busy: boolean;
  active: boolean;
  generationBlocked: boolean;
  attachmentsBusy: boolean;
  sourceCount: number;
  folderName: string;
  onText: (value: string) => void;
  onSend: () => Promise<void>;
  onLibrary: (launcher: HTMLButtonElement) => void;
  onAttach: (id: string, file: File, copy: boolean) => Promise<void>;
}) {
  return (
    <form
      className={`${s.composer} parity-ai-composer`}
      onSubmit={(e) => {
        e.preventDefault();
        void onSend();
      }}
    >
      <label htmlFor="study-message" className={`${s.sr} parity-ai-sr`}>
        Tu mensaje para Foxy
      </label>
      <textarea
        id="study-message"
        value={text}
        onChange={(e) => onText(e.target.value)}
        maxLength={5000}
        disabled={!active || !!pending || generationBlocked}
        placeholder="¿Qué te gustaría entender mejor?"
        rows={3}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (!busy && active && text.trim()) e.currentTarget.form?.requestSubmit();
          }
        }}
      />
      <div className={`${s.inline} parity-ai-inline`}>
        <div className={`${s.composerTools} parity-ai-composerTools`}>
          <button
            type="button"
            aria-label="Biblioteca"
            aria-haspopup="dialog"
            onClick={(event) => onLibrary(event.currentTarget)}
          >
            <FoxmindIcon name="book" />
            Biblioteca <b className="parity-library-count">{sourceCount}</b>
          </button>
          <ChatAttachmentButton
            iconOnly
            label="Agregar un material a la biblioteca"
            folderName={folderName}
            disabled={attachmentsBusy || busy || !!pending || !active}
            onUpload={onAttach}
          />
        </div>
        <span className="parity-chat-key-hint">
          Enter para enviar · Shift + Enter para otra línea
        </span>
        <button
          className={`${s.primary} parity-ai-primary`}
          disabled={
            !text.trim() || !active || busy || attachmentsBusy || !!pending || generationBlocked
          }
        >
          Enviar <FoxmindIcon name="arrow-right" />
        </button>
      </div>
    </form>
  );
}
