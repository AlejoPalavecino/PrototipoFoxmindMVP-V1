import { categoryLabels } from './calendar.ts';
import { toggleAllDay, type EventDraft } from './event-draft.ts';

type Props = { draft: EventDraft; onChange: (draft: EventDraft) => void };
export function EventFields({ draft, onChange }: Props) {
  const change = (key: keyof EventDraft, value: string | boolean) => onChange({ ...draft, [key]: value });
  return <>
    <label>Título<input autoFocus required maxLength={160} value={draft.title} onChange={event => change('title', event.target.value)} /></label>
    <label>Categoría<select value={draft.category} onChange={event => change('category', event.target.value)}>
      {Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select></label>
    <label>Descripción <small>(opcional)</small><textarea rows={3} maxLength={4000} value={draft.description} onChange={event => change('description', event.target.value)} /></label>
    <label className="agenda-check"><input type="checkbox" checked={draft.allDay} onChange={event => onChange(toggleAllDay(draft, event.target.checked))} />Día completo</label>
    <div className="agenda-form-dates">
      <label>{draft.allDay ? 'Primer día' : 'Inicio'}<input type={draft.allDay ? 'date' : 'datetime-local'} required value={draft.start} onChange={event => change('start', event.target.value)} /></label>
      <label>{draft.allDay ? 'Último día (incluido)' : 'Fin'}<input type={draft.allDay ? 'date' : 'datetime-local'} required value={draft.end} onChange={event => change('end', event.target.value)} /></label>
    </div>
    {!draft.allDay ? <EventZone draft={draft} onChange={onChange} /> : null}
    <label>Repetición<select value={draft.weekly ? 'WEEKLY' : 'NONE'} onChange={event => change('weekly', event.target.value === 'WEEKLY')}>
      <option value="NONE">Una sola vez</option><option value="WEEKLY">Todas las semanas</option>
    </select></label>
    {draft.weekly ? <label>Repetir hasta (incluido)<input type="date" required min={draft.start.slice(0, 10)} value={draft.until} onChange={event => change('until', event.target.value)} />
      <small>El mismo día y horario local, hasta 53 repeticiones.</small></label> : null}
  </>;
}
function EventZone({ draft, onChange }: Props) {
  return <>
    <label>Zona horaria<input required list="agenda-zones" value={draft.zone} onChange={event => onChange({ ...draft, zone: event.target.value, startOffset: '', endOffset: '' })} />
      <small>El horario se guarda en esta zona.</small></label>
    <datalist id="agenda-zones">{['America/Argentina/Buenos_Aires', 'America/Montevideo', 'America/Santiago', 'America/Bogota', 'America/Mexico_City', 'America/New_York', 'Europe/Madrid', 'UTC'].map(zone => <option key={zone} value={zone} />)}</datalist>
    <details><summary>Horario repetido por cambio estacional</summary><p>Solo si se solicita, indicá el desplazamiento respecto de UTC en minutos (por ejemplo, −180 para UTC−3).</p>
      <div className="agenda-form-dates"><label>Offset de inicio<input type="number" min="-840" max="840" value={draft.startOffset} onChange={event => onChange({ ...draft, startOffset: event.target.value })} /></label>
        <label>Offset de fin<input type="number" min="-840" max="840" value={draft.endOffset} onChange={event => onChange({ ...draft, endOffset: event.target.value })} /></label></div>
    </details>
  </>;
}
