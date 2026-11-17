export { Agenda } from './calendar/Agenda.tsx';
export { default as agendaSurface } from './calendar/agenda-surface.module.css';
export type { AgendaEventRequest } from './calendar/useAgendaEventTarget.ts';
export { AgendaClientError } from './api/api.ts';
export type { AgendaClient } from './api/api.ts';
export { EventDetails, eventOccurrence } from './event-details/EventDetails.tsx';
export { EventForm } from './event-editor/EventForm.tsx';
export { useEventEditor } from './event-editor/useEventEditor.ts';
export type { EventDraft, DraftField, TemporalChoice, DraftIssue, DraftValidation, RepeatPreview, ZoneChoice, EventEditorOutcome, EventEditor } from './event-editor/event-draft-types.ts';
export { eventDraft, draftPayload, isDraftDirty } from './event-editor/event-draft.ts';
export { changeDraftStart, changeDraftEnd, setDraftDuration, toggleAllDay,
  changeDraftZone, changeDraftUntil } from './event-editor/event-draft-time.ts';
export { validateDraft, eventFailure } from './event-editor/event-validation.ts';
export { repeatPreview, draftSummary } from './event-editor/event-summary.ts';
export { zoneChoices, zoneLabel } from './event-editor/event-zones.ts';
export { eventFocusDay } from './calendar/event-result.ts';
export { EventColorFields } from './event-editor/EventColorFields.tsx';
export { eventColorOptions, eventColorClass, eventColorLabel } from './model/event-colors.ts';
export type { EventColorChoice, EventColorOption } from './model/event-colors.ts';

export { createAgendaClient } from './api/client.ts';
export type { AgendaCaller } from './api/client.ts';
export type { AgendaViewTarget } from './calendar/useAgendaView.ts';
