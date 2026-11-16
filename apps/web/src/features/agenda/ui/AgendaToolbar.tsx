import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import { calendarRange, dayLabel, shiftDay, type CalendarMode } from '../model/calendar.ts';

export function AgendaToolbar({ mode, day, month, zone, onMode, onSelect, onMonth, onToday }: {
  mode: CalendarMode; day: string; month: string; zone: string;
  onMode: (mode: CalendarMode) => void; onSelect: (day: string) => void;
  onMonth: (direction: number) => void; onToday: () => void;
}) {
  const title = periodTitle(mode, day, month, zone);
  const unit = { MONTH: 'Mes', WEEK: 'Semana', DAY: 'Día' }[mode];
  const move = (direction: number) => mode === 'MONTH' ? onMonth(direction) : onSelect(shiftDay(day, direction * (mode === 'WEEK' ? 7 : 1)));
  return <><header className="agenda-toolbar">
    <div className="agenda-toolbar-period">
      <button aria-label={`${unit} anterior`} onClick={() => move(-1)}><FoxmindIcon name="arrow-left" /></button>
      <h2 aria-live="polite">{mode === 'MONTH' ? <><strong>{title.slice(0, -5)}</strong> <span className="agenda-period-year">{month.slice(0, 4)}</span></> : title}</h2>
      <button aria-label={`${unit} siguiente`} onClick={() => move(1)}><FoxmindIcon name="arrow-right" /></button>
    </div>
    <div className="agenda-toolbar-actions">
      <nav className="agenda-mode-controls" aria-label="Vista de agenda">{(['MONTH', 'WEEK', 'DAY'] as const).map(value =>
        <button key={value} aria-pressed={mode === value} onClick={() => onMode(value)}>{{ MONTH: 'Mes', WEEK: 'Semana', DAY: 'Día' }[value]}</button>)}</nav>
    </div>
  </header><div className="agenda-context">
    <span><FoxmindIcon name="lock" />Agenda personal</span>
    <button type="button" onClick={onToday}><FoxmindIcon name="calendar" />Hoy</button>
  </div></>;
}

function periodTitle(mode: CalendarMode, day: string, month: string, zone: string) {
  const date = (value: string) => new Date(`${value}T12:00:00Z`);
  const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
  if (mode === 'DAY') return capitalize(dayLabel(day));
  if (mode === 'WEEK') {
    const { startDate } = calendarRange(mode, day, month, zone);
    const label = (value: string) => new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' })
      .formatToParts(date(value)).filter(part => part.type === 'day' || part.type === 'month')
      .map(part => part.value.replace(/\.$/, '')).join(' ');
    return `${label(startDate)} — ${label(shiftDay(startDate, 6))}`;
  }
  const monthLabel = date(month + '-01').toLocaleDateString('es-AR', { month: 'long', timeZone: 'UTC' });
  return `${capitalize(monthLabel)} ${month.slice(0, 4)}`;
}
