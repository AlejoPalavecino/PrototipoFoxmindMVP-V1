import { parseAgendaEvent, type EventPayload, type PrivateEvent } from '../../../../../../src/core/domain/agenda/index.ts';
import { shiftDay } from '../model/calendar.ts';
import type { EventDraft } from './event-draft-types.ts';
export type { EventDraft } from './event-draft-types.ts';
export { changeDraftStart, changeDraftEnd, setDraftDuration, toggleAllDay,
  changeDraftZone, changeDraftUntil } from './event-draft-time.ts';

export function eventDraft(event: PrivateEvent | undefined, day: string, zone: string): EventDraft {
  const schedule = event?.schedule, timed = schedule?.kind === 'TIMED' ? schedule : undefined;
  const startDate = schedule?.kind === 'ALL_DAY' ? schedule.startDate : timed?.startLocal.slice(0, 10) ?? day;
  return {
    title: event?.title ?? '', description: event?.description ?? '', category: event?.category ?? 'CLASS',
    color: event ? event.color ?? 'AUTO' : 'GREEN',
    reminderMinutes: event?.reminder?.minutes,
    allDay: schedule?.kind === 'ALL_DAY', startDate,
    endDate: schedule?.kind === 'ALL_DAY' ? shiftDay(schedule.endDateExclusive, -1) : timed?.endLocal.slice(0, 10) ?? day,
    startTime: timed?.startLocal.slice(11) ?? '09:00', endTime: timed?.endLocal.slice(11) ?? '10:00',
    zone: timed?.timeZone ?? event?.reminder?.timeZone ?? zone, weekly: !!event && event.repeat.kind !== 'NONE',
    frequency: event && event.repeat.kind !== 'NONE' ? event.repeat.kind : 'WEEKLY',
    until: event && event.repeat.kind !== 'NONE' ? event.repeat.untilDate : shiftDay(startDate, 28),
    untilEdited: !!event && event.repeat.kind !== 'NONE', endMode: event ? 'MANUAL' : 'DURATION', durationMinutes: 60,
    ...(timed?.startOffsetMinutes === undefined ? {} : { startOffset: timed.startOffsetMinutes }),
    ...(timed?.endOffsetMinutes === undefined ? {} : { endOffset: timed.endOffsetMinutes }),
  };
}
export function draftPayload(draft: EventDraft): EventPayload {
  const schedule = draft.allDay
    ? { kind: 'ALL_DAY', startDate: draft.startDate, endDateExclusive: shiftDay(draft.endDate, 1) }
    : { kind: 'TIMED', timeZone: draft.zone, startLocal: `${draft.startDate}T${draft.startTime}`,
      endLocal: `${draft.endDate}T${draft.endTime}`,
      ...(draft.startOffset === undefined ? {} : { startOffsetMinutes: draft.startOffset }),
      ...(draft.endOffset === undefined ? {} : { endOffsetMinutes: draft.endOffset }) };
  return parseAgendaEvent({ title: draft.title, description: draft.description, category: draft.category, schedule,
    ...(draft.reminderMinutes === undefined ? {} : { reminder: { minutes: draft.reminderMinutes,
      ...(draft.allDay ? { timeZone: draft.zone } : {}) } }),
    ...(draft.color === 'AUTO' ? {} : { color: draft.color }),
    repeat: draft.weekly ? { kind: draft.frequency ?? 'WEEKLY', untilDate: draft.until } : { kind: 'NONE' } });
}
function comparable(draft: EventDraft): unknown {
  return { title: draft.title.trim(), description: draft.description, category: draft.category,
    color: draft.color, reminderMinutes: draft.reminderMinutes,
    ...(draft.allDay && draft.reminderMinutes !== undefined ? { zone: draft.zone } : {}),
    startDate: draft.startDate, endDate: draft.endDate, allDay: draft.allDay,
    ...(draft.allDay ? {} : { startTime: draft.startTime, endTime: draft.endTime, zone: draft.zone,
      startOffset: draft.startOffset, endOffset: draft.endOffset }),
    weekly: draft.weekly, ...(draft.weekly ? { until: draft.until, frequency: draft.frequency ?? 'WEEKLY' } : {}) };
}
export function isDraftDirty(draft: EventDraft, baseline: EventDraft): boolean {
  return JSON.stringify(comparable(draft)) !== JSON.stringify(comparable(baseline));
}
