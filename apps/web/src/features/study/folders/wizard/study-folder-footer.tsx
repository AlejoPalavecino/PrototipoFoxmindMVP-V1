import { FoxmindIcon } from '../../../../../../shared-ui/FoxmindIcon';

export function renderStudyFolderFooter({ disabled, advanceDisabled, actionLabel, hasPrevious, onSave, onBack }: {
  disabled: boolean;
  advanceDisabled: boolean;
  actionLabel: string;
  hasPrevious: boolean;
  onSave: () => void;
  onBack: () => void;
}) {
  return (<footer className="dialog-footer brujula-wizard-foot">
    <button
      type="button"
      className="brujula-wizard-keep class-save"
      disabled={disabled}
      onClick={onSave}>
      <FoxmindIcon name="check" />
      Guardar y salir
    </button>
    <div className="class-step-actions">
      {hasPrevious && (<button type="button" disabled={disabled} onClick={onBack}>
        Atrás
      </button>)}
      <button type="submit" className="primary" disabled={advanceDisabled}>
        <FoxmindIcon name="arrow-right" />
        {actionLabel}
      </button>
    </div>
  </footer>);

}
