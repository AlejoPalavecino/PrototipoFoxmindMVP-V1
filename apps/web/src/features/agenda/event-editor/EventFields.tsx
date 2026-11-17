import type { EventFieldProps } from './event-field-props.ts';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
export type { EventFieldProps } from './event-field-props.ts';
import { EventWhenFields } from './EventWhenFields.tsx';
import { EventRepeatFields } from './EventRepeatFields.tsx';
import { FieldIssue, fieldAria } from './EventFieldIssue.tsx';
import { reminderLabels } from '../model/event-reminders.ts';
import { zoneLabel } from './event-zones.ts';
import { EventColorFields } from './EventColorFields.tsx';

import { categoryLabels } from '../model/calendar.ts';

const categories = ['CLASS', 'ACTIVITY', 'EVALUATION'] as const;
export const eventCategoryIcons = { CLASS: 'book', ACTIVITY: 'calendar', EVALUATION: 'clipboard' } as const;

export function EventFields({ draft, onChange, issues, singleOccurrence }: EventFieldProps & {singleOccurrence?:boolean}) {
  return <>
    <section className="agenda-form-group">
      <label>Nombre del evento<input aria-label="Título" autoFocus required name="title" maxLength={160} value={draft.title}
        placeholder="Por ejemplo: repasar exposición"
        onChange={event => onChange({ ...draft, title: event.target.value })} {...fieldAria(issues, 'title')} /></label>
      <FieldIssue issues={issues} field="title" />
    </section>
    <fieldset className="agenda-type-field"><legend>¿Qué vas a hacer?</legend><div className="agenda-type-options">{categories.map(category => <label key={category}>
      <input type="radio" name="category" value={category} checked={draft.category === category} onChange={() => onChange({ ...draft, category })} {...fieldAria(issues, 'category')}/>
      <FoxmindIcon name={eventCategoryIcons[category]}/><span>{categoryLabels[category]}</span>
    </label>)}</div><FieldIssue issues={issues} field="category"/></fieldset>
    <EventWhenFields draft={draft} onChange={onChange} issues={issues}/>
    <div className="agenda-extra-fields">
    {!singleOccurrence ? <EventRepeatFields draft={draft} onChange={onChange} issues={issues} /> : null}
    <section className="agenda-form-group"><label>Aviso en notificaciones
      <select name="reminder" value={draft.reminderMinutes ?? ''} onChange={event => {
        const choice = reminderLabels.find(option => String(option.value ?? '') === event.target.value);
        onChange({ ...draft, reminderMinutes: choice?.value });
      }}>
        {reminderLabels.map(option => <option key={option.value ?? 'none'} value={option.value ?? ''}>{option.label}</option>)}
      </select>
    </label>{draft.allDay && draft.reminderMinutes !== undefined ? <small>El día empieza a medianoche · {zoneLabel(draft.zone)}</small> : null}</section>
    </div>
    <EventColorFields draft={draft} onChange={onChange} issues={issues} />
    <section className="agenda-form-group"><label><span>Algo para recordar <small className="agenda-field-optional">(opcional)</small></span><textarea aria-label="Observaciones" name="description" rows={2} maxLength={4000} value={draft.description}
      placeholder="Materiales, una idea o un recordatorio…"
      onChange={event => onChange({ ...draft, description: event.target.value })} {...fieldAria(issues, 'description')} /></label>
      <FieldIssue issues={issues} field="description" /></section>
  </>;
}
