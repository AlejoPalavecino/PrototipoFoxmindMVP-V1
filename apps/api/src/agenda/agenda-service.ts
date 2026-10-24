import { AgendaError, agendaId, agendaObject, agendaRevision, expandAgendaEvent,
  parseAgendaEvent, parseAgendaRange, type AgendaTarget, type AgendaUnitOfWork,
  type PrivateEvent } from '../../../../src/core/domain/index.ts';
import { pageItems } from './pagination.ts';

function requireEvent(event: PrivateEvent | null): PrivateEvent {
  if (!event) throw new AgendaError('FORBIDDEN');
  return event;
}
export class AgendaService {
  constructor(private readonly uow: AgendaUnitOfWork) {}
  async put(request: unknown, id: string, input: unknown) {
    id = agendaId(id);
    const payload = parseAgendaEvent(input);
    return this.uow.run(request, true, async unit => {
      const previous = await unit.events.get(id);
      if (!previous) return { event: await unit.events.create(id, payload), created: true };
      if (JSON.stringify(parseAgendaEvent({ title: previous.title, description: previous.description,
        category: previous.category, schedule: previous.schedule, repeat: previous.repeat,
        ...(previous.color === undefined ? {} : { color: previous.color }) })) !== JSON.stringify(payload))
        throw new AgendaError('CONFLICT');
      return { event: previous, created: false };
    });
  }
  async get(request: unknown, id: string) {
    id = agendaId(id);
    return this.uow.run(request, false, async unit => requireEvent(await unit.events.get(id)));
  }
  async replace(request: unknown, id: string, input: unknown) {
    id = agendaId(id);
    const source = agendaObject(input, ['revision', 'event']);
    const revision = agendaRevision(source.revision), payload = parseAgendaEvent(source.event);
    return this.uow.run(request, true, unit => unit.events.replace(id, revision, payload));
  }
  async remove(request: unknown, id: string, input: unknown): Promise<void> {
    id = agendaId(id);
    const revision = agendaRevision(agendaObject(input, ['revision']).revision);
    return this.uow.run(request, true, unit => unit.events.remove(id, revision));
  }
  async list(request: unknown, input: unknown, cursor: string | null = null) {
    const range = parseAgendaRange(input);
    return this.uow.run(request, false, async unit => {
      const events = await unit.events.list(range, null);
      const academic = await unit.academic.list(range);
      return { serverTime: unit.actor.now, ...pageItems([
        ...events.flatMap(event => expandAgendaEvent(event, range)), ...academic,
      ], range, unit.actor.userId, cursor) };
    });
  }
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
export function createAgendaService(uow: AgendaUnitOfWork): AgendaService { return new AgendaService(uow); }
