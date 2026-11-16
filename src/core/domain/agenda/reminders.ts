import { agendaEventOccurrences } from './series.ts';
import { resolveAgendaMinute } from './time.ts';
import type { PrivateEvent } from './types.ts';
import { localMinuteAt } from './values.ts';

function startOfDay(date: string, zone: string) {
  const local = date + 'T00:00';
  try {
    return Date.parse(resolveAgendaMinute(local, zone));
  } catch (error) {
    const choices = (error as { details?: { choices: { instant: string }[] } }).details?.choices;
    if (choices?.length) return Math.min(...choices.map(choice => Date.parse(choice.instant)));
    // A midnight offset change can skip midnight or the whole date.
    const approximate = Date.parse(date);
    let low = -26 * 60, high = 26 * 60;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (localMinuteAt(approximate + middle * 60_000, zone) < local) low = middle + 1;
      else high = middle;
    }
    return approximate + low * 60_000;
  }
}

export function agendaEventNotices(source: PrivateEvent, now: string) {
  if (!source.reminder && !source.exceptions?.some(item => item.replacement?.reminder)) return [];
  const until = Date.parse(now), created = Date.parse(source.createdAt);
  return agendaEventOccurrences(source).flatMap(({ date, event }) => {
    if (!event.reminder) return [];
    const { schedule, reminder } = event;
    const local = schedule.kind === 'TIMED' ? schedule.startLocal : schedule.startDate + 'T00:00';
    if (Date.parse(local + ':00Z') > until + 2 * 86_400_000) return [];
    const starting = schedule.kind === 'TIMED'
      ? Date.parse(resolveAgendaMinute(schedule.startLocal, schedule.timeZone, schedule.startOffsetMinutes))
      : startOfDay(schedule.startDate, reminder.timeZone!);
    const due = starting - reminder.minutes * 60_000;
    if (due > until || starting < created) return [];
    return [{ occurrenceDate: date, title: event.title, startsAt: new Date(starting).toISOString(),
      createdAt: new Date(Math.max(due, created)).toISOString() }];
  });
}
