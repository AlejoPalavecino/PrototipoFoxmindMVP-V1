import type { AgendaTarget, PrivateEvent } from '../../src/core/domain/index.ts';
import { dateAt, dayLabel, shiftDay, type AgendaItem } from './calendar.ts';
import { eventColorClass } from './event-colors.ts';
import { FoxmindIcon } from '../shared-ui/FoxmindIcon';

export function afterDayEntries(items: AgendaItem[], day: string, zone: string) {
  const start = shiftDay(day, 1), end = shiftDay(day, 32), seen = new Set<string>();
  return items.flatMap(item => {
    const first = item.kind === 'ACADEMIC_DEADLINE' ? dateAt(item.deadlineAt, zone) : item.startAt ? dateAt(item.startAt, zone) : item.startDate;
    const last = item.kind === 'ACADEMIC_DEADLINE' ? first : item.endAt ? dateAt(Date.parse(item.endAt) - 1, zone) : shiftDay(item.endDateExclusive, -1);
    const key = item.kind === 'ACADEMIC_DEADLINE' ? item.id : item.occurrenceId;
    if (last < start || first >= end || seen.has(key)) return [];
    seen.add(key);
    return [{ item, day: first < start ? start : first, order: item.kind === 'ACADEMIC_DEADLINE' ? item.deadlineAt : item.startAt ?? `${first}T00:00:00` }];
  }).sort((a,b) => a.day.localeCompare(b.day) || a.order.localeCompare(b.order)).slice(0,3);
}

export function AgendaAfterDay({ day, zone, items, loading, error, busy, onRetry, onEdit, onOpen }: {
  day: string; zone: string; items: AgendaItem[]; loading: boolean; error: string; busy: boolean;
  onRetry: () => void; onEdit: (event: PrivateEvent) => void; onOpen: (target: AgendaTarget) => void;
}) {
  const entries = afterDayEntries(items, day, zone);
  return <aside className="agenda-after-day fm3d-agenda-card" aria-label="Después de este día"><h3>Después de este día</h3>
    {loading ? <p role="status">Consultando los próximos eventos…</p> : error ? <div role="alert"><p>No pudimos consultar los próximos eventos.</p><button onClick={onRetry}>Volver a intentar</button></div>
      : entries.length ? <div>{entries.map(({item,day: date}) => <button type="button" disabled={busy} className={`agenda-after-item ${item.kind === 'PRIVATE_EVENT' ? eventColorClass(item.event) : 'agenda-after-deadline'}`} key={item.kind === 'PRIVATE_EVENT' ? item.occurrenceId : item.id}
        onClick={() => item.kind === 'PRIVATE_EVENT' ? onEdit(item.event) : onOpen(item.target)}><i aria-hidden="true"/><span><strong>{item.kind === 'PRIVATE_EVENT' ? item.event.title : item.title}</strong><small>{dayLabel(date)}{item.kind === 'PRIVATE_EVENT' ? ' · Personal · Solo vos' : ` · ${item.classroomName}`}</small></span><FoxmindIcon name="chevron-right" /></button>)}</div>
      : <p className="agenda-after-empty">Todavía no hay eventos próximos en los 31 días consultados.</p>}
  </aside>;
}
