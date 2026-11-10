import type { AgendaPage, AgendaRange } from '../../../../../../src/core/domain/agenda/index.ts';

export type AgendaItem = AgendaPage['items'][number];
export type CalendarMode = 'MONTH' | 'WEEK' | 'DAY';
export function calendarRange(mode: CalendarMode, day: string, month: string, timeZone: string): AgendaRange {
  if (mode === 'DAY') return { startDate: day, endDateExclusive: shiftDay(day, 1), timeZone };
  if (mode === 'WEEK') {
    const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
    const startDate = shiftDay(day, -((weekday + 6) % 7));
    return { startDate, endDateExclusive: shiftDay(startDate, 7), timeZone };
  }
  const days = monthDays(month);
  return { startDate: days[0], endDateExclusive: shiftDay(days[41], 1), timeZone };
}
export const categoryLabels = { CLASS: 'Clase', ACTIVITY: 'Actividad', EVALUATION: 'Evaluación' };
export function dateAt(instant: string | number, timeZone: string): string {
  return calendarDate(instant, new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }));
}
function calendarDate(instant: string | number, formatter: Intl.DateTimeFormat): string {
  const parts = formatter.formatToParts(new Date(instant));
  const part = (type: string) => parts.find(value => value.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function shiftDay(date: string, count: number): string {
  return new Date(Date.parse(`${date}T12:00:00Z`) + count * 86_400_000).toISOString().slice(0, 10);
}
export function monthRange(month: string, timeZone: string): AgendaRange {
  const next = new Date(`${month}-01T12:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return { startDate: `${month}-01`, endDateExclusive: next.toISOString().slice(0, 10), timeZone };
}
export function monthStep(month: string, count: number): string {
  const date = new Date(`${month}-01T12:00:00Z`); date.setUTCMonth(date.getUTCMonth() + count);
  return date.toISOString().slice(0, 7);
}
export function monthDays(month: string): string[] {
  const start = `${month}-01`, day = new Date(`${start}T12:00:00Z`).getUTCDay();
  const first = shiftDay(start, -((day + 6) % 7));
  return Array.from({ length: 42 }, (_, index) => shiftDay(first, index));
}
export function groupAgendaItemsByDay(items: AgendaItem[], days: string[], zone: string): Map<string, AgendaItem[]> {
  const grouped = new Map<string, AgendaItem[]>(days.map(day => [day, []]));
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' });
  for (const item of items) {
    if (item.kind === 'ACADEMIC_DEADLINE') {
      grouped.get(calendarDate(item.deadlineAt, formatter))?.push(item);
    } else {
      const timed = item.startAt && item.endAt;
      const first = timed ? calendarDate(item.startAt!, formatter) : item.startDate;
      const last = timed ? calendarDate(Date.parse(item.endAt!) - 1, formatter) : shiftDay(item.endDateExclusive, -1);
      for (const day of days) if (day >= first && day <= last) grouped.get(day)!.push(item);
    }
  }
  return grouped;
}
export function onDay(item: AgendaItem, day: string, zone: string): boolean {
  if (item.kind === 'ACADEMIC_DEADLINE') return dateAt(item.deadlineAt, zone) === day;
  if (item.startAt && item.endAt) return dateAt(item.startAt, zone) <= day && day <= dateAt(Date.parse(item.endAt) - 1, zone);
  return item.startDate <= day && day < item.endDateExclusive;
}
export function dayLabel(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString('es-AR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
}
export function deadlineLabel(instant: string, timeZone: string): string {
  return `${new Date(instant).toLocaleString('es-AR', { timeZone, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · ${timeZone}`;
}
