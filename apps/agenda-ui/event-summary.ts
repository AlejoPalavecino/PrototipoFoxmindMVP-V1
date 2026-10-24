import { dayLabel, shiftDay } from './calendar.ts';
import { validDraftDate } from './event-draft-time.ts';
import type { EventDraft, RepeatPreview } from './event-draft-types.ts';

export function repeatPreview(draft: EventDraft): RepeatPreview | null {
  if (!draft.weekly || !validDraftDate(draft.startDate) || !validDraftDate(draft.until) || draft.until < draft.startDate) return null;
  const days = (Date.parse(`${draft.until}T12:00:00Z`) - Date.parse(`${draft.startDate}T12:00:00Z`)) / 86_400_000;
  const count = Math.floor(days / 7) + 1;
  return { count, firstDate: draft.startDate, lastDate: shiftDay(draft.startDate, (count - 1) * 7),
    untilDate: draft.until, overLimit: count > 53 };
}
export function draftSummary(draft: EventDraft): string {
  const start = validDraftDate(draft.startDate) ? dayLabel(draft.startDate) : 'Fecha pendiente';
  const end = draft.endDate !== draft.startDate && validDraftDate(draft.endDate) ? ` hasta ${dayLabel(draft.endDate)}` : '';
  const schedule = draft.allDay ? `Día completo${end}` : `${draft.startTime || 'Inicio pendiente'}–${draft.endTime || 'Fin pendiente'}${end}`;
  const preview = repeatPreview(draft);
  const repeat = preview ? ` · Cada semana: ${preview.count} eventos hasta ${dayLabel(preview.lastDate)}${preview.overLimit ? ' (máximo 53)' : ''}` : '';
  return `${draft.title.trim() || 'Sin título'} · ${start} · ${schedule}${repeat}`;
}
