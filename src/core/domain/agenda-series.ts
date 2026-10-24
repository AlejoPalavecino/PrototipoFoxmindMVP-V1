import type { AgendaRange, EventOccurrence, EventPayload, EventSchedule, PrivateEvent } from './agenda.ts';
import { agendaDate, invalid, localMinuteAt, shiftDate } from './agenda-values.ts';
import { scheduleInstants } from './agenda-time.ts';

export function seriesSchedules(payload: EventPayload): EventSchedule[] {
  const schedule = payload.schedule;
  const start = schedule.kind === 'TIMED' ? schedule.startLocal.slice(0, 10) : schedule.startDate;
  const until = payload.repeat.kind === 'NONE' ? start : agendaDate(payload.repeat.untilDate);
  const count = Math.floor((Date.parse(until) - Date.parse(start)) / 604800000) + 1;
  if (count < 1 || count > 53 || until < start) return invalid();
  return Array.from({ length: count }, (_, index) => {
    const days = index * 7;
    if (schedule.kind === 'ALL_DAY') return { ...schedule,
      startDate: shiftDate(schedule.startDate, days), endDateExclusive: shiftDate(schedule.endDateExclusive, days) };
    // Offsets disambiguate the first occurrence only. Future ambiguous dates require another schedule.
    return { kind: 'TIMED', timeZone: schedule.timeZone,
      startLocal: shiftDate(start, days) + schedule.startLocal.slice(10),
      endLocal: shiftDate(schedule.endLocal.slice(0, 10), days) + schedule.endLocal.slice(10),
      ...(index === 0 && schedule.startOffsetMinutes !== undefined ? { startOffsetMinutes: schedule.startOffsetMinutes } : {}),
      ...(index === 0 && schedule.endOffsetMinutes !== undefined ? { endOffsetMinutes: schedule.endOffsetMinutes } : {}),
    };
  });
}
export function validateAgendaSeries(payload: EventPayload): void {
  for (const schedule of seriesSchedules(payload)) {
    if (schedule.kind === 'TIMED') scheduleInstants(schedule);
    else if (schedule.endDateExclusive <= schedule.startDate) invalid();
  }
}
function occurrence(event: PrivateEvent, schedule: EventSchedule, range: AgendaRange): EventOccurrence {
  if (schedule.kind === 'ALL_DAY') return { kind: 'PRIVATE_EVENT', event,
    occurrenceId: `${event.id}:${schedule.startDate}`, startDate: schedule.startDate,
    endDateExclusive: schedule.endDateExclusive, startAt: null, endAt: null };
  const { startAt, endAt } = scheduleInstants(schedule);
  return { kind: 'PRIVATE_EVENT', event, occurrenceId: `${event.id}:${schedule.startLocal.slice(0, 10)}`,
    startDate: localMinuteAt(Date.parse(startAt), range.timeZone).slice(0, 10),
    endDateExclusive: shiftDate(localMinuteAt(Date.parse(endAt) - 1, range.timeZone).slice(0, 10), 1),
    startAt, endAt };
}
export function expandAgendaEvent(event: PrivateEvent, range: AgendaRange): EventOccurrence[] {
  return seriesSchedules(event).filter(schedule => canOverlap(schedule, range))
    .map(schedule => occurrence(event, schedule, range))
    .filter(item => item.startDate < range.endDateExclusive && item.endDateExclusive > range.startDate);
}
function canOverlap(schedule: EventSchedule, range: AgendaRange): boolean {
  if (schedule.kind === 'ALL_DAY')
    return schedule.startDate < range.endDateExclusive && schedule.endDateExclusive > range.startDate;
  // This cheap wall-clock bound includes the full 26-hour difference between supported zones.
  // Resolve actual offsets only for possible overlaps; saving still validates every occurrence.
  const margin = 2 * 86400000;
  const earliest = Date.parse(`${range.startDate}T00:00:00Z`) - margin;
  const latest = Date.parse(`${range.endDateExclusive}T00:00:00Z`) + margin;
  return Date.parse(`${schedule.startLocal}:00Z`) < latest && Date.parse(`${schedule.endLocal}:00Z`) > earliest;
}
