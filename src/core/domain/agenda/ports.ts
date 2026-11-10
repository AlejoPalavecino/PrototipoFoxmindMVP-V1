import type { AcademicDeadline, AgendaRange, AgendaTarget, EventPayload, PrivateEvent } from './types.ts';
export interface AgendaActor { userId: string; now: string }
export interface PrivateEventRepository {
  list(range: AgendaRange, cursor: string | null): Promise<PrivateEvent[]>;
  get(id: string): Promise<PrivateEvent | null>;
  create(id: string, payload: EventPayload): Promise<PrivateEvent>;
  replace(id: string, revision: string, payload: EventPayload): Promise<PrivateEvent>;
  remove(id: string, revision: string): Promise<void>;
  changeOccurrence?(id: string, revision: string, date: string, replacement: EventPayload | null): Promise<PrivateEvent>;
}
export interface AcademicAgendaPort {
  list(range: AgendaRange): Promise<AcademicDeadline[]>;
  upcoming(limit: number): Promise<AcademicDeadline[]>;
  resolveTarget(target: AgendaTarget): Promise<AgendaTarget | null>;
}
export interface AgendaUnit { actor: AgendaActor; events: PrivateEventRepository; academic: AcademicAgendaPort }
export interface AgendaUnitOfWork {
  run<T>(request: unknown, write: boolean, operation: (unit: AgendaUnit) => Promise<T>): Promise<T>;
}
