import type { EventFieldProps } from './event-field-props.ts';
import type { EventDraft } from '../model/event-draft-types.ts';
export type { EventFieldProps } from './event-field-props.ts';
import { EventWhenFields } from './EventWhenFields.tsx';
import { EventRepeatFields } from './EventRepeatFields.tsx';
import { FieldIssue, fieldAria } from './EventFieldIssue.tsx';
import { EventColorFields } from './EventColorFields.tsx';

const categories = [{ value: 'CLASS', label: 'Clase', example: 'Clase de Historia' },
  { value: 'EVALUATION', label: 'Evaluación', example: 'Parcial de Matemática' },
  { value: 'ACTIVITY', label: 'Actividad', example: 'Preparar la presentación' }] as const;

export function EventFields({ draft, onChange, issues, singleOccurrence }: EventFieldProps & {singleOccurrence?:boolean}) {
  return <>
    <section className="agenda-form-group">
      <label>Nombre del evento<input aria-label="Título" autoFocus required name="title" maxLength={160} value={draft.title}
        placeholder="Ej. Preparar laboratorio"
        onChange={event => onChange({ ...draft, title: event.target.value })} {...fieldAria(issues, 'title')} /></label>
      <FieldIssue issues={issues} field="title" />
    </section>
    <EventWhenFields draft={draft} onChange={onChange} issues={issues} category={<label>Tipo de evento<select aria-label="Tipo de evento" name="category" value={draft.category} onChange={event=>onChange({...draft,category:event.target.value as EventDraft['category']})}>{categories.map(category=><option key={category.value} value={category.value}>{category.label}</option>)}</select><FieldIssue issues={issues} field="category"/></label>}/>
    {!singleOccurrence ? <EventRepeatFields draft={draft} onChange={onChange} issues={issues} /> : null}
    <EventColorFields draft={draft} onChange={onChange} issues={issues} />
    <section className="agenda-form-group"><label>Notas <small>(opcional)</small><textarea aria-label="Observaciones" name="description" rows={3} maxLength={4000} value={draft.description}
      placeholder="Agregá un recordatorio"
      onChange={event => onChange({ ...draft, description: event.target.value })} {...fieldAria(issues, 'description')} /></label>
      <FieldIssue issues={issues} field="description" /></section>
  </>;
}
