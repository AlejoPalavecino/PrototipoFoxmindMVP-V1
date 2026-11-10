import { changeDraftUntil } from '../model/event-draft.ts';
import { repeatPreview } from '../model/event-summary.ts';
import type { EventFieldProps } from './event-field-props.ts';
import { FieldIssue, fieldAria } from './EventFieldIssue.tsx';

export function EventRepeatFields({ draft, onChange, issues }: EventFieldProps) {
  const preview = repeatPreview(draft);
  return <section className="agenda-form-group">
    <label>Repetición<select aria-label="Repetición" name="repeat" value={draft.weekly ? draft.frequency ?? 'WEEKLY' : 'NONE'} onChange={event=>{const frequency=event.target.value as 'NONE'|'DAILY'|'WEEKLY'|'MONTHLY';onChange({...draft,weekly:frequency!=='NONE',frequency:frequency==='NONE'?'WEEKLY':frequency});}}>{(['NONE','DAILY','WEEKLY','MONTHLY'] as const).map(frequency=><option key={frequency} value={frequency}>{{NONE:'Sin repetición',DAILY:'Diariamente',WEEKLY:'Semanalmente',MONTHLY:'Mensualmente'}[frequency]}</option>)}</select></label>
    {draft.weekly ? <p className="agenda-repeat-hint">{draft.frequency === 'MONTHLY' ? `El día ${Number(draft.startDate.slice(8))} de cada mes. Los meses sin ese día se omiten.`
      : draft.frequency === 'DAILY' ? 'Todos los días, a la misma hora.' : 'El mismo día de la semana, a la misma hora.'}</p> : null}
    {draft.weekly ? <><label>Repetir hasta (incluido)<input required name="until" type="date" min={draft.startDate} value={draft.until}
      onChange={event => onChange(changeDraftUntil(draft, event.target.value))} {...fieldAria(issues, 'until')} /></label>
      <FieldIssue issues={issues} field="until" /><small>Hasta 53 eventos. La fecha final incluye ese día.</small>
      {preview ? <p className={preview.overLimit ? 'agenda-field-error' : ''}>{preview.count} eventos{preview.overLimit ? ': supera el límite de 53' : ''}</p> : null}
    </> : null}
  </section>;
}
