export type EventKind = 'CLASS' | 'ACTIVITY' | 'EVALUATION';
export type AgendaTarget = { classroomId: string; activityId: string | null };
export type EventSchedule =
  | { kind: 'TIMED'; timeZone: string; startLocal: string; endLocal: string;
      startOffsetMinutes?: number; endOffsetMinutes?: number }
  | { kind: 'ALL_DAY'; startDate: string; endDateExclusive: string };
export type EventRepeat = { kind: 'NONE' } | { kind: 'WEEKLY'; untilDate: string };
export interface EventPayload {
  title: string;
  description: string;
  category: EventKind;
  schedule: EventSchedule;
  repeat: EventRepeat;
}
export interface PrivateEvent extends EventPayload {
  id: string;
  revision: string;
  createdAt: string;
  updatedAt: string;
}
export interface EventOccurrence {
  kind: 'PRIVATE_EVENT';
  occurrenceId: string;
  event: PrivateEvent;
  startDate: string;
  endDateExclusive: string;
  startAt: string | null;
  endAt: string | null;
}
export interface AcademicDeadline {
  kind: 'ACADEMIC_DEADLINE';
  id: string;
  target: AgendaTarget;
  classroomName: string;
  title: string;
  activityType: 'ASSIGNMENT' | 'QUESTIONNAIRE' | 'EVALUATION';
  role: 'teacher' | 'student';
  deadlineAt: string;
  timeZone: string;
  pending: boolean;
  resubmission: boolean;
}
export interface AgendaRange { startDate: string; endDateExclusive: string; timeZone: string }
export interface AgendaPage {
  serverTime: string;
  items: (EventOccurrence | AcademicDeadline)[];
  nextCursor: string | null;
}
export class AgendaError extends Error {
  constructor(readonly code: 'INVALID_INPUT' | 'CONFLICT' | 'FORBIDDEN' | 'SERVICE_UNAVAILABLE',
    readonly details?: unknown) { super(code); }
}
