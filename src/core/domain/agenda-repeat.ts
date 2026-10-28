import type { EventRepeat } from './agenda.ts';
import { agendaDate, invalid, shiftDate } from './agenda-values.ts';

/** Monthly series keep the original day number and skip months that lack it. */
export function agendaRepeatDates(start: string, repeat: EventRepeat): string[] {
  agendaDate(start);
  if (repeat.kind === 'NONE') return [start];
  const until = agendaDate(repeat.untilDate);
  if (until < start) return invalid();
  if (repeat.kind !== 'MONTHLY') {
    const step = repeat.kind === 'DAILY' ? 1 : 7;
    const count = Math.floor((Date.parse(until) - Date.parse(start)) / (step * 86400000)) + 1;
    if (count > 53) return invalid();
    return Array.from({ length: count }, (_, index) => shiftDate(start, index * step));
  }
  const [year, month, day] = start.split('-').map(Number), dates: string[] = [];
  const boundary = new Date(Date.UTC(year + 8, month - 1, day)).toISOString().slice(0, 10);
  if (until >= boundary) return invalid();
  for (let offset = 0; offset < 96; offset++) {
    const date = new Date(Date.UTC(year, month - 1 + offset, day));
    const value = date.toISOString().slice(0, 10);
    if (value > until) break;
    if (date.getUTCDate() !== day) continue;
    dates.push(value);
    if (dates.length > 53) return invalid();
  }
  return dates;
}
