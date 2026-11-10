import { createAgendaUnitOfWork as createUnitOfWork } from '../modules/agenda/infrastructure/unit-of-work.ts';
import type { AgendaDatabase, AgendaAuthentication } from '../modules/agenda/public.ts';
import { createAcademicAgenda } from '../classrooms/public/index.ts';

// Academic events share the transaction and actor selected by the Agenda unit of work.
export function createAgendaUnitOfWork(database: AgendaDatabase, authenticate: AgendaAuthentication) {
  return createUnitOfWork(database, authenticate, createAcademicAgenda);
}
