import type { AgendaRange, EventPayload, EventRepeat, EventSchedule } from './types.ts';
import { EVENT_COLORS, EVENT_REMINDER_MINUTES } from './types.ts';
import { agendaDate, agendaMinute, agendaObject, agendaZone, invalid } from './values.ts';
import { validateAgendaSeries } from './series.ts';

function parseSchedule(input: unknown): EventSchedule {
  const item = agendaObject(input, ['kind', 'timeZone', 'startLocal', 'endLocal',
    'startOffsetMinutes', 'endOffsetMinutes', 'startDate', 'endDateExclusive']);
  if (item.kind === 'ALL_DAY') {
    agendaObject(item, ['kind', 'startDate', 'endDateExclusive']);
    return { kind: 'ALL_DAY', startDate: agendaDate(item.startDate), endDateExclusive: agendaDate(item.endDateExclusive) };
  }
  if (item.kind !== 'TIMED') return invalid();
  agendaObject(item, ['kind', 'timeZone', 'startLocal', 'endLocal', 'startOffsetMinutes', 'endOffsetMinutes']);
  const result: EventSchedule = { kind: 'TIMED', timeZone: agendaZone(item.timeZone),
    startLocal: agendaMinute(item.startLocal), endLocal: agendaMinute(item.endLocal) };
  if (result.endLocal <= result.startLocal) return invalid();
  for (const key of ['startOffsetMinutes', 'endOffsetMinutes'] as const) {
    if (item[key] !== undefined) {
      if (!Number.isInteger(item[key])) return invalid();
      result[key] = item[key] as number;
    }
  }
  return result;
}
function parseRepeat(input: unknown): EventRepeat {
  const item = agendaObject(input, ['kind', 'untilDate']);
  if (item.kind === 'NONE') { agendaObject(item, ['kind']); return { kind: 'NONE' }; }
  if (item.kind !== 'DAILY' && item.kind !== 'WEEKLY' && item.kind !== 'MONTHLY') return invalid();
  return { kind: item.kind, untilDate: agendaDate(item.untilDate) };
}
export function parseAgendaEvent(input: unknown): EventPayload {
  const item = agendaObject(input, ['title', 'description', 'category', 'schedule', 'repeat', 'color', 'reminder']);
  if (typeof item.title !== 'string' || !item.title.trim() || item.title.trim().length > 160
    || typeof item.description !== 'string' || item.description.length > 4000
    || !['CLASS', 'ACTIVITY', 'EVALUATION'].includes(String(item.category)) || typeof item.category !== 'string') return invalid();
  const payload: EventPayload = { title: item.title.trim(), description: item.description,
    category: item.category as EventPayload['category'], schedule: parseSchedule(item.schedule), repeat: parseRepeat(item.repeat) };
  if (item.color !== undefined) {
    if (typeof item.color !== 'string' || !EVENT_COLORS.some(color => color === item.color)) return invalid();
    payload.color = item.color as NonNullable<EventPayload['color']>;
  }
  if (item.reminder !== undefined) {
    const allDay = payload.schedule.kind === 'ALL_DAY';
    const reminder = agendaObject(item.reminder, allDay ? ['minutes', 'timeZone'] : ['minutes']);
    const minutes = EVENT_REMINDER_MINUTES.find(value => value === reminder.minutes);
    if (minutes === undefined) return invalid();
    payload.reminder = allDay ? { minutes, timeZone: agendaZone(reminder.timeZone) } : { minutes };
  }
  validateAgendaSeries(payload);
  return payload;
}
export function parseAgendaRange(input: unknown): AgendaRange {
  const item = agendaObject(input, ['startDate', 'endDateExclusive', 'timeZone']);
  const range = { startDate: agendaDate(item.startDate), endDateExclusive: agendaDate(item.endDateExclusive), timeZone: agendaZone(item.timeZone) };
  const days = (Date.parse(range.endDateExclusive) - Date.parse(range.startDate)) / 86400000;
  if (days < 1 || days > 93) return invalid();
  return range;
}
