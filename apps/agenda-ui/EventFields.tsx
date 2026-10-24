import type { DraftIssue, EventDraft } from './event-draft-types.ts';
import { draftSummary } from './event-summary.ts';
import { EventWhenFields } from './EventWhenFields.tsx';
import { EventRepeatFields } from './EventRepeatFields.tsx';
import { EventAdvancedFields } from './EventAdvancedFields.tsx';
import { FieldIssue, fieldAria } from './EventFieldIssue.tsx';

export type EventFieldProps = { draft: EventDraft; onChange: (draft: EventDraft) => void; issues: readonly DraftIssue[] };
const categories = [{ value: 'CLASS', label: 'Clase', example: 'Clase de Historia' },
  { value: 'EVALUATION', label: 'Evaluación', example: 'Parcial de Matemática' },
  { value: 'ACTIVITY', label: 'Actividad', example: 'Preparar la presentación' }] as const;

export function EventFields({ draft, onChange, issues }: EventFieldProps) {
  return <>
    <section className="agenda-form-group" aria-labelledby="agenda-what"><h3 id="agenda-what">Qué voy a organizar</h3>
      <div className="agenda-chips" role="radiogroup" aria-label="Categoría">{categories.map(category => <label key={category.value}>
        <input type="radio" name="category" value={category.value} checked={draft.category === category.value}
          onChange={() => onChange({ ...draft, category: category.value })} {...fieldAria(issues, 'category')} />{category.label}
      </label>)}</div><FieldIssue issues={issues} field="category" />
      <label>Título<input autoFocus required name="title" maxLength={160} value={draft.title}
        placeholder={categories.find(category => category.value === draft.category)?.example}
        onChange={event => onChange({ ...draft, title: event.target.value })} {...fieldAria(issues, 'title')} /></label>
      <FieldIssue issues={issues} field="title" /><small>Solo visible para vos. No crea una actividad del aula.</small>
    </section>
    <EventWhenFields draft={draft} onChange={onChange} issues={issues} />
    <EventRepeatFields draft={draft} onChange={onChange} issues={issues} />
    <EventAdvancedFields draft={draft} onChange={onChange} issues={issues} />
    <p className="agenda-form-summary" aria-live="polite">{draftSummary(draft)}</p>
  </>;
}
