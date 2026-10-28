import { changeDraftUntil } from './event-draft.ts';
import { repeatPreview } from './event-summary.ts';
import type { EventFieldProps } from './EventFields.tsx';
import { FieldIssue, fieldAria } from './EventFieldIssue.tsx';

export function EventRepeatFields({ draft, onChange, issues }: EventFieldProps) {
  const preview = repeatPreview(draft);
  return <section className="agenda-form-group" aria-labelledby="agenda-repeat"><h3 id="agenda-repeat">Cómo se repite</h3>
    <div className="agenda-chips" role="radiogroup" aria-label="Repetición">{(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY'] as const).map(frequency => <label key={frequency}>
      <input type="radio" name="repeat" checked={(draft.weekly ? draft.frequency ?? 'WEEKLY' : 'NONE') === frequency}
        onChange={() => onChange({ ...draft, weekly: frequency !== 'NONE', frequency: frequency === 'NONE' ? 'WEEKLY' : frequency })} />
      {{ NONE: 'Una vez', DAILY: 'Cada día', WEEKLY: 'Cada semana', MONTHLY: 'Cada mes' }[frequency]}</label>)}</div>
    {draft.weekly ? <p className="agenda-repeat-hint">{draft.frequency === 'MONTHLY' ? `El día ${Number(draft.startDate.slice(8))} de cada mes. Los meses sin ese día se omiten.`
      : draft.frequency === 'DAILY' ? 'Todos los días, a la misma hora.' : 'El mismo día de la semana, a la misma hora.'}</p> : null}
    {draft.weekly ? <><label>Repetir hasta (incluido)<input required name="until" type="date" min={draft.startDate} value={draft.until}
      onChange={event => onChange(changeDraftUntil(draft, event.target.value))} {...fieldAria(issues, 'until')} /></label>
      <FieldIssue issues={issues} field="until" /><small>Hasta 53 eventos. La fecha final incluye ese día.</small>
      {preview ? <p className={preview.overLimit ? 'agenda-field-error' : ''}>{preview.count} eventos{preview.overLimit ? ': supera el límite de 53' : ''}</p> : null}
    </> : null}
  </section>;
}
