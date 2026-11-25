import { FoxmindIcon } from '../../../../../../shared-ui/FoxmindIcon';
import { learningCover } from '../../../../../../shared-ui/parity-assets';
import { steps } from './study-folder-steps.ts';
export function renderStudyFolderSidebar({ step, disabled, banner, name, subject, goTo }: {
  step: number;
  disabled: boolean;
  banner: string;
  name: string;
  subject: string;
  goTo: (step: number) => void;
}) {
  return (<aside className="class-builder-rail">
    <ol aria-label="Pasos de creación de la carpeta">
      {steps.map((item, index) => (<li key={item.label} className={index === step ? 'current' : index < step ? 'complete' : ''}>
        <button
          type="button"
          disabled={disabled || index > step}
          aria-label={`Paso ${index + 1}: ${item.label}`}
          aria-current={index === step ? 'step' : undefined}
          onClick={() => goTo(index)}>
          <span>{index < step ? <FoxmindIcon name="check" /> : index + 1}</span>
          <div>
            <b>{item.label}</b>
            <small>{item.detail}</small>
          </div>
        </button>
      </li>))}
    </ol>
    <div className="class-builder-preview">
      <img src={learningCover(banner)} alt="" />
      <div>
        <span>Así se va a ver tu carpeta</span>
        <b>{name || 'Tu próxima carpeta'}</b>
        <small>{subject || 'Un lugar para tus temas'}</small>
      </div>
    </div>
    <p className="class-private">
      <FoxmindIcon name="lock" />
      Tu borrador es sólo tuyo.
    </p>
  </aside>);

}
