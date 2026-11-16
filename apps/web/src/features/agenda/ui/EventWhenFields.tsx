import { changeDraftStart, changeDraftEnd, toggleAllDay } from '../model/event-draft.ts';
import type { ReactNode } from 'react';
import type { EventFieldProps } from './event-field-props.ts';
import { FieldIssue, fieldAria } from './EventFieldIssue.tsx';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import { zoneLabel } from '../model/event-zones.ts';

export function EventWhenFields({ draft, onChange, issues, children, category }: EventFieldProps & { children?: ReactNode; category?: ReactNode }) {
  return <section className="agenda-form-group">
    {category}
    <div className="agenda-date-fields"><label>Fecha<input required name="startDate" type="date" value={draft.startDate}
      onChange={event => onChange(changeDraftStart(draft, { date: event.target.value }))} {...fieldAria(issues, 'startDate')} /><FieldIssue issues={issues} field="startDate" /></label>
    {!draft.allDay ? <><label>Desde<input aria-label="Hora de inicio" required name="startTime" type="time" value={draft.startTime}
      onChange={event => onChange(changeDraftStart(draft, { time: event.target.value }))} {...fieldAria(issues, 'startTime')} /><FieldIssue issues={issues} field="startTime" /></label>
      <label>Hasta<input aria-label="Hora de fin" required name="endTime" type="time" value={draft.endTime}
      onChange={event => onChange(changeDraftEnd(draft, { time: event.target.value }))} {...fieldAria(issues, 'endTime')} /><FieldIssue issues={issues} field="endTime" /></label></> : null}</div>
    <div className="agenda-when-flags">
      {!draft.allDay ? <p className="agenda-zone-note"><FoxmindIcon name="clock"/>
        {draft.zone === 'America/Argentina/Buenos_Aires' ? 'Horario de Buenos Aires (UTC−3)' : zoneLabel(draft.zone)}</p> : null}
      <label className="agenda-check"><input type="checkbox" checked={draft.allDay}
        onChange={event => onChange(toggleAllDay(draft, event.target.checked))} />Todo el día</label>
    </div>
    {!draft.allDay ? <TemporalChoices draft={draft} onChange={onChange} issues={issues}/> : null}
    {draft.endDate!==draft.startDate || issues.some(issue=>issue.field==='endDate') ? <label>Fecha de fin<input required type="date" name="endDate" value={draft.endDate} onChange={event=>onChange(changeDraftEnd(draft,{date:event.target.value}))} {...fieldAria(issues,'endDate')}/><FieldIssue issues={issues} field="endDate"/></label> : null}
    {children}
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
