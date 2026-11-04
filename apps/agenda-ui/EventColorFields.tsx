import type { EventFieldProps } from './EventFields.tsx';
import { FieldIssue, fieldAria } from './EventFieldIssue.tsx';
import { eventColorClass, eventColorOptions } from './event-colors.ts';

export function EventColorFields({ draft, onChange, issues }: EventFieldProps) {
  const preview = eventColorClass({ category: draft.category });
  return <fieldset className="agenda-color-fields">
    <legend>Color del evento</legend>
    <div className="agenda-chips agenda-color-choices">{eventColorOptions.map(option => <label key={option.value}
      className={option.value === 'AUTO' ? preview : option.className}>
      <input type="radio" name="color" value={option.value} checked={draft.color === option.value}
        onChange={() => onChange({ ...draft, color: option.value })} {...fieldAria(issues, 'color')} />
      <span aria-hidden="true" className={`agenda-color-swatch ${option.value === 'AUTO' ? preview : option.className}`}>
        {draft.color === option.value ? '✓' : null}</span>
      <span>{option.label}</span>
    </label>)}</div>
    <small>Automático usa el color de la categoría</small>
    <FieldIssue issues={issues} field="color" />
  </fieldset>;
}
