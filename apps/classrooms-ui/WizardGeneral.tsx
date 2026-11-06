import type { Payload } from './api.ts';
import { FoxmindIcon, type IconKey } from '../shared-ui/index.ts';

const fields: { key: 'name' | 'subject' | 'division'; label: string; placeholder: string; icon: IconKey }[] = [
  { key: 'name', label: 'Nombre del aula', placeholder: 'Ej. Biología de cuarto año', icon: 'book' },
  { key: 'subject', label: 'Materia', placeholder: 'Ej. Biología', icon: 'book' },
  { key: 'division', label: 'División', placeholder: 'Ej. 4.º A', icon: 'users' },
];

export function WizardGeneral({ payload, onUpdate }: {
  payload: Payload; zones: { value: string; label: string }[]; onUpdate: (key: keyof Payload, value: unknown) => void;
}) {
  return <>
    <div className="p5-fields">
      {fields.map(field => <label key={field.key}>{field.label}
        <span className="wizard-field-control"><FoxmindIcon name={field.icon} />
          <input required autoFocus={field.key==='name'} placeholder={field.placeholder} maxLength={field.key === 'division' ? 60 : 120}
            value={payload[field.key] ?? ''} onChange={event => onUpdate(field.key, event.target.value)} />
        </span>
      </label>)}
      <label>Ciclo lectivo<span className="wizard-field-control"><FoxmindIcon name="calendar" />
        <input type="number" required min="1" max="9999" value={payload.academicYear ?? ''}
          onChange={event => onUpdate('academicYear', event.target.value ? Number(event.target.value) : undefined)} />
      </span></label>
    </div>
  </>;
}
