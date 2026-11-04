import { useState } from 'react';
import { changeDraftEnd } from './event-draft.ts';
import type { EventFieldProps } from './EventFields.tsx';
import { EventZoneFields } from './EventZoneFields.tsx';
import { FieldIssue, fieldAria } from './EventFieldIssue.tsx';

export function EventAdvancedFields({ draft, onChange, issues }: EventFieldProps) {
  const [multiple, setMultiple] = useState(draft.startDate !== draft.endDate);
  return <div className="agenda-date-options">
    <label className="agenda-check"><input type="checkbox" checked={multiple || draft.startDate !== draft.endDate}
      onChange={event => { setMultiple(event.target.checked); if (!event.target.checked) onChange(changeDraftEnd(draft, { date: draft.startDate })); }} />Ocupa varios días</label>
    {multiple || draft.startDate !== draft.endDate || issues.some(issue => issue.field === 'endDate') ? <label>{draft.allDay ? 'Último día (incluido)' : 'Fecha de fin'}
      <input required name="endDate" type="date" value={draft.endDate} onChange={event => onChange(changeDraftEnd(draft, { date: event.target.value }))} {...fieldAria(issues, 'endDate')} />
      <FieldIssue issues={issues} field="endDate" /></label> : null}
    {!draft.allDay ? <EventZoneFields draft={draft} onChange={onChange} issues={issues} /> : null}
  </div>;
}
