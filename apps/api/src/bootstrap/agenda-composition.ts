import { createAgendaUnitOfWork as createUnitOfWork } from '../modules/agenda/events/infrastructure/unit-of-work.ts';
import type { AgendaDatabase, AgendaAuthentication } from '../modules/agenda/public.ts';
import { createAcademicAgenda } from '../modules/classrooms/academic-projection/infrastructure/agenda.ts';

// Academic events share the transaction and actor selected by the Agenda unit of work.
export function createAgendaUnitOfWork(database: AgendaDatabase, authenticate: AgendaAuthentication) {
  return createUnitOfWork(database, authenticate, createAcademicAgenda);
}
