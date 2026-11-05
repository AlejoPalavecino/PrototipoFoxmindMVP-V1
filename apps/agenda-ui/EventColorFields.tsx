import type { EventFieldProps } from './EventFields.tsx';
import { FieldIssue, fieldAria } from './EventFieldIssue.tsx';
import { eventColorClass, eventColorOptions } from './event-colors.ts';

export function EventColorFields({ draft, onChange, issues }: EventFieldProps) {
  const preview = eventColorClass({ category: draft.category });
  const selected = eventColorOptions.find(option => option.value === draft.color);
  const selectedClass = draft.color === 'AUTO' || !selected ? preview : selected.className;
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
    <section className={`agenda-event-preview ${selectedClass}`} aria-label="Vista previa del evento" aria-live="polite">
      <small>Vista previa del evento · {selected?.label ?? 'Color no válido'}</small>
      <strong>{draft.title.trim() || 'Título del evento'}</strong>
      <span>{draft.startDate} · {draft.allDay ? 'Todo el día' : `${draft.startTime} – ${draft.endTime}`}</span>
      <span>{{ CLASS: 'Clase', ACTIVITY: 'Actividad', EVALUATION: 'Evaluación' }[draft.category]} · Personal</span>
    </section>
    <FieldIssue issues={issues} field="color" />
  </fieldset>;
}
