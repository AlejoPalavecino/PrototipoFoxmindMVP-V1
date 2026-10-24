import { useState } from 'react';
import { changeDraftZone } from './event-draft.ts';
import { zoneChoices, zoneLabel } from './event-zones.ts';
import type { EventFieldProps } from './EventFields.tsx';
import { FieldIssue, fieldAria } from './EventFieldIssue.tsx';

export function EventZoneFields({ draft, onChange, issues }: EventFieldProps) {
  const [expanded, setExpanded] = useState(false);
  return <div className="agenda-zone-control"><p>{zoneLabel(draft.zone)} <button type="button"
    aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>Cambiar</button></p>
    {expanded || issues.some(issue => issue.field === 'zone') ? <><label>Ciudad del evento<select name="zone" value={draft.zone}
      onChange={event => onChange(changeDraftZone(draft, event.target.value))} {...fieldAria(issues, 'zone')}>
      {zoneChoices(draft.zone).map(choice => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
    </select></label><small>Al cambiar la zona se mantiene la hora que escribiste; cambia el momento real del evento.</small>
      <FieldIssue issues={issues} field="zone" /></> : null}
  </div>;
}
