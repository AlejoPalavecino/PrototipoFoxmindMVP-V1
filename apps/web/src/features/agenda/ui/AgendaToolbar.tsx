import { calendarRange, dayLabel, shiftDay, type CalendarMode } from '../model/calendar.ts';

export function AgendaToolbar({ mode, day, month, zone, onMode, onSelect, onMonth, onToday }: {
  mode: CalendarMode; day: string; month: string; zone: string;
  onMode: (mode: CalendarMode) => void; onSelect: (day: string) => void;
  onMonth: (direction: number) => void; onToday: () => void;
}) {
  const title = mode === 'MONTH'
    ? new Date(`${month}-01T12:00:00Z`).toLocaleDateString('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    : mode === 'WEEK' ? `Semana del ${dayLabel(calendarRange(mode, day, month, zone).startDate)}` : dayLabel(day);
  const unit = { MONTH: 'Mes', WEEK: 'Semana', DAY: 'Día' }[mode];
  const move = (direction: number) => mode === 'MONTH' ? onMonth(direction) : onSelect(shiftDay(day, direction * (mode === 'WEEK' ? 7 : 1)));
  return <header className="agenda-toolbar">
    <div className="agenda-toolbar-period">
      <button aria-label={`${unit} anterior`} onClick={() => move(-1)}>‹</button>
      <h2 aria-live="polite">{title}</h2>
      <button aria-label={`${unit} siguiente`} onClick={() => move(1)}>›</button>
    </div>
    <div className="agenda-toolbar-actions"><button onClick={onToday}>Hoy</button>
      <nav className="agenda-mode-controls" aria-label="Vista de agenda">{(['MONTH', 'WEEK', 'DAY'] as const).map(value =>
        <button key={value} aria-pressed={mode === value} onClick={() => onMode(value)}>{{ MONTH: 'Mes', WEEK: 'Semana', DAY: 'Día' }[value]}</button>)}</nav>
    </div>
  </header>;
}
