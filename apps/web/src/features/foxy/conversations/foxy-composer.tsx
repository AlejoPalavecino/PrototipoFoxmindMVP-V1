import type { FormEvent, RefObject } from 'react';
import { FoxmindIcon } from '../../../../../shared-ui/index.ts';
import { ChatAttachmentButton } from '../../../../../shared-ui/ChatAttachmentControls';
import type { ToolMode } from '../tools/foxy-tool-options.ts';
import styles from '../workspace/foxy-workspace.module.css';

export function renderFoxyComposer({ onSubmit, tool, mode, setMode, composerRef, text, setText, validMessage, disabled,
  libraryOpen, onLibrary, materialCount, attachmentDisabled, onUpload }: {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  tool?: { label: string; placeholder: string }; mode: ToolMode | null; setMode: (mode: ToolMode | null) => void;
  composerRef: RefObject<HTMLTextAreaElement | null>; text: string; setText: (text: string) => void;
  validMessage: boolean; disabled: boolean; libraryOpen: boolean; onLibrary: () => void;
  materialCount: number; attachmentDisabled: boolean; onUpload: (id: string, file: File) => Promise<void>;
}) {
  return <form className={`${styles.composer} parity-ai-composer`} onSubmit={onSubmit}>

            {tool ? <div className={`${styles.activeMode} parity-ai-activeMode`}><span>{tool.label}</span><button type="button" aria-label="Quitar tipo de ayuda" onClick={() => setMode(null)}>Quitar</button></div> : null}
            <label><span className={`${styles.srOnly} parity-ai-srOnly`}>Tu mensaje</span><textarea ref={composerRef} rows={2} placeholder={tool?.placeholder ?? 'Contame tu idea o preguntame algo…'} value={text} onChange={event => setText(event.target.value)} onKeyDown={event=>{if(event.key==='Enter' && !event.shiftKey && !event.nativeEvent.isComposing){event.preventDefault();if(validMessage&&!disabled)event.currentTarget.form?.requestSubmit();}}} required /></label>
            <div className={`${styles.composerActions} parity-ai-composerActions`}>
              <div className={`${styles.composerTools} parity-ai-composerTools`}>
                <button type="button" aria-label="Biblioteca" aria-haspopup="dialog" aria-expanded={libraryOpen} onClick={onLibrary}><FoxmindIcon name="book"/>Biblioteca <b className="parity-library-count">{materialCount}</b></button>
                <ChatAttachmentButton iconOnly disabled={attachmentDisabled} onUpload={onUpload}/>
              </div>
              <span className="parity-chat-key-hint">Enter para enviar · Shift + Enter para otra línea</span><button type="submit" className="p5-primary" disabled={disabled || !validMessage}>Enviar <FoxmindIcon name="arrow-right" /></button>
            </div>
            {mode === 'RUBRIC' ? <small className={`${styles.rubricHint} parity-ai-rubricHint`}>Propuesta como texto editable. Podés revisarla y usar sus criterios en un borrador de actividad.</small> : null}
          </form>;
}
