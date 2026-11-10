import type { AcademicAgendaPort, AgendaActor } from '../../../../../../src/core/domain/agenda/index.ts';

export interface AgendaQuery {
  query<T = Record<string, unknown>>(sql: string, ...values: unknown[]): Promise<T[]>;
}
export interface AgendaDatabase {
  $transaction<T>(operation: (raw: {
    $queryRawUnsafe<T = unknown>(sql: string, ...values: unknown[]): Promise<T>;
  }) => Promise<T>, options?: { maxWait: number; timeout: number }): Promise<T>;
}
export type AgendaAuthentication = (tx: AgendaQuery, request: unknown, write: boolean) => Promise<string>;

export type AcademicAgendaFactory = (tx: AgendaQuery, actor: AgendaActor) => AcademicAgendaPort;
export type {
  AcademicAgendaPort, AgendaActor, AgendaUnitOfWork, AgendaUnit, PrivateEventRepository,
} from '../../../../../../src/core/domain/agenda/index.ts';
