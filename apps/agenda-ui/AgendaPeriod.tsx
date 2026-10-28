import { calendarRange, dayLabel, onDay, shiftDay, type AgendaItem } from './calendar.ts';

export function AgendaPeriod({ mode, day, zone, items, onSelect, onToday, loading }: {
  mode: 'WEEK' | 'DAY'; day: string; zone: string; items: AgendaItem[];
  onSelect: (day: string) => void; onToday: () => void; loading: boolean;
}) {
  const range = calendarRange(mode, day, day.slice(0, 7), zone), step = mode === 'WEEK' ? 7 : 1;
  const days = Array.from({ length: step }, (_, index) => shiftDay(range.startDate, index));
  return <section className="agenda-period" aria-label={mode === 'WEEK' ? 'Calendario semanal' : 'Calendario diario'} aria-busy={loading}>
    <header className="agenda-period-head"><h2>{mode === 'WEEK' ? `Semana del ${dayLabel(range.startDate)}` : dayLabel(day)}</h2>
      <button aria-label={mode === 'WEEK' ? 'Semana anterior' : 'Día anterior'} onClick={() => onSelect(shiftDay(day, -step))}>‹</button>
      <button onClick={onToday}>Hoy</button>
      <button aria-label={mode === 'WEEK' ? 'Semana siguiente' : 'Día siguiente'} onClick={() => onSelect(shiftDay(day, step))}>›</button></header>
    {mode === 'WEEK' ? <div className="agenda-week-days">{days.map(value => {
      const entries = items.filter(item => onDay(item, value, zone));
      return <button key={value} aria-pressed={value === day} aria-label={`${dayLabel(value)}, ${entries.length} eventos o entregas`} onClick={() => onSelect(value)}>
        <span>{new Date(`${value}T12:00:00Z`).toLocaleDateString('es-AR', { weekday: 'short', timeZone: 'UTC' })}</span>
        <strong>{Number(value.slice(8))}</strong><span>{entries.length ? `${entries.length} ·` : '—'}</span>
        {entries.slice(0, 2).map(item => <small key={item.kind === 'PRIVATE_EVENT' ? item.occurrenceId : item.id}>{item.kind === 'PRIVATE_EVENT' ? item.event.title : item.title}</small>)}
      </button>;
    })}</div> : <label>Ir a una fecha<input type="date" value={day} onChange={event => { if (event.target.value) onSelect(event.target.value); }} /></label>}
  </section>;
}
