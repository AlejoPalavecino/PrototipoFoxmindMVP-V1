import type { ChangeEvent, KeyboardEvent, RefObject } from 'react';
import { Send, Paperclip, Mic, Sparkles, CornerUpLeft, X, FileText } from 'lucide-react';
import type { Conversation, DirectMessageItem, MessageAttachment } from '../../types';

interface MessageComposerProps {
  activeConversationTitle: Conversation['title'];
  quickTemplates: { label: string; text: string; tag: string }[];
  sampleAttachments: MessageAttachment[];
  inputText: string;
  replyingTo: DirectMessageItem | null;
  attachedFile: MessageAttachment | null;
  isRecordingAudio: boolean;
  recordingSeconds: number;
  showAttachmentPicker: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onTemplateClick: (template: MessageComposerProps['quickTemplates'][number]) => void;
  onClearReply: () => void;
  onClearFile: () => void;
  onRecordCancel: () => void;
  onVoiceSend: () => void;
  onTogglePicker: () => void;
  onSelectAttachment: (attachment: MessageAttachment) => void;
  onRecordStart: () => void;
  onTextChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
}

export function MessageComposer({
  activeConversationTitle, quickTemplates, sampleAttachments, inputText, replyingTo,
  attachedFile, isRecordingAudio, recordingSeconds, showAttachmentPicker, textareaRef,
  onTemplateClick, onClearReply, onClearFile, onRecordCancel, onVoiceSend, onTogglePicker,
  onSelectAttachment, onRecordStart, onTextChange, onKeyDown, onSend,
}: MessageComposerProps) {
  return (
    <>
      {/* Quick Prompt Chips Bar */}
      <div className="px-4 py-2 border-t border-fox-border bg-fox-surface/80 flex items-center gap-2 overflow-x-auto hide-scrollbar">
        <span className="text-[11px] font-bold text-fox-text-muted whitespace-nowrap flex items-center gap-1">
          <Sparkles size={12} className="text-fox-primary" /> Respuestas rápidas:
        </span>
        {quickTemplates.map((t, idx) => (
          <button
            key={idx}
            onClick={() => onTemplateClick(t)}
            className="px-3 py-1 rounded-xl text-xs font-bold bg-fox-bg border border-fox-border text-fox-text-main hover:bg-fox-primary/10 hover:border-fox-primary/30 transition-colors whitespace-nowrap"
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Composer Input Area */}
      <div className="p-4 bg-fox-surface border-t border-fox-border shrink-0 space-y-2">
        {/* Active Reply Banner */}
        {replyingTo && (
          <div className="bg-fox-bg border border-fox-border rounded-2xl p-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <CornerUpLeft size={14} className="text-fox-primary shrink-0" />
              <div className="min-w-0">
                <span className="font-bold text-fox-text-main">Respondiendo a {replyingTo.senderName}:</span>
                <p className="text-fox-text-muted truncate">{replyingTo.text}</p>
              </div>
            </div>
            <button
              onClick={onClearReply}
              className="p-1 rounded-lg text-fox-text-muted hover:text-fox-text-main hover:bg-fox-surface"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Active Attached File Banner */}
        {attachedFile && (
          <div className="bg-fox-primary/10 border border-fox-primary/30 rounded-2xl p-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <FileText size={16} className="text-fox-primary shrink-0" />
              <div className="min-w-0">
                <span className="font-bold text-fox-text-main">{attachedFile.name}</span>
                <span className="text-fox-text-muted text-[10px] ml-2">{attachedFile.size}</span>
              </div>
            </div>
            <button
              onClick={onClearFile}
              className="p-1 rounded-lg text-fox-text-muted hover:text-fox-text-main hover:bg-fox-surface"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Voice Recorder Active Bar */}
        {isRecordingAudio ? (
          <div className="flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-2xl p-3 animate-pulse">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
              <span className="text-sm font-bold text-red-600">
                Grabando nota de voz... 0:{recordingSeconds < 10 ? '0' : ''}{recordingSeconds}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onRecordCancel}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-fox-text-muted hover:bg-fox-bg"
              >
                Cancelar
              </button>
              <button
                onClick={onVoiceSend}
                className="px-4 py-1.5 rounded-xl text-xs font-bold bg-fox-primary text-white hover:bg-fox-primary/90 flex items-center gap-1.5 shadow-sm"
              >
                <Send size={13} /> Enviar Audio
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-end gap-2 bg-fox-bg border border-fox-border rounded-2xl p-2 focus-within:ring-2 focus-within:ring-fox-primary/30 transition-all shadow-inner">
            {/* Attachment trigger */}
            <div className="relative">
              <button
                onClick={onTogglePicker}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-fox-text-muted hover:text-fox-primary hover:bg-fox-surface transition-colors"
                title="Adjuntar archivo (PDF, Imagen, TP)"
              >
                <Paperclip size={18} />
              </button>

              {/* Attachment Selector Dropdown */}
              {showAttachmentPicker && (
                <div className="absolute bottom-full mb-2 left-0 w-64 bg-fox-surface border border-fox-border rounded-2xl shadow-xl p-2 z-30 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-fox-text-muted px-2 py-1">
                    Seleccionar Archivo
                  </p>
                  {sampleAttachments.map(att => (
                    <button
                      key={att.id}
                      onClick={() => onSelectAttachment(att)}
                      className="w-full text-left p-2 rounded-xl text-xs hover:bg-fox-bg flex items-center gap-2 text-fox-text-main"
                    >
                      <FileText size={14} className="text-fox-primary shrink-0" />
                      <div className="truncate min-w-0">
                        <p className="truncate font-bold">{att.name}</p>
                        <p className="text-[10px] text-fox-text-muted">{att.size}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Voice note trigger */}
            <button
              onClick={onRecordStart}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-fox-text-muted hover:text-fox-primary hover:bg-fox-surface transition-colors"
              title="Grabar nota de voz"
            >
              <Mic size={18} />
            </button>

            {/* Text Input */}
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={onTextChange}
              onKeyDown={onKeyDown}
              placeholder={`Escribe a ${activeConversationTitle}... (Enter para enviar)`}
              className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[44px] py-3 text-xs sm:text-sm text-fox-text-main outline-none px-2 font-medium placeholder:text-fox-text-muted/60"
              rows={1}
            />

            {/* Send Button */}
            <button
              onClick={onSend}
              disabled={!inputText.trim() && !attachedFile}
              className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-all ${
                inputText.trim() || attachedFile
                  ? 'bg-fox-orange hover:bg-fox-orange/90 text-white shadow-md active:scale-95'
                  : 'bg-fox-border text-fox-text-muted/40 cursor-not-allowed'
              }`}
              title="Enviar mensaje"
            >
              <Send size={16} className="ml-0.5" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
