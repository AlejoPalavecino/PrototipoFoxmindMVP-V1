import { useState } from 'react';
import { FoxyDialog } from '../../../../../shared-ui/FoxyChatLayout';

export function FoxyRenameDialog({ initialTitle, busy = false, error, onSave, onClose }: {
  initialTitle: string;
  busy?: boolean;
  error?: string | null;
  onSave: (title: string) => Promise<boolean>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [submitting, setSubmitting] = useState(false);
  const valid = Boolean(title.trim()) && [...title.trim()].length <= 120
    && !/[\u0000-\u001f\u007f-\u009f]/u.test(title);
  const locked = busy || submitting;
  const close = () => { if (!locked) onClose(); };
  async function save() {
    if (!valid || locked) return;
    setSubmitting(true);
    try { if (await onSave(title.trim())) onClose(); }
    finally { setSubmitting(false); }
  }
  return <FoxyDialog title="Un nombre para volver a encontrarla" description="La conversación conserva sus mensajes." onClose={close}
    footer={<>
      <button type="button" disabled={locked} onClick={close}>Cancelar</button>
      <button type="submit" form="foxy-rename-form" className="p5-primary" disabled={locked || !valid}>{locked ? 'Guardando…' : 'Guardar nombre'}</button>
    </>}>
    <form id="foxy-rename-form" className="parity-foxy-toolForm" onSubmit={event => { event.preventDefault(); return save(); }}>
      <label>Nombre de la conversación<input autoFocus value={title} maxLength={120} aria-invalid={!valid} onChange={event => setTitle(event.target.value)} /></label>
      {error && <p role="alert">{error}</p>}
    </form>
  </FoxyDialog>;
}
