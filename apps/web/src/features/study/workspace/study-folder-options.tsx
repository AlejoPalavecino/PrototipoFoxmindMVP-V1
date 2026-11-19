import { Dialog } from '../../../../../shared-ui/feedback';
import { StudyConfirmation } from '../ui/study-confirmation';
import s from '../ui/study.module.css';
export function StudyFolderOptions({
  folderName,
  busy,
  archived,
  deleteConfirmation,
  onClose,
  onArchive,
  onDelete,
  onCancelDelete,
  onConfirmDelete,
  onSharedStrategy,
}: {
  folderName: string;
  busy: boolean;
  archived: boolean;
  deleteConfirmation: boolean;
  onClose: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => Promise<void>;
  onSharedStrategy?: () => void;
}) {
  return (
    <Dialog title="Opciones de la carpeta" onClose={onClose}>
      <div className={`${s.dialogBody} parity-ai-dialogBody`}>
        <p>Tu carpeta es privada.</p>
        {onSharedStrategy ? <button type="button" disabled={busy} onClick={onSharedStrategy}>Compartir estrategia</button> : null}
        <button disabled={busy} onClick={onArchive}>
          {archived ? 'Reactivar carpeta' : 'Archivar carpeta'}
        </button>
        <p>Archivar conserva tu trabajo y cancela avisos pendientes.</p>
        <button
          className={`${s.danger} parity-ai-danger`}
          disabled={busy}
          type="button"
          onClick={() => onDelete()}
        >
          Eliminar carpeta
        </button>
        {deleteConfirmation && (
          <StudyConfirmation
            title="Eliminar carpeta"
            confirmLabel="Eliminar carpeta"
            destructive
            busy={busy}
            description={`Vas a perder el acceso a «${folderName}» y se cancelarán sus avisos pendientes. Los eventos que ya agregaste a Agenda se conservan.`}
            onClose={() => onCancelDelete()}
            onConfirm={onConfirmDelete}
          />
        )}
      </div>
    </Dialog>
  );
}
