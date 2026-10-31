import { createClassroomClient } from '../../../classrooms-ui/api.ts';
import { createAccountClient } from './account-client.ts';

const invitationId = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

/** Only these literal local product destinations can cross an account flow. */
export function classroomDestination(value: string | string[] | undefined): string | null {
  if (typeof value !== 'string' || value.length > 120) return null;
  if (value === '/mis-aulas' || value === '/inicio' || value === '/agenda' || value === '/settings' || value === '/foxy-ai') return value;
  const target = /^\/mis-aulas\?aula=([^&?#]+)(?:&actividad=([^&?#]+))?$/.exec(value);
  if (target && invitationId.test(target[1]) && (!target[2] || invitationId.test(target[2]))) return value;
  const match = /^\/mis-aulas\?invitacion=([^&?#]+)$/.exec(value);
  return match && invitationId.test(match[1]) ? `/mis-aulas?invitacion=${match[1]}` : null;
}
export function classroomAuthHref(view: 'sign-in' | 'verify-email' | 'register', destination: string | null): string {
  const safe = classroomDestination(destination ?? undefined);
  return `/${view}${safe ? `?next=${encodeURIComponent(safe)}` : ''}`;
}
export function createWebClassroomClient(fetcher: typeof fetch = fetch, onAccountRequired?: (code: string) => void) {
  const account = createAccountClient(fetcher);
  const notify = (code: string) => {
    if (code === 'AUTH_REQUIRED' || code === 'EMAIL_VERIFICATION_REQUIRED') onAccountRequired?.(code);
  };
  return createClassroomClient({
    prefix: '/api/v1',
    csrfToken: async () => {
      try { return (await account.read<{ csrfToken: string }>('/auth/csrf')).csrfToken; }
      catch (error) { notify((error as { code?: string }).code ?? ''); throw error; }
    },
    fetch: async (path, init) => {
      const response = await fetcher(path, init);
      if (!response.ok) {
        const data = await response.clone().json().catch(() => ({}));
        notify(data?.error?.code ?? '');
      }
      return response;
    },
  });
}
