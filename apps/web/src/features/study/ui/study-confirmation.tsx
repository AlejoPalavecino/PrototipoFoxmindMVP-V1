import { useEffect, useRef, useState } from 'react';
import { Dialog, Notice } from '../../../../../shared-ui/feedback';
import s from './study.module.css';

type Props = {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

export function StudyConfirmation({ title, description, confirmLabel, destructive, busy, onClose, onConfirm }: Props) {
  const cancelButton = useRef<HTMLButtonElement>(null);
  const submitting = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { cancelButton.current?.focus(); }, []);

  async function confirm() {
    if (busy || submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError('');
    try {
      await onConfirm();
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No pudimos completar la acción. Volvé a intentar.');
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }
  function cancel() {
    if (!submitting.current) onClose();
  }

  return <Dialog title={title} labeledClose onClose={cancel}>
    <div className={s.dialogBody} aria-busy={pending}>
      <p>{description}</p>
      {error && <Notice error>{error}</Notice>}
      <footer className={`p5-form-footer ${s.confirmationFooter}`}>
        <button ref={cancelButton} type="button" className="p5-action" disabled={pending} onClick={cancel}>Cancelar</button>
        <button type="button" className={destructive ? `p5-action ${s.confirmDanger}` : 'p5-primary'}
          disabled={busy || pending} onClick={() => void confirm()}>
          {pending ? 'Procesando…' : confirmLabel}
        </button>
      </footer>
    </div>
  </Dialog>;
}
