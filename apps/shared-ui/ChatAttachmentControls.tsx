import { useRef, useState } from 'react';
import type { ChatAttachment } from '../../src/core/contracts/chat-attachments';
import { AsyncFeedback } from './AsyncFeedback';
import { Dialog, Notice } from './feedback';
import { FoxmindIcon } from './FoxmindIcon';
import s from './foxy-chat-layout.module.css';

export function ChatAttachmentButton({ disabled, folderName, onUpload }: {
  disabled?: boolean; folderName?: string;
  onUpload: (id: string, file: File, copy: boolean) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className={s.attachButton} disabled={disabled} onClick={() => setOpen(true)}>
      <FoxmindIcon name="attach"/><span>Adjuntar</span>
    </button>
    {open && <AttachmentDialog folderName={folderName} onUpload={onUpload} onClose={() => setOpen(false)}/>}
  </>;
}

function AttachmentDialog({ folderName, onUpload, onClose }: {
  folderName?: string; onUpload: (id: string, file: File, copy: boolean) => Promise<void>; onClose: () => void;
}) {
  const [file, setFile] = useState<File>();
  const [copy, setCopy] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const id = useRef<string | undefined>(undefined);
  async function upload() {
    if (!file || busy) return;
    if (!/\.(pdf|docx)$/iu.test(file.name) || file.size < 1 || file.size > 20_000_000) {
      setError('Elegí un PDF o DOCX de hasta 20 MB.');
      return;
    }
    id.current ??= crypto.randomUUID();
    setBusy(true);
    setError('');
    try { await onUpload(id.current, file, copy); onClose(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'No pudimos adjuntar el archivo.'); }
    finally { setBusy(false); }
  }
  return <Dialog labeledClose title="Adjuntar al chat" className={s.dialog} onClose={() => { if (!busy) onClose(); }}>
    <div className={s.attachmentDialog}>
      <p>Foxy podrá usarlo en las próximas respuestas de esta conversación. El archivo es privado.</p>
      <div className={s.uploadZone}>
        <FoxmindIcon name="attach"/>
        <strong>Elegí un documento</strong><small>PDF o DOCX · hasta 20 MB por conversación</small>
        <label className={s.filePicker}><span>Elegir archivo</span>
          <input type="file" accept=".pdf,.docx" disabled={busy} onChange={event => {
            id.current = undefined; setFile(event.target.files?.[0]); setError('');
          }}/>
        </label>
        {file && <p className={s.fileSelected}>{file.name}</p>}
      </div>
      {folderName && <label className={s.folderChoice}>
        <input type="checkbox" checked={copy} disabled={busy} onChange={event => {
          id.current = undefined; setCopy(event.target.checked);
        }}/>
        <span><strong>Guardar también en esta carpeta</strong><small>El archivo quedará disponible en {folderName}.</small></span>
      </label>}
      {error && <Notice error>{error}</Notice>}
      {busy && <AsyncFeedback compact title="Cargando y comprobando el archivo"/>}
      <div className={s.dialogActions}>
        <button type="button" disabled={busy} onClick={onClose}>Cancelar</button>
        <button type="button" className="p5-primary" disabled={!file || busy} onClick={() => void upload()}>Adjuntar al chat</button>
      </div>
    </div>
  </Dialog>;
}

export function ChatAttachmentList({ items, disabled, error, onRemove }: {
  items: ChatAttachment[]; disabled?: boolean; error?: string; onRemove: (id: string) => void;
}) {
  return <>{error && <Notice error>{error}</Notice>}{items.length > 0 && <ul className={s.attachments} aria-label="Adjuntos de este chat">
    {items.map(item => <li key={item.id}>
      <FoxmindIcon name="attach"/><span><strong>{item.name}</strong>
        <small>{item.savedToFolder ? 'Privado · También en carpeta' : 'Privado del chat'}</small></span>
      {!disabled && <button type="button" aria-label={`Quitar ${item.name} del chat`} onClick={() => onRemove(item.id)}><FoxmindIcon name="close"/></button>}
    </li>)}
  </ul>}</>;
}
