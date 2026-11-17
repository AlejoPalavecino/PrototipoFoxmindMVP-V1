import { useRef, type ReactNode } from 'react';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import { calendarRange, dayLabel, groupAgendaItemsByDay, shiftDay, type AgendaItem } from '../model/calendar.ts';
import { agendaRows } from './agendaRows.tsx';

const weekday = (day: string, size: 'short' | 'long') =>
  new Intl.DateTimeFormat('es-AR', { weekday: size, timeZone: 'UTC' }).format(new Date(day + 'T12:00:00Z'));

export function AgendaPeriod({ mode, day, zone, items, onSelect, onToday, loading, failed = false, busy = false, children,
  onItem, onCreateDay, onDaySelect = onSelect, hideHeader = false }: {
  hideHeader?: boolean; onCreateDay?: (day: string) => void; onDaySelect?: (day: string) => void;
  children?: ReactNode; onItem?: (item: AgendaItem, day: string) => void; mode: 'WEEK' | 'DAY'; day: string; zone: string; items: AgendaItem[];
  onSelect: (day: string) => void; onToday: () => void; loading: boolean; failed?: boolean; busy?: boolean;
}) {
  const range = calendarRange('WEEK', day, day.slice(0, 7), zone), step = mode === 'WEEK' ? 7 : 1;
  const days = Array.from({ length: 7 }, (_, index) => shiftDay(range.startDate, index));
  const grouped = groupAgendaItemsByDay(items, days, zone);
  const weeks = useRef<HTMLDivElement>(null);
  return <section className={`agenda-period agenda-period-${mode.toLowerCase()}`} aria-label={mode === 'WEEK' ? 'Calendario semanal' : 'Calendario diario'} aria-busy={loading}>
    {!hideHeader && <header className="agenda-period-head"><div className="agenda-period-title">
      <button aria-label={mode === 'WEEK' ? 'Semana anterior' : 'Día anterior'} onClick={() => onSelect(shiftDay(day, -step))}>‹</button>
      <h2>{mode === 'WEEK' ? `Semana del ${dayLabel(range.startDate)}` : dayLabel(day)}</h2>
      <button aria-label={mode === 'WEEK' ? 'Semana siguiente' : 'Día siguiente'} onClick={() => onSelect(shiftDay(day, step))}>›</button></div>
      <div className="agenda-calendar-controls"><button onClick={onToday}>Hoy</button>{children}</div></header>}
    {hideHeader ? <nav className="agenda-week-strip" aria-label="Elegir día de la semana">{days.map(value => {
      const count = grouped.get(value)?.length ?? 0;
      return <button key={value} type="button" data-date={value} aria-pressed={value === day}
        aria-label={loading || failed ? dayLabel(value) : `${dayLabel(value)}, ${count} ${count === 1 ? 'evento' : 'eventos'}`}
        onClick={() => {
          onDaySelect(value);
          if (mode !== 'WEEK') return;
          window.requestAnimationFrame?.(() => weeks.current?.querySelector(`[data-week-group="${value}"]`)?.scrollIntoView({ block: 'center', behavior: 'instant' }));
        }}>
        <span>{weekday(value, 'short')}</span><b>{Number(value.slice(8))}</b>
        <small aria-hidden="true">{count || '—'}</small>
      </button>;
    })}</nav> : null}
    {mode === 'WEEK' && !loading && !failed ? <div className="agenda-week-days" ref={weeks}>{days.map(value => {
      const entries = grouped.get(value) ?? [];
      if (hideHeader && !entries.length && value !== day) return null;
      const month = new Intl.DateTimeFormat('es-AR', { month: 'short', timeZone: 'UTC' }).format(new Date(value + 'T12:00:00Z'));
      return <section className="agenda-week-row" key={value} data-week-group={value}>
        <header className="agenda-week-group-heading">
          <span>{weekday(value, 'long')}</span>
          <h3>{Number(value.slice(8))} <small>{month}</small></h3>
          {onCreateDay ? <button className="agenda-week-create" aria-label={`Crear evento para ${dayLabel(value)}`}
            type="button" disabled={busy} onClick={() => onCreateDay(value)}><FoxmindIcon name="plus" /></button> : null}
        </header>
        {entries.length ? <div className="agenda-widget-list">{agendaRows(entries, busy, item => {
          onSelect(value); onItem?.(item, value);
        }, `agenda-week-${value}`)}</div> : <p className="agenda-week-free">Este día está libre. Usá + para reservar un momento.</p>}
      </section>;
    })}</div> : null}
  </section>;
}
