import type { AgendaItem } from './calendar.ts';
import { useMemo, useRef, useState, type ReactNode, type KeyboardEvent } from 'react';
import { dateAt, dayLabel, groupAgendaItemsByDay, monthDays } from './calendar.ts';
import { eventColorClass } from './event-colors.ts';
import { AgendaLegend } from './AgendaLegend.tsx';
import { FoxmindIcon } from '../shared-ui/index.ts';
import { deadlineParts, eventTimeLabel } from './agenda-presentation.ts';

const dayOffsets: Readonly<Record<string, number>> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

export function AgendaMonth({ month, selected, zone, items, onSelect, onMonth, onToday, loading, children }: {
  children?: ReactNode; month: string; selected: string; zone: string; items: AgendaItem[]; loading: boolean;
  onSelect: (day: string) => void; onMonth: (direction: number) => void; onToday: () => void;
}) {
  const heading = new Date(`${month}-01T12:00:00Z`).toLocaleDateString('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const today = dateAt(Date.now(), zone);
  const days = useMemo(() => monthDays(month), [month]);
  const grouped = useMemo(() => groupAgendaItemsByDay(items, days, zone), [items, days, zone]);
  const grid = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState<{ month: string; day: string }>();
  const tabDay = focused?.month === month ? focused.day : days.includes(selected) ? selected : `${month}-01`;
  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const offset = dayOffsets[event.key];
    if (offset === undefined && event.key !== 'Home' && event.key !== 'End') return;
    event.preventDefault();
    const next = offset !== undefined ? index + offset : index - index % 7 + (event.key === 'End' ? 6 : 0);
    if (days[next]) grid.current?.querySelector<HTMLButtonElement>(`[data-calendar-day="${days[next]}"]`)?.focus();
  }
  return <section className="agenda-calendar fm3d-agenda-card" aria-label="Calendario mensual" aria-busy={loading}>
    <header className="agenda-month-head">
      <div className="agenda-period-title"><button aria-label="Mes anterior" onClick={() => onMonth(-1)}>‹</button>
        <h3 aria-live="polite">{heading}</h3><button aria-label="Mes siguiente" onClick={() => onMonth(1)}>›</button></div>
      <div className="agenda-calendar-controls"><button className="agenda-today-control" onClick={onToday}>Hoy</button>{children}</div>
    </header>
    <div className="agenda-week" aria-hidden="true">{['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => <span key={day}>{day}</span>)}</div>
    <div className="agenda-grid" ref={grid}>{days.map((day, index) => {
      const entries = grouped.get(day)!;
      return <button key={day} className={`agenda-day${day.startsWith(month) ? '' : ' agenda-outside'}${day === today ? ' agenda-today' : ''}`}
        aria-current={day === today ? 'date' : undefined} aria-pressed={selected === day} aria-label={`${dayLabel(day)}${day === today ? ', hoy' : ''}${entries.length ? `, ${entries.length} eventos o entregas` : ''}`}
        data-calendar-day={day} tabIndex={day === tabDay ? 0 : -1} onFocus={() => setFocused({ month, day })}
        onKeyDown={event => moveFocus(event, index)} onClick={() => onSelect(day)}><span className="agenda-day-number">{Number(day.slice(-2))}</span>
        <span className="agenda-day-preview" aria-hidden="true">{entries.slice(0, 2).map(item => <span key={item.kind === 'PRIVATE_EVENT' ? item.occurrenceId : item.id}
          className={`agenda-dot ${item.kind === 'PRIVATE_EVENT' ? eventColorClass(item.event) : 'deadline'}`}><FoxmindIcon name={item.kind === 'PRIVATE_EVENT' ? 'lock' : 'file'} /><span><b>{item.kind === 'PRIVATE_EVENT' ? eventTimeLabel(item) : deadlineParts(item.deadlineAt, item.timeZone).time}</b><span>{item.kind === 'PRIVATE_EVENT' ? item.event.title : item.title}</span></span></span>)}
          {entries.length > 2 ? <small>+{entries.length - 2} más</small> : null}</span>
        {entries.length ? <span className="agenda-day-count" aria-hidden="true">{entries.length}</span> : null}
        <span className="agenda-day-indicators" aria-hidden="true">{entries.slice(0, 3).map(item => <span
          key={item.kind === 'PRIVATE_EVENT' ? item.occurrenceId : item.id}
          className={`agenda-color-indicator ${item.kind === 'PRIVATE_EVENT' ? eventColorClass(item.event) : 'deadline'}`} />)}</span>
      </button>;
    })}</div>
    <AgendaLegend />
  </section>;
}
