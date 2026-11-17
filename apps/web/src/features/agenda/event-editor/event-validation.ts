import { draftPayload } from './event-draft.ts';
import { validDraftDate, validDraftTime } from './event-draft-time.ts';
import { repeatPreview } from './event-summary.ts';
import { zoneLabel } from './event-zones.ts';
import { eventColorOptions } from '../model/event-colors.ts';
import type { DraftIssue, DraftValidation, EventDraft, TemporalChoice } from './event-draft-types.ts';

function fieldIssues(draft: EventDraft): DraftIssue[] {
  const issues: DraftIssue[] = [];
  if (!eventColorOptions.some(option => option.value === draft.color)) issues.push({ field: 'color', message: 'Elegí un color de evento válido.' });
  if (!draft.title.trim() || draft.title.trim().length > 160) issues.push({ field: 'title', message: 'Escribí un título de hasta 160 caracteres.' });
  if (!['CLASS', 'EVALUATION', 'ACTIVITY'].includes(draft.category)) issues.push({ field: 'category', message: 'Elegí un tipo de evento.' });
  if (!validDraftDate(draft.startDate)) issues.push({ field: 'startDate', message: 'Elegí una fecha de inicio válida.' });
  if (!draft.allDay && !validDraftTime(draft.startTime)) issues.push({ field: 'startTime', message: 'Ingresá una hora de inicio válida.' });
  if (!validDraftDate(draft.endDate) || draft.endDate < draft.startDate) issues.push({ field: 'endDate', message: 'El último día debe ser igual o posterior al inicio.' });
  if (!draft.allDay && !validDraftTime(draft.endTime)) issues.push({ field: 'endTime', message: 'Ingresá una hora de fin válida.' });
  if (draft.weekly && (!repeatPreview(draft) || repeatPreview(draft)!.overLimit)) issues.push({ field: 'until', message: 'Elegí una fecha final posterior o igual al inicio, con un máximo de 53 eventos.' });
  if (draft.description.length > 4000) issues.push({ field: 'description', message: 'Las notas admiten hasta 4000 caracteres.' });
  if (!draft.allDay) {
    try { new Intl.DateTimeFormat('es-AR', { timeZone: draft.zone }); }
    catch { issues.push({ field: 'zone', message: 'Elegí una ciudad con zona horaria válida.' }); }
  }
  return issues;
}
function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : {};
}
function temporalChoices(value: unknown, local: string): TemporalChoice[] {
  if (!Array.isArray(value) || !validDraftDate(local.slice(0, 10)) || !validDraftTime(local.slice(11))) return [];
  const choices = value.flatMap(candidate => {
    const choice = object(candidate);
    if (typeof choice.offsetMinutes !== 'number' || !Number.isInteger(choice.offsetMinutes)
      || Math.abs(choice.offsetMinutes) > 840 || typeof choice.instant !== 'string') return [];
    const instant = Date.parse(choice.instant);
    if (!Number.isFinite(instant) || instant + choice.offsetMinutes * 60_000 !== Date.parse(`${local}:00Z`)) return [];
    return [{ offsetMinutes: choice.offsetMinutes, instant: choice.instant }];
  });
  const unique = choices.filter((choice, index) => choices.findIndex(other => other.instant === choice.instant) === index);
  return unique.sort((left, right) => Date.parse(left.instant) - Date.parse(right.instant)).map((choice, index) => ({
    ...choice, label: `${index === 0 ? 'Primera' : 'Segunda'} vez que ocurre ${local.slice(11)}`,
  }));
}
function futureIssue(local: string, zone: string): DraftIssue {
  const date = validDraftDate(local.slice(0, 10))
    ? new Date(`${local.slice(0, 10)}T12:00:00Z`).toLocaleDateString('es-AR', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' })
    : 'una próxima fecha';
  return { field: 'until', message: `El ${date} a las ${local.slice(11)} en ${zoneLabel(zone).replace(/^Hora de /, '')} tiene un horario que no existe o se repite. Ajustá el horario o la fecha final de la serie.` };
}
export function eventFailure(failure: unknown, draft: EventDraft): { message: string; issues: readonly DraftIssue[] } {
  const error = object(failure), details = object(error.details);
  if (error.code !== 'INVALID_INPUT') return {
    message: typeof error.message === 'string' ? error.message : 'No se pudo completar la acción. Conservamos tus cambios.', issues: [],
  };
  const local = typeof details.local === 'string' ? details.local : '';
  const future = draft.weekly && local !== '' && local !== `${draft.startDate}T${draft.startTime}` && local !== `${draft.endDate}T${draft.endTime}`;
  if (future) {
    const issue = futureIssue(local, draft.zone);
    return { message: issue.message, issues: [issue] };
  }
  const field = local === `${draft.startDate}T${draft.startTime}` ? 'startTime' : 'endTime';
  const choices = temporalChoices(details.choices, local);
  const message = local ? (choices.length ? 'Esta hora se repite. Elegí cuál de los horarios corresponde al evento.' : 'Esta hora no existe en la ciudad elegida. Elegí otro horario.')
    : 'Revisá el fin: debe ser posterior al inicio, con fechas y horarios válidos.';
  return { message, issues: [{ field, message, ...(choices.length ? { choices } : {}) }] };
}
export function validateDraft(draft: EventDraft): DraftValidation {
  const issues = fieldIssues(draft);
  if (issues.length) return { ok: false, issues };
  try { return { ok: true, payload: draftPayload(draft), issues: [] }; }
  catch (failure) { return { ok: false, issues: eventFailure(failure, draft).issues }; }
}
