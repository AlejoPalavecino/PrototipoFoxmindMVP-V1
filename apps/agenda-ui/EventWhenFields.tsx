import { changeDraftStart, changeDraftEnd, setDraftDuration, toggleAllDay } from './event-draft.ts';
import { zoneLabel } from './event-zones.ts';
import type { EventFieldProps } from './EventFields.tsx';
import { FieldIssue, fieldAria } from './EventFieldIssue.tsx';

export function EventWhenFields({ draft, onChange, issues }: EventFieldProps) {
  return <section className="agenda-form-group" aria-labelledby="agenda-when"><h3 id="agenda-when">Cuándo</h3>
    <label className="agenda-check"><input type="checkbox" checked={draft.allDay}
      onChange={event => onChange(toggleAllDay(draft, event.target.checked))} />Día completo</label>
    <div className="agenda-form-dates"><label>Fecha<input required name="startDate" type="date" value={draft.startDate}
      onChange={event => onChange(changeDraftStart(draft, { date: event.target.value }))} {...fieldAria(issues, 'startDate')} />
      <FieldIssue issues={issues} field="startDate" /></label>
      {!draft.allDay ? <label>Hora de inicio<input required name="startTime" type="time" value={draft.startTime}
        onChange={event => onChange(changeDraftStart(draft, { time: event.target.value }))} {...fieldAria(issues, 'startTime')} />
        <FieldIssue issues={issues} field="startTime" /></label> : null}</div>
    {!draft.allDay ? <><small className="agenda-zone-note">{zoneLabel(draft.zone)}</small>
      <div className="agenda-duration"><span>Duración</span><div className="agenda-chips" role="group" aria-label="Duración">
        {([30, 60, 90] as const).map(minutes => <button type="button" key={minutes}
          aria-pressed={draft.endMode === 'DURATION' && draft.durationMinutes === minutes}
          onClick={() => onChange(setDraftDuration(draft, minutes))}>{minutes} min</button>)}
        <button type="button" aria-pressed={draft.endMode === 'MANUAL'} onClick={() => onChange({ ...draft, endMode: 'MANUAL' })}>Ajustar fin</button>
      </div></div>
      {draft.endMode === 'MANUAL' || issues.some(issue => issue.field === 'endTime') ? <label>Hora de fin<input required name="endTime" type="time" value={draft.endTime}
        onChange={event => onChange(changeDraftEnd(draft, { time: event.target.value }))} {...fieldAria(issues, 'endTime')} />
        <FieldIssue issues={issues} field="endTime" /></label> : null}
      <TemporalChoices draft={draft} onChange={onChange} issues={issues} />
    </> : null}
  </section>;
}
function TemporalChoices({ draft, onChange, issues }: EventFieldProps) {
  return <>{issues.filter(issue => issue.choices?.length).map(issue => <fieldset key={issue.field} className="agenda-temporal-choices">
    <legend>{issue.message}</legend><small>El cambio de hora hace que este horario ocurra dos veces. Elegí cuál querés.</small>
    {issue.choices?.map(choice => <label className="agenda-check" key={choice.instant}><input type="radio"
      name={`choice-${issue.field}`} checked={(issue.field === 'startTime' ? draft.startOffset : draft.endOffset) === choice.offsetMinutes}
      onChange={() => onChange({ ...draft, [issue.field === 'startTime' ? 'startOffset' : 'endOffset']: choice.offsetMinutes })} />{choice.label}</label>)}
  </fieldset>)}</>;
}
