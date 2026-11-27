import { AgendaClientError, createAgendaClient, type AgendaClient } from '../../features/agenda/index.ts';
import { createAccountClient } from '../../features/identity/api.ts';
import { createCsrfSource, withCsrf } from '../../shared/http/csrf.ts';

function agendaCaller(fetcher: typeof fetch, onIdentityRequired?: (code: string) => void) {
  const account = createAccountClient(fetcher);
  const csrf = createCsrfSource(async () => (await account.read<{ csrfToken: string }>('/auth/csrf')).csrfToken);
  const notify = (code: string) => {
    if (code === 'AUTH_REQUIRED' || code === 'EMAIL_VERIFICATION_REQUIRED') onIdentityRequired?.(code);
  };
  async function send<T>(path: string, method: string, data: unknown, signal: AbortSignal | undefined, csrfToken?: string): Promise<T> {
    const headers: Record<string, string> = {};
    if (csrfToken !== undefined) { headers['X-CSRF-Token'] = csrfToken; headers['Content-Type'] = 'application/json'; }
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
  }
  async function call<T>(path: string, method = 'GET', data?: unknown, signal?: AbortSignal): Promise<T> {
    try {
      signal?.throwIfAborted();
      if (method === 'GET') return await send<T>(path, method, undefined, signal);
      return await withCsrf(csrf, token => send<T>(path, method, data, signal, token), signal);
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
  return createAgendaClient(agendaCaller(fetcher, onIdentityRequired));
}
