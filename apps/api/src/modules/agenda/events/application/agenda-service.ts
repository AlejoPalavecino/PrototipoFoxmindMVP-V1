import { AgendaError, agendaDate, agendaId, agendaObject, agendaRevision, expandAgendaEvent,
  parseAgendaEvent, parseAgendaRange, type AgendaTarget, type AgendaUnitOfWork,
  type PrivateEvent } from '../../../../../../../src/core/domain/agenda/index.ts';
import { pageItems } from './pagination.ts';
import { AcademicAgendaService } from '../../academic-projection/public.ts';

function requireEvent(event: PrivateEvent | null): PrivateEvent {
  if (!event) throw new AgendaError('FORBIDDEN');
  return event;
}
export class AgendaService {
  private readonly projection: AcademicAgendaService;
  constructor(private readonly uow: AgendaUnitOfWork) { this.projection = new AcademicAgendaService(uow); }
  async put(request: unknown, id: string, input: unknown) {
    id = agendaId(id);
    const payload = parseAgendaEvent(input);
    return this.uow.run(request, true, async unit => {
      const previous = await unit.events.get(id);
      if (!previous) return { event: await unit.events.create(id, payload), created: true };
      if (JSON.stringify(parseAgendaEvent({ title: previous.title, description: previous.description,
        category: previous.category, schedule: previous.schedule, repeat: previous.repeat,
        ...(previous.color === undefined ? {} : { color: previous.color }),
        ...(previous.reminder ? { reminder: previous.reminder } : {}) })) !== JSON.stringify(payload))
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
  async changeOccurrence(request: unknown, id: string, date: string, input: unknown, remove = false) {
    agendaId(id); agendaDate(date);
    const source = agendaObject(input, remove ? ['revision'] : ['revision', 'event']);
    const revision = agendaRevision(source.revision), replacement = remove ? null : parseAgendaEvent(source.event);
    if (replacement && replacement.repeat.kind !== 'NONE') throw new AgendaError('INVALID_INPUT');
    return this.uow.run(request, true, unit => {
      if (!unit.events.changeOccurrence) throw new AgendaError('SERVICE_UNAVAILABLE');
      return unit.events.changeOccurrence(id, revision, date, replacement);
    });
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
  upcoming(request: unknown, limit = 5) { return this.projection.upcoming(request, limit); }
  open(request: unknown, input: unknown): Promise<AgendaTarget> { return this.projection.open(request, input); }

}
export function createAgendaService(uow: AgendaUnitOfWork): AgendaService { return new AgendaService(uow); }
