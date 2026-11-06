import type { EventFieldProps } from './EventFields.tsx';
import { FieldIssue, fieldAria } from './EventFieldIssue.tsx';
import { eventColorClass, eventColorOptions } from './event-colors.ts';

export function EventColorFields({ draft, onChange, issues }: EventFieldProps) {
  const preview = eventColorClass({ category: draft.category });
  const selected = eventColorOptions.find(option => option.value === draft.color);
  const selectedClass = draft.color === 'AUTO' || !selected ? preview : selected.className;
  const referenceColors=['GREEN','ORANGE','YELLOW','GRAPHITE'];
  const choices=[...referenceColors,...(referenceColors.includes(draft.color)?[]:[draft.color])]
    .map(value=>eventColorOptions.find(option=>option.value===value)).filter((option): option is (typeof eventColorOptions)[number]=>Boolean(option));
  return <fieldset className="agenda-color-fields">
    <legend>Color del evento</legend>
    <div className="agenda-chips agenda-color-choices">{choices.map(option => <label key={option.value}
      className={option.value === 'AUTO' ? preview : option.className}>
      <input type="radio" name="color" value={option.value} checked={draft.color === option.value}
        onChange={() => onChange({ ...draft, color: option.value })} {...fieldAria(issues, 'color')} />
      <span aria-hidden="true" className={`agenda-color-swatch ${option.value === 'AUTO' ? preview : option.className}`}>
        {draft.color === option.value ? '✓' : null}</span>
      <span>{option.label}</span>
    </label>)}</div>
    <section className={`agenda-event-preview ${selectedClass}`} aria-label="Vista previa del evento" aria-live="polite">
      <small>En tu agenda</small>
      <strong>{draft.title.trim() || 'Mi evento'}</strong>
    </section>
    <FieldIssue issues={issues} field="color" />
  </fieldset>;
}
