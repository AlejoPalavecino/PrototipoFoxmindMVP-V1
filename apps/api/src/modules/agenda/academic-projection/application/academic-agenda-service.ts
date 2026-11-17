import { AgendaError, agendaId, agendaObject, type AgendaTarget, type AgendaUnitOfWork } from '../../../../../../../src/core/domain/agenda/index.ts';

/** Uses the same injected UoW as private events; never opens a nested transaction. */
export class AcademicAgendaService {
  constructor(private readonly uow: AgendaUnitOfWork) {}
  async upcoming(request: unknown, limit = 5) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw new AgendaError('INVALID_INPUT');
    return this.uow.run(request, false, async unit => ({ serverTime: unit.actor.now,
      items: await unit.academic.upcoming(limit) }));
  }
  async open(request: unknown, input: unknown): Promise<AgendaTarget> {
    const source = agendaObject(input, ['classroomId', 'activityId']);
    const target = { classroomId: agendaId(source.classroomId),
      activityId: source.activityId === null ? null : agendaId(source.activityId) };
    return this.uow.run(request, false, async unit => {
      const destination = await unit.academic.resolveTarget(target);
      if (!destination) throw new AgendaError('FORBIDDEN');
      return destination;
    });
  }
}
