import { AgendaClientError, type AgendaClient } from '../../../agenda-ui/api.ts';
import { agendaId, parseAgendaRange } from '../../../../src/core/domain/index.ts';
import { createAccountClient } from './account-client.ts';

function agendaCaller(fetcher: typeof fetch, onIdentityRequired?: (code: string) => void) {
  const account = createAccountClient(fetcher);
  const notify = (code: string) => {
    if (code === 'AUTH_REQUIRED' || code === 'EMAIL_VERIFICATION_REQUIRED') onIdentityRequired?.(code);
  };
  async function call<T>(path: string, method = 'GET', data?: unknown, signal?: AbortSignal): Promise<T> {
    try {
      signal?.throwIfAborted();
      const headers: Record<string, string> = {};
      if (method !== 'GET') {
        headers['X-CSRF-Token'] = (await account.read<{ csrfToken: string }>('/auth/csrf', { signal })).csrfToken;
        signal?.throwIfAborted();
        headers['Content-Type'] = 'application/json';
      }
      const response = await fetcher(`/api/v1/agenda${path}`, {
        method, headers, credentials: 'same-origin', cache: 'no-store',
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30_000)]) : AbortSignal.timeout(30_000),
        body: method === 'GET' ? undefined : JSON.stringify(data),
      });
      signal?.throwIfAborted();
      if (response.status === 204) return undefined as T;
      const result = await response.json();
      signal?.throwIfAborted();
      if (!response.ok) throw new AgendaClientError(result?.error?.code ?? 'SERVICE_UNAVAILABLE', response.status, result?.error?.details);
      return result as T;
    } catch (error) {
      if (signal?.aborted) throw error;
      const code = (error as { code?: string }).code;
      if (code) { notify(code); throw error; }
      throw new AgendaClientError('SERVICE_UNAVAILABLE', 503);
    }
  }
  return call;
}
export function createWebAgendaClient(fetcher: typeof fetch = fetch, onIdentityRequired?: (code: string) => void): AgendaClient {
  const call = agendaCaller(fetcher, onIdentityRequired);
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
    open: (target, signal) => call('/open', 'POST', target, signal),
  };
}
