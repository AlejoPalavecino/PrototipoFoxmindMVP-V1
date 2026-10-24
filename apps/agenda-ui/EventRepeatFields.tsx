import { changeDraftUntil } from './event-draft.ts';
import { repeatPreview } from './event-summary.ts';
import type { EventFieldProps } from './EventFields.tsx';
import { FieldIssue, fieldAria } from './EventFieldIssue.tsx';

export function EventRepeatFields({ draft, onChange, issues }: EventFieldProps) {
  const preview = repeatPreview(draft);
  return <section className="agenda-form-group" aria-labelledby="agenda-repeat"><h3 id="agenda-repeat">Cómo se repite</h3>
    <div className="agenda-chips" role="radiogroup" aria-label="Repetición">{[false, true].map(weekly => <label key={String(weekly)}>
      <input type="radio" name="repeat" checked={draft.weekly === weekly} onChange={() => onChange({ ...draft, weekly })} />
      {weekly ? 'Cada semana' : 'Una vez'}</label>)}</div>
    {draft.weekly ? <><label>Repetir hasta (incluido)<input required name="until" type="date" min={draft.startDate} value={draft.until}
      onChange={event => onChange(changeDraftUntil(draft, event.target.value))} {...fieldAria(issues, 'until')} /></label>
      <FieldIssue issues={issues} field="until" /><small>Hasta 53 eventos. La fecha final incluye ese día.</small>
      {preview ? <p className={preview.overLimit ? 'agenda-field-error' : ''}>{preview.count} eventos{preview.overLimit ? ': supera el límite de 53' : ''}</p> : null}
    </> : null}
  </section>;
}
