import type { AgendaItem } from './calendar.ts';
import { dayLabel, monthDays, onDay } from './calendar.ts';
import { eventColorClass } from './event-colors.ts';

export function AgendaMonth({ month, selected, zone, items, onSelect, onMonth, loading }: {
  month: string; selected: string; zone: string; items: AgendaItem[]; loading: boolean;
  onSelect: (day: string) => void; onMonth: (direction: number) => void;
}) {
  const heading = new Date(`${month}-01T12:00:00Z`).toLocaleDateString('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return <section className="agenda-calendar folder-panel tone-mint" aria-label="Calendario mensual" aria-busy={loading}>
    <h2 className="folder-tab">Mi calendario</h2>
    <header className="agenda-month-head">
      <button aria-label="Mes anterior" onClick={() => onMonth(-1)}>‹</button><h3 aria-live="polite">{heading}</h3>
      <button aria-label="Mes siguiente" onClick={() => onMonth(1)}>›</button>
    </header>
    <div className="agenda-week" aria-hidden="true">{['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => <span key={day}>{day}</span>)}</div>
    <div className="agenda-grid">{monthDays(month).map(day => {
      const entries = items.filter(item => onDay(item, day, zone));
      return <button key={day} className={`agenda-day${day.startsWith(month) ? '' : ' agenda-outside'}`}
        aria-pressed={selected === day} aria-label={`${dayLabel(day)}${entries.length ? `, ${entries.length} eventos o entregas` : ''}`}
        onClick={() => onSelect(day)}><span className="agenda-day-number">{Number(day.slice(-2))}</span>
        <span className="agenda-day-preview" aria-hidden="true">{entries.slice(0, 2).map(item => <span key={item.kind === 'PRIVATE_EVENT' ? item.occurrenceId : item.id}
          className={`agenda-dot ${item.kind === 'PRIVATE_EVENT' ? eventColorClass(item.event) : 'deadline'}`}>{item.kind === 'PRIVATE_EVENT' ? item.event.title : item.title}</span>)}
          {entries.length > 2 ? <small>+{entries.length - 2} más</small> : null}</span>
        {entries.length ? <span className="agenda-day-count" aria-hidden="true">{entries.length}</span> : null}
        <span className="agenda-day-indicators" aria-hidden="true">{entries.slice(0, 3).map(item => <span
          key={item.kind === 'PRIVATE_EVENT' ? item.occurrenceId : item.id}
          className={`agenda-color-indicator ${item.kind === 'PRIVATE_EVENT' ? eventColorClass(item.event) : 'deadline'}`} />)}</span>
      </button>;
    })}</div>
    <p className="agenda-calendar-note">Elegí un día para ver sus eventos y entregas.</p>
  </section>;
}
