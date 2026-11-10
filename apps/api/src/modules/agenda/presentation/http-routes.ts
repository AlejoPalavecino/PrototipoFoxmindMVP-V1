import type { IncomingMessage } from 'node:http';
import { AgendaError, agendaId, agendaObject, agendaRevision, parseAgendaEvent,
  parseAgendaRange } from '../../../../../../src/core/domain/agenda/index.ts';
import type { AgendaService } from '../application/agenda-service.ts';
import { agendaQuery, readAgendaBody } from './http-input.ts';

async function eventRoute(service: AgendaService, request: IncomingMessage, id: string) {
  agendaId(id);
  if (request.method === 'GET') return { status: 200, body: await service.get(request, id) };
  const source = await readAgendaBody(request);
  if (request.method === 'PUT') {
    const result = await service.put(request, id, parseAgendaEvent(source));
    return { status: result.created ? 201 : 200, body: result.event };
  }
  if (request.method === 'PATCH') {
    const item = agendaObject(source, ['revision', 'event']);
    const body = { revision: agendaRevision(item.revision), event: parseAgendaEvent(item.event) };
    return { status: 200, body: await service.replace(request, id, body) };
  }
  if (request.method === 'DELETE') {
    const item = agendaObject(source, ['revision']);
    await service.remove(request, id, { revision: agendaRevision(item.revision) });
    return { status: 204, body: undefined };
  }
  throw new AgendaError('INVALID_INPUT');
}
export async function agendaRoute(service: AgendaService, request: IncomingMessage, url: URL) {
  if (request.method === 'GET' && url.pathname === '/agenda') {
    const { cursor = null, ...input } = agendaQuery(url, ['startDate', 'endDateExclusive', 'timeZone', 'cursor']);
    if (cursor !== null && !/^[A-Za-z0-9_-]{1,4096}$/.test(cursor)) throw new AgendaError('INVALID_INPUT');
    return { status: 200, body: await service.list(request, parseAgendaRange(input), cursor) };
  }
  if (request.method === 'GET' && url.pathname === '/agenda/upcoming') {
    const input = agendaQuery(url, ['limit']);
    const limit = input.limit === undefined ? 5 : Number(input.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw new AgendaError('INVALID_INPUT');
    return { status: 200, body: await service.upcoming(request, limit) };
  }
  agendaQuery(url, []);
  const occurrence = /^\/agenda\/events\/([^/]+)\/occurrences\/(\d{4}-\d{2}-\d{2})$/.exec(url.pathname);
  if (occurrence && ['PATCH','DELETE'].includes(request.method ?? '')) return { status: 200,
    body: await service.changeOccurrence(request, occurrence[1], occurrence[2], await readAgendaBody(request), request.method === 'DELETE') };
  if (request.method === 'POST' && url.pathname === '/agenda/open') {
    const item = agendaObject(await readAgendaBody(request), ['classroomId', 'activityId']);
    const target = { classroomId: agendaId(item.classroomId), activityId: item.activityId === null ? null : agendaId(item.activityId) };
    return { status: 200, body: await service.open(request, target) };
  }
  const match = /^\/agenda\/events\/([^/]+)$/.exec(url.pathname);
  if (match && ['GET', 'PUT', 'PATCH', 'DELETE'].includes(request.method ?? '')) return eventRoute(service, request, match[1]);
  return { status: 404, body: { error: { code: 'NOT_FOUND' } } };
}
