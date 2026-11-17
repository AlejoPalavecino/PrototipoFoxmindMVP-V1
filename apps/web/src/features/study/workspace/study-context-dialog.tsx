import { FoxyDialog } from '../../../../../shared-ui/FoxyChatLayout';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import type { StudyDetail, StudyCollection } from '../model/study-contracts.ts';
import { StudyContext } from '../ui/study-context';
export function StudyContextDialog({
  detail,
  catalog,
  busy,
  working,
  ready,
  onReady,
  onWorking,
  onReload,
  onClose,
  onLibrary,
}: {
  detail: StudyDetail;
  catalog: StudyCollection;
  busy: boolean;
  working: boolean;
  ready: boolean;
  onReady: (value: boolean) => void;
  onWorking: (value: boolean) => void;
  onReload: () => Promise<void>;
  onClose: () => void;
  onLibrary: () => void;
}) {
  return (
    <FoxyDialog
      description="Vincular un aula es opcional. Tus archivos siempre son privados."
      title="El contexto de tu carpeta"
      className="study-exact-context-dialog"
      onClose={onClose}
      footer={
        <>
          <button disabled={working} onClick={onClose}>
            Cancelar
          </button>
          <button disabled={working} onClick={onLibrary}>
            <FoxmindIcon name="book" />
            Abrir biblioteca
          </button>
          <button type="submit" form="study-context-form" className="primary" disabled={!ready}>
            <FoxmindIcon name="check" />
            {working ? 'Guardando…' : 'Guardar contexto'}
          </button>
        </>
      }
    >
      <StudyContext
        onSaveAvailability={onReady}
        onWorkingChange={onWorking}
        detail={detail}
        catalog={catalog}
        busy={busy}
        onReload={onReload}
        onClose={onClose}
        onLibrary={onLibrary}
      />
    </FoxyDialog>
  );
}
