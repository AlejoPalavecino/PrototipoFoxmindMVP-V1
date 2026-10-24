import { parseAgendaEvent, type EventKind, type EventPayload, type PrivateEvent } from '../../src/core/domain/index.ts';
import { shiftDay } from './calendar.ts';

export interface EventDraft {
  title: string; description: string; category: EventKind; allDay: boolean;
  start: string; end: string; zone: string; weekly: boolean; until: string;
  startOffset: string; endOffset: string;
}
export function eventDraft(event: PrivateEvent | undefined, day: string, zone: string): EventDraft {
  const schedule = event?.schedule;
  return {
    title: event?.title ?? '', description: event?.description ?? '', category: event?.category ?? 'CLASS',
    allDay: schedule?.kind === 'ALL_DAY',
    start: schedule?.kind === 'ALL_DAY' ? schedule.startDate : schedule?.startLocal ?? `${day}T09:00`,
    end: schedule?.kind === 'ALL_DAY' ? shiftDay(schedule.endDateExclusive, -1) : schedule?.endLocal ?? `${day}T10:00`,
    zone: schedule?.kind === 'TIMED' ? schedule.timeZone : zone,
    weekly: event?.repeat.kind === 'WEEKLY', until: event?.repeat.kind === 'WEEKLY' ? event.repeat.untilDate : day,
    startOffset: schedule?.kind === 'TIMED' && schedule.startOffsetMinutes !== undefined ? String(schedule.startOffsetMinutes) : '',
    endOffset: schedule?.kind === 'TIMED' && schedule.endOffsetMinutes !== undefined ? String(schedule.endOffsetMinutes) : '',
  };
}
export function draftPayload(draft: EventDraft): EventPayload {
  const schedule = draft.allDay ? { kind: 'ALL_DAY', startDate: draft.start.slice(0, 10), endDateExclusive: shiftDay(draft.end.slice(0, 10), 1) }
    : { kind: 'TIMED', timeZone: draft.zone, startLocal: draft.start, endLocal: draft.end,
      ...(draft.startOffset === '' ? {} : { startOffsetMinutes: Number(draft.startOffset) }),
      ...(draft.endOffset === '' ? {} : { endOffsetMinutes: Number(draft.endOffset) }) };
  return parseAgendaEvent({ title: draft.title, description: draft.description, category: draft.category, schedule,
    repeat: draft.weekly ? { kind: 'WEEKLY', untilDate: draft.until } : { kind: 'NONE' } });
}
export function toggleAllDay(draft: EventDraft, allDay: boolean): EventDraft {
  return { ...draft, allDay, start: `${draft.start.slice(0, 10)}${allDay ? '' : 'T09:00'}`, end: `${draft.end.slice(0, 10)}${allDay ? '' : 'T10:00'}`, startOffset: '', endOffset: '' };
}
export function eventFailure(failure: unknown): string {
  const error = failure as { message?: string; code?: string; details?: unknown };
  const message = error.code === 'INVALID_INPUT' ? 'Revisá las fechas y la zona: el fin debe ser posterior y cada horario de la serie debe existir sin ambigüedad.' : error.message ?? 'No se pudo completar la acción.';
  return error.details ? `${message} Detalle temporal: ${JSON.stringify(error.details)}` : message;
}
