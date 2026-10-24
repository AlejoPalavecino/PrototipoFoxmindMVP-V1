import type { EventKind, EventPayload, PrivateEvent } from '../../src/core/domain/index.ts';
import type { EventColorChoice } from './event-colors.ts';

export interface EventDraft {
  title: string; description: string; category: EventKind;
  color: EventColorChoice;
  allDay: boolean; startDate: string; endDate: string;
  startTime: string; endTime: string; zone: string;
  weekly: boolean; until: string; untilEdited: boolean;
  startOffset?: number; endOffset?: number;
  endMode: 'DURATION' | 'MANUAL'; durationMinutes: number;
}
export type DraftField = 'title' | 'category' | 'startDate' | 'startTime'
  | 'endDate' | 'endTime' | 'until' | 'description' | 'zone' | 'color';
export interface TemporalChoice { offsetMinutes: number; instant: string; label: string }
export interface DraftIssue {
  field: DraftField; message: string; choices?: readonly TemporalChoice[];
}
export type DraftValidation =
  | { ok: true; payload: EventPayload; issues: readonly [] }
  | { ok: false; issues: readonly DraftIssue[] };
export interface RepeatPreview {
  count: number; firstDate: string; lastDate: string; untilDate: string; overLimit: boolean;
}
export interface ZoneChoice { value: string; label: string }
export type EventEditorOutcome =
  | { kind: 'saved'; mode: 'created' | 'updated'; event: PrivateEvent }
  | { kind: 'removed'; id: string };
export interface EventEditor {
  draft: EventDraft; setDraft(value: EventDraft): void;
  busy: boolean; dirty: boolean; error: string;
  issues: readonly DraftIssue[]; conflict: boolean; stored?: PrivateEvent;
  save(): Promise<void>; remove(): Promise<void>; review(): Promise<void>;
  requestClose(): boolean;
}
