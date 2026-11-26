import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';

/** Shown above the composer before the student writes anything: without readable material Foxy cannot answer yet. */
export function StudyMaterialAlert({ disabled, onAdd }: { disabled: boolean; onAdd: (launcher: HTMLButtonElement) => void }) {
  return (
    <div className="study-material-alert" role="status">
      <FoxmindIcon name="warning" />
      <p>
        <b>Foxy necesita algo para leer.</b> Responde a partir de tus materiales y esta carpeta todavía no tiene uno legible. Sumá un apunte o el programa para empezar.
      </p>
      <button type="button" disabled={disabled} onClick={(event) => onAdd(event.currentTarget)}>
        <FoxmindIcon name="plus" />
        Agregar material
      </button>
    </div>
  );
}
