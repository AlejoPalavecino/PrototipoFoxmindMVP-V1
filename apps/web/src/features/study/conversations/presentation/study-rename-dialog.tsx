import { Dialog, Notice } from '../../../../../../shared-ui/feedback';
export function StudyRenameDialog({
  busy,
  title,
  error,
  onTitle,
  onSubmit,
  onClose,
}: {
  busy: boolean;
  title: string;
  error: string;
  onTitle: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog
      title="Renombrar conversación"
      className="study-exact-rename-dialog"
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label>
          Nombre de la conversación
          <input
            autoFocus
            required
            maxLength={120}
            value={title}
            onChange={(event) => onTitle(event.target.value)}
          />
        </label>
        {error && <Notice error>{error}</Notice>}
        <footer className="study-exact-dialog-footer">
          <button type="button" disabled={busy} onClick={onClose}>
            Cancelar
          </button>
          <button className="primary" disabled={busy}>
            Guardar
          </button>
        </footer>
      </form>
    </Dialog>
  );
}
