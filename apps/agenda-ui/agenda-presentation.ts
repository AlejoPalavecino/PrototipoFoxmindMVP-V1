import type { EventOccurrence } from '../../src/core/domain/index.ts';

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function selectedDayHeading(day: string): { title: string; subtitle: string } {
  const date = new Date(`${day}T12:00:00Z`);
  const format = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', ...options }).format(date);
  return {
    title: capitalize(format({ weekday: 'long', day: 'numeric' })),
    subtitle: capitalize(format({ month: 'long', year: 'numeric' })),
  };
}

export function deadlineParts(instant: string, timeZone: string): { day: string; month: string; time: string } {
  const date = new Date(instant);
  const format = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-AR', { timeZone, ...options }).format(date);
  return {
    day: format({ day: 'numeric' }),
    month: format({ month: 'short' }).replace(/\./g, '').toUpperCase(),
    time: format({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }),
  };
}

export function eventTimeLabel(item: EventOccurrence): string {
  if (item.event.schedule.kind === 'ALL_DAY') return 'Día completo';
  const timeZone = item.event.schedule.timeZone;
  const start = new Date(item.startAt!), end = new Date(item.endAt!);
  const localDay = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric' });
  const sameDay = localDay.format(start) === localDay.format(end);
  const clock = new Intl.DateTimeFormat('es-AR', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const date = new Intl.DateTimeFormat('es-AR', { timeZone, day: 'numeric', month: 'short' });
  const label = (instant: Date) => sameDay ? clock.format(instant) : `${date.format(instant).replace(/\./g, '')}, ${clock.format(instant)}`;
  return `${label(start)} – ${label(end)}`;
}
