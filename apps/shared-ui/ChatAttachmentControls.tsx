import { useRef, useState } from 'react';
import type { ChatAttachment } from '../../src/core/contracts/chat-attachments';
import { AsyncFeedback } from './AsyncFeedback';
import { Notice } from './feedback';
import { FoxmindIcon } from './FoxmindIcon';
import { FoxyDialog } from './FoxyChatLayout';
import s from './foxy-chat-layout.module.css';

export function ChatAttachmentButton({ disabled, folderName, onUpload, iconOnly = false, label = 'Adjuntar' }: {
  disabled?: boolean; folderName?: string; iconOnly?: boolean; label?: string;
  onUpload: (id: string, file: File, copy: boolean) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className={`${s.attachButton} ${iconOnly ? 'parity-ai-quickAttach' : ''}`} aria-label={iconOnly ? 'Agregar un material a la biblioteca' : label} title={iconOnly ? 'Agregar material' : undefined} disabled={disabled} onClick={() => setOpen(true)}>
      <FoxmindIcon name={label==='Agregar material'?'plus':'attach'}/>{!iconOnly && <span>{label}</span>}
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
    if (!/\.(pdf|doc|docx|ppt|pptx)$/iu.test(file.name) || file.size < 1 || file.size > 20_000_000) {
      setError('Elegí un PDF, Word o PowerPoint de hasta 20 MB.');
      return;
    }
    id.current ??= crypto.randomUUID();
    setBusy(true);
    setError('');
    try { await onUpload(id.current, file, copy); onClose(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'No pudimos adjuntar el archivo.'); }
    finally { setBusy(false); }
  }
  return <FoxyDialog title="Sumá una fuente a tu biblioteca" description={`Se incluye en las próximas consultas ${folderName ? 'de esta carpeta.' : 'de este chat.'}`} className={`${s.dialog} parity-foxy-attachmentDialog`} onClose={() => { if (!busy) onClose(); }}
    footer={<><button type="button" disabled={busy} onClick={onClose}>Volver a biblioteca</button><button type="button" className="p5-primary" disabled={!file || busy} onClick={() => void upload()}>Agregar material</button></>}>
    <div className={s.attachmentDialog}>
      <div className={s.uploadZone}>
        <FoxmindIcon name="upload"/>
        <strong>Elegí tu material</strong><small>PDF, Word o PowerPoint · hasta 20 MB</small>
        <label className={s.filePicker}><span>Elegir archivo</span>
          <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" disabled={busy} onChange={event => {
            id.current = undefined; setFile(event.target.files?.[0]); setError('');
          }}/>
        </label>
        <p className={s.fileSelected}>{file?.name ?? 'Todavía no elegiste un archivo.'}</p>
      </div>
      {folderName && <label className={s.folderChoice}>
        <input type="checkbox" checked={copy} disabled={busy} onChange={event => {
          id.current = undefined; setCopy(event.target.checked);
        }}/>
        <span><strong>Guardar también en esta carpeta</strong><small>El archivo quedará disponible en {folderName}.</small></span>
      </label>}
      {error && <Notice error>{error}</Notice>}
      {busy && <AsyncFeedback compact title="Cargando y comprobando el archivo"/>}
      <p className="parity-foxy-privateNote"><FoxmindIcon name="lock"/>Es privado. No se sube a la biblioteca del aula.</p>
    </div>
  </FoxyDialog>;
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
