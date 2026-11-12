import type { ReactNode } from 'react';
import { calendarRange, dayLabel, onDay, shiftDay, type AgendaItem } from '../model/calendar.ts';
import { eventTimeLabel, deadlineParts } from '../model/agenda-presentation.ts';
import { eventColorClass } from '../model/event-colors.ts';

export function AgendaPeriod({ mode, day, zone, items, onSelect, onToday, loading, children, onItem, onDaySelect = onSelect, hideHeader = false }: {
  hideHeader?: boolean; onDaySelect?: (day: string) => void;
  children?: ReactNode; onItem?: (item: AgendaItem) => void; mode: 'WEEK' | 'DAY'; day: string; zone: string; items: AgendaItem[];
  onSelect: (day: string) => void; onToday: () => void; loading: boolean;
}) {
  const range = calendarRange(mode, day, day.slice(0, 7), zone), step = mode === 'WEEK' ? 7 : 1;
  const days = Array.from({ length: step }, (_, index) => shiftDay(range.startDate, index));
  return <section className={`agenda-period agenda-period-${mode.toLowerCase()}`} aria-label={mode === 'WEEK' ? 'Calendario semanal' : 'Calendario diario'} aria-busy={loading}>
    {!hideHeader && <header className="agenda-period-head"><div className="agenda-period-title">
      <button aria-label={mode === 'WEEK' ? 'Semana anterior' : 'Día anterior'} onClick={() => onSelect(shiftDay(day, -step))}>‹</button>
      <h2>{mode === 'WEEK' ? `Semana del ${dayLabel(range.startDate)}` : dayLabel(day)}</h2>
      <button aria-label={mode === 'WEEK' ? 'Semana siguiente' : 'Día siguiente'} onClick={() => onSelect(shiftDay(day, step))}>›</button></div>
      <div className="agenda-calendar-controls"><button onClick={onToday}>Hoy</button>{children}</div></header>}
    {mode === 'WEEK' ? <div className="agenda-week-days">{days.map(value => {
      const entries = items.filter(item => onDay(item, value, zone));
      return <section className="agenda-week-row" key={value}>
        <button className="agenda-weekday" aria-pressed={value === day} aria-label={`${dayLabel(value)}, ${entries.length} eventos o entregas`} onClick={() => onDaySelect(value)}>
          <span>{new Date(`${value}T12:00:00Z`).toLocaleDateString('es-AR', { weekday: 'short', timeZone: 'UTC' })}</span>
          <strong>{Number(value.slice(8))}</strong></button>
        <div>{entries.length ? entries.map(item => <button className={`agenda-week-entry ${item.kind === 'PRIVATE_EVENT' ? eventColorClass(item.event) : 'deadline'}`} key={item.kind === 'PRIVATE_EVENT' ? item.occurrenceId : item.id}
          onClick={() => { onSelect(value); onItem?.(item); }}><span><small>{item.kind === 'PRIVATE_EVENT' ? eventTimeLabel(item) : `${deadlineParts(item.deadlineAt, item.timeZone).time} · Entrega del aula`}</small>
          <strong>{item.kind === 'PRIVATE_EVENT' ? item.event.title : item.title}</strong></span><span aria-hidden="true">›</span></button>) : <p>Sin eventos</p>}</div>
      </section>;
    })}</div> : null}
  </section>;
}
