import type { Payload } from './api.ts';
import { Cover, coverOptions } from './components.tsx';
import { FoxmindIcon, type IconKey } from '../shared-ui/index.ts';

const fields: { key: 'name' | 'subject' | 'division'; label: string; placeholder: string; icon: IconKey }[] = [
  { key: 'name', label: 'Nombre del aula', placeholder: 'Ej.: Matemáticas · Primer año', icon: 'book' },
  { key: 'subject', label: 'Materia', placeholder: 'Ej.: Matemáticas', icon: 'book' },
  { key: 'division', label: 'División', placeholder: 'Ej.: 1.º A', icon: 'users' },
];

export function WizardGeneral({ payload, zones, onUpdate }: {
  payload: Payload; zones: { value: string; label: string }[]; onUpdate: (key: keyof Payload, value: unknown) => void;
}) {
  return <>
    <div className="p5-fields">
      {fields.map(field => <label key={field.key}>{field.label}
        <span className="wizard-field-control"><FoxmindIcon name={field.icon} />
          <input required placeholder={field.placeholder} maxLength={field.key === 'division' ? 60 : 120}
            value={payload[field.key] ?? ''} onChange={event => onUpdate(field.key, event.target.value)} />
        </span>
      </label>)}
      <label>Ciclo lectivo<span className="wizard-field-control"><FoxmindIcon name="calendar" />
        <input type="number" required min="1" max="9999" value={payload.academicYear ?? ''}
          onChange={event => onUpdate('academicYear', event.target.value ? Number(event.target.value) : undefined)} />
      </span></label>
      <label className="p5-wide">Ciudad y horario del aula
        <span className="wizard-field-control"><FoxmindIcon name="clock" />
          <select required value={payload.timezone ?? ''} onChange={event => onUpdate('timezone', event.target.value)}>
            {zones.map(zone => <option key={zone.value} value={zone.value}>{zone.label}</option>)}
          </select>
        </span>
        <small>Usamos tu horario local para entregas y eventos. Revisalo antes de publicar: después queda fijo.</small>
      </label>
    </div>
    <h3>Elegí una portada</h3>
    <div className="p5-covers">{coverOptions(payload.coverKey).map(cover => <label key={cover.key}
      className={payload.coverKey === cover.key ? 'selected' : ''}>
      <Cover kind={cover.key} priority />
      <span><input type="radio" required name="cover" checked={payload.coverKey === cover.key}
        onChange={() => onUpdate('coverKey', cover.key)} />{cover.label}</span>
    </label>)}</div>
  </>;
}
