import { createClassroomClient } from '../transport/classroom-client.ts';
import { createAccountClient } from '../../features/identity/api.ts';
import { createCsrfSource } from '../../shared/http/csrf.ts';


export function createWebClassroomClient(fetcher: typeof fetch = fetch, onAccountRequired?: (code: string) => void) {
  const account = createAccountClient(fetcher);
  const notify = (code: string) => {
    if (code === 'AUTH_REQUIRED' || code === 'EMAIL_VERIFICATION_REQUIRED') onAccountRequired?.(code);
  };
  const csrf = createCsrfSource(async () => (await account.read<{ csrfToken: string }>('/auth/csrf')).csrfToken);
  return createClassroomClient({
    prefix: '/api/v1',
    csrfToken: async signal => {
      try { return await csrf.token(signal); }
      catch (error) { if (!signal?.aborted) notify((error as { code?: string }).code ?? ''); throw error; }
    },
    invalidateCsrf: csrf.invalidate,
    fetch: async (path, init) => {
      const response = await fetcher(path, init);
      if (!response.ok) {
        const data = await response.clone().json().catch(() => ({}));
        if (!init?.signal?.aborted) notify(data?.error?.code ?? '');
      }
      return response;
    },
  });
}
