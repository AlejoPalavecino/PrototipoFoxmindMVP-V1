import { agendaId, parseAgendaRange } from '../../../../../../src/core/domain/agenda/index.ts';
import type { AgendaClient } from './api.ts';

export type AgendaCaller = <T>(path: string, method?: string, data?: unknown, signal?: AbortSignal) => Promise<T>;

export function createAgendaClient(call: AgendaCaller): AgendaClient {
  return {
    list: (range, cursor, signal) => {
      const query = new URLSearchParams({ ...parseAgendaRange(range) });
      if (cursor) query.set('cursor', cursor);
      return call(`?${query}`, 'GET', undefined, signal);
    },
    upcoming: (limit = 5, signal) => call(`/upcoming?limit=${limit}`, 'GET', undefined, signal),
    get: id => call(`/events/${agendaId(id)}`),
    put: (id, event) => call(`/events/${agendaId(id)}`, 'PUT', event),
    replace: (id, revision, event) => call(`/events/${agendaId(id)}`, 'PATCH', { revision, event }),
    remove: (id, revision) => call(`/events/${agendaId(id)}`, 'DELETE', { revision }),
    changeOccurrence: (id, revision, date, event) => call(`/events/${agendaId(id)}/occurrences/${date}`, event ? 'PATCH' : 'DELETE', { revision, ...(event ? { event } : {}) }),
    open: (target, signal) => call('/open', 'POST', target, signal),
  };
}
