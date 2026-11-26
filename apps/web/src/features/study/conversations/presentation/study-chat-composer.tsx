import { FoxmindIcon } from '../../../../../../shared-ui/FoxmindIcon';
import s from '../../ui/study.module.css';
import { ChatAttachmentButton } from '../../../../../../shared-ui/ChatAttachmentControls';

/** While a tool is open, the composer writes its brief and its submit button runs the tool. */
export type StudyComposerTool = {
  action: string;
  placeholder: string;
  value: string;
  disabled: boolean;
  onValue: (value: string) => void;
  onSubmit: () => void;
};

export function StudyChatComposer({
  text,
  pending,
  busy,
  active,
  generationBlocked,
  attachmentsBusy,
  sourceCount,
  folderName,
  topics = [],
  tool,
  onText,
  onSend,
  onLibrary,
  onAttach,
  onDropTopic,
  onChooseTopics,
}: {
  text: string;
  pending: string | null;
  busy: boolean;
  active: boolean;
  generationBlocked: boolean;
  attachmentsBusy: boolean;
  sourceCount: number;
  folderName: string;
  /** Topics Foxy will use in the next request, shown as removable chips. */
  topics?: { id: string; title: string }[];
  tool?: StudyComposerTool;
  onText: (value: string) => void;
  onSend: () => Promise<void>;
  onLibrary: (launcher: HTMLButtonElement) => void;
  onAttach: (id: string, file: File, copy: boolean) => Promise<void>;
  onDropTopic?: (id: string) => void;
  onChooseTopics?: (launcher: HTMLButtonElement) => void;
}) {
  const value = tool ? tool.value : text;
  const locked = !active || !!pending || generationBlocked;
  const canSubmit = tool
    ? !tool.disabled && !locked && !busy && !attachmentsBusy
    : !!text.trim() && !locked && !busy && !attachmentsBusy;
  return (
    <form
      className={`${s.composer} parity-ai-composer${tool ? ' study-composer-tool' : ''}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (tool) { if (canSubmit) tool.onSubmit(); return; }
        void onSend();
      }}
    >
      {onDropTopic && (
        <div className="study-composer-topics">
          <span>Temas:</span>
          {topics.length ? topics.map((topic) => (
            <span key={topic.id} className="study-composer-topic">
              {topic.title}
              <button type="button" aria-label={`Quitar ${topic.title}`} disabled={locked} onClick={() => onDropTopic(topic.id)}>
                <FoxmindIcon name="close" />
              </button>
            </span>
          )) : <span className="study-composer-topic muted">Todos los temas</span>}
          {onChooseTopics && (
            <button type="button" className="study-composer-change" aria-haspopup="dialog" onClick={(event) => onChooseTopics(event.currentTarget)}>
              Cambiar
            </button>
          )}
        </div>
      )}
      <label htmlFor="study-message" className={`${s.sr} parity-ai-sr`}>
        {tool ? `Indicaciones para ${tool.action.toLowerCase()}` : 'Tu mensaje para Foxy'}
      </label>
      <textarea
        id="study-message"
        value={value}
        onChange={(e) => (tool ? tool.onValue(e.target.value) : onText(e.target.value))}
        maxLength={tool ? 1500 : 5000}
        disabled={locked}
        placeholder={tool ? tool.placeholder : '¿Qué te gustaría entender mejor?'}
        rows={tool ? 2 : 3}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (canSubmit) e.currentTarget.form?.requestSubmit();
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
        <button type="submit" className={`${s.primary} parity-ai-primary`} disabled={!canSubmit}>
          {tool ? tool.action : 'Enviar'} <FoxmindIcon name="arrow-right" />
        </button>
      </div>
    </form>
  );
}
