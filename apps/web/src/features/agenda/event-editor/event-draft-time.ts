import { shiftDay } from '../model/calendar.ts';
import type { EventDraft } from './event-draft-types.ts';

export function validDraftDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const instant = Date.parse(`${value}T12:00:00Z`);
  return Number.isFinite(instant) && new Date(instant).toISOString().slice(0, 10) === value;
}
export function validDraftTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
function durationEnd(draft: EventDraft): EventDraft {
  if (!validDraftDate(draft.startDate) || !validDraftTime(draft.startTime)) return draft;
  const instant = new Date(Date.parse(`${draft.startDate}T${draft.startTime}:00Z`) + draft.durationMinutes * 60_000);
  const endDate = instant.toISOString().slice(0, 10), endTime = instant.toISOString().slice(11, 16);
  const moved = endDate !== draft.endDate || endTime !== draft.endTime;
  return { ...draft, endDate, endTime, ...(moved ? { endOffset: undefined } : {}) };
}
export function changeDraftStart(draft: EventDraft, value: { date?: string; time?: string }): EventDraft {
  const changed = (value.date !== undefined && value.date !== draft.startDate)
    || (value.time !== undefined && value.time !== draft.startTime);
  const next = { ...draft, startDate: value.date ?? draft.startDate, startTime: value.time ?? draft.startTime,
    ...(changed ? { startOffset: undefined } : {}) };
  if (!next.untilEdited && validDraftDate(next.startDate)) next.until = shiftDay(next.startDate, 28);
  if (next.startDate !== draft.startDate && (draft.allDay || draft.endMode === 'MANUAL') &&
      draft.endDate === draft.startDate && validDraftDate(next.startDate)) {
    // A single date is one control in the editor; its hidden end date follows it.
    next.endDate = next.startDate;
    next.endOffset = undefined;
  }
  return changed && !next.allDay && next.endMode === 'DURATION' ? durationEnd(next) : next;
}
export function setDraftDuration(draft: EventDraft, minutes: 30 | 60 | 90): EventDraft {
  return durationEnd({ ...draft, durationMinutes: minutes, endMode: 'DURATION' });
}
export function changeDraftEnd(draft: EventDraft, value: { date?: string; time?: string }): EventDraft {
  const changed = (value.date !== undefined && value.date !== draft.endDate)
    || (value.time !== undefined && value.time !== draft.endTime);
  return { ...draft, endDate: value.date ?? draft.endDate, endTime: value.time ?? draft.endTime,
    endMode: 'MANUAL', ...(changed ? { endOffset: undefined } : {}) };
}
export function toggleAllDay(draft: EventDraft, allDay: boolean): EventDraft {
  return { ...draft, allDay };
}
export function changeDraftZone(draft: EventDraft, zone: string): EventDraft {
  return zone === draft.zone ? draft : { ...draft, zone, startOffset: undefined, endOffset: undefined };
}
export function changeDraftUntil(draft: EventDraft, until: string): EventDraft {
  return { ...draft, until, untilEdited: true };
}
