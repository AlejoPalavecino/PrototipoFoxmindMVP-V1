import { createClassroomClient } from './academic-client.ts';
import { createAccountClient } from '../features/identity/api.ts';


export function createWebClassroomClient(fetcher: typeof fetch = fetch, onAccountRequired?: (code: string) => void) {
  const account = createAccountClient(fetcher);
  const notify = (code: string) => {
    if (code === 'AUTH_REQUIRED' || code === 'EMAIL_VERIFICATION_REQUIRED') onAccountRequired?.(code);
  };
  return createClassroomClient({
    prefix: '/api/v1',
    csrfToken: async signal => {
      try { return (await account.read<{ csrfToken: string }>('/auth/csrf', { signal })).csrfToken; }
      catch (error) { if (!signal?.aborted) notify((error as { code?: string }).code ?? ''); throw error; }
    },
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
