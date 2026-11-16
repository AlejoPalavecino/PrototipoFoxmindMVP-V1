export type EventKind = 'CLASS' | 'ACTIVITY' | 'EVALUATION';
export const EVENT_COLORS = ['BLUE', 'GREEN', 'YELLOW', 'ORANGE', 'PINK', 'PURPLE', 'GRAPHITE'] as const;
export type EventColor = (typeof EVENT_COLORS)[number];
export type AgendaTarget = { classroomId: string; activityId: string | null };
export type EventSchedule =
  | { kind: 'TIMED'; timeZone: string; startLocal: string; endLocal: string;
      startOffsetMinutes?: number; endOffsetMinutes?: number }
  | { kind: 'ALL_DAY'; startDate: string; endDateExclusive: string };
export type EventRepeat = { kind: 'NONE' } | { kind: 'DAILY' | 'WEEKLY' | 'MONTHLY'; untilDate: string };
export const EVENT_REMINDER_MINUTES = [0, 5, 15, 30, 60, 1440] as const;
export type EventReminder = { minutes: (typeof EVENT_REMINDER_MINUTES)[number]; timeZone?: string };
export interface EventPayload {
  title: string;
  description: string;
  category: EventKind;
  schedule: EventSchedule;
  repeat: EventRepeat;
  color?: EventColor;
  reminder?: EventReminder;
}
export interface PrivateEvent extends EventPayload {
  id: string;
  revision: string;
  createdAt: string;
  updatedAt: string;
  exceptions?: { date: string; replacement: EventPayload | null }[];
  reviewSession?: { folderId: string; examId: string };
}
export interface EventOccurrence {
  kind: 'PRIVATE_EVENT';
  occurrenceId: string;
  occurrenceDate?: string;
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
  readonly code: 'INVALID_INPUT' | 'CONFLICT' | 'FORBIDDEN' | 'SERVICE_UNAVAILABLE';
  readonly details?: unknown;
  constructor(code: AgendaError['code'], details?: unknown) {
    super(code);
    this.code = code;
    this.details = details;
  }
}
