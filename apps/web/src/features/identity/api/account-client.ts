import type { AccountAvatarKey } from '../../../../../../src/core/domain/identity/account-avatar.ts';
import { ClientError } from '../../../../../../src/core/contracts/client-error.ts';
export interface AccountUser { id: string; firstName: string; lastName: string; email: string; emailVerified: boolean; accountRole: 'teacher' | 'student'; avatarKey?: AccountAvatarKey }
export type AccountSession = { authenticated: false } | { authenticated: true; user: AccountUser };
const messages: Record<string, string> = {
  AUTH_REQUIRED: 'Tu sesión finalizó. Iniciá sesión para continuar.',
  AUTHENTICATION_FAILED: 'El correo o la contraseña no son correctos.',
  EMAIL_VERIFICATION_REQUIRED: 'Verificá tu correo para continuar.',
  ORIGIN_NOT_ALLOWED: 'No se pudo validar la solicitud. Abrí FoxMind desde su dirección habitual.',
  CSRF_INVALID: 'La sesión cambió. Volvé a intentar la acción.',
  LINK_INVALID: 'El enlace no es válido, venció o ya se usó. Pedí uno nuevo.',
  EMAIL_ALREADY_VERIFIED: 'El correo ya está verificado. Actualizá el estado para continuar.',
  VALIDATION_ERROR: 'Revisá los datos: nombres de hasta 80 caracteres, correo válido con dominio en minúsculas y contraseña de 16 a 128 caracteres.',
  REQUEST_TOO_LARGE: 'Los datos superan el tamaño permitido.',
  RATE_LIMITED: 'Se alcanzó el límite de intentos. Esperá antes de volver a intentar.',
};
export class AccountError extends ClientError {
  constructor(code: string, status: number, retryAfter = 0) {
    super(code, status, messages[code] ?? 'No pudimos conectar con FoxMind. Volvé a intentar en unos momentos.', retryAfter);
  }
}
export function createAccountClient(fetcher: typeof fetch = fetch) {
  async function read<T>(path: string, init: RequestInit = {}): Promise<T> {
    const caller = init.signal;
    caller?.throwIfAborted();
    const timeout = AbortSignal.timeout(15_000);
    let response: Response;
    try {
      response = await fetcher(`/api/v1${path}`, { ...init, credentials: 'same-origin', cache: 'no-store',
        signal: caller ? AbortSignal.any([caller, timeout]) : timeout });
    } catch { caller?.throwIfAborted(); throw new AccountError('SERVICE_UNAVAILABLE', 503); }
    let data: unknown;
    try { data = response.status === 204 ? undefined : await response.json(); }
    catch { caller?.throwIfAborted(); throw new AccountError('SERVICE_UNAVAILABLE', 503); }
    caller?.throwIfAborted();
    if (!response.ok) {
      const code = (data as { error?: { code?: string } })?.error?.code ?? 'SERVICE_UNAVAILABLE';
      const retry = Number(response.headers.get('retry-after'));
      throw new AccountError(code, response.status, Number.isSafeInteger(retry) && retry > 0 ? retry : 0);
    }
    return data as T;
  }
  async function session(signal?: AbortSignal): Promise<AccountSession> { return read<AccountSession>('/auth/session', { signal }); }
  async function mutate<T>(path: string, data: Record<string, string> = {}, method = 'POST') {
    const current = await session();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (current.authenticated) headers['X-CSRF-Token'] = (await read<{ csrfToken: string }>('/auth/csrf')).csrfToken;
    const result = await read<T>(path, { method, headers, body: JSON.stringify(data) });
    // Never reuse a binding after login, verification, logout, reset or password rotation.
    // A failed post-mutation refresh cannot falsely label a committed action as failed.
    let refreshed: AccountSession | undefined;
    try {
      refreshed = await session();
      if (refreshed.authenticated) await read('/auth/csrf');
    } catch { /* The next mutation always reacquires both before sending. */ }
    return { result, session: refreshed };
  }
  return { read, session, mutate };
}
export function validateAccountFields(fields: Record<string, string>): string | null {
  for (const [name, value] of Object.entries(fields)) {
    const count = [...value].length;
    if (['password', 'newPassword'].includes(name) && (count < 16 || count > 128)) return 'La contraseña debe tener entre 16 y 128 caracteres.';
    if (['firstName', 'lastName'].includes(name) && (!value.trim() || count > 80)) return 'Completá nombre y apellido, con hasta 80 caracteres cada uno.';
    if (name === 'currentPassword' && !value) return 'Escribí tu contraseña actual.';
    if (name === 'email') {
      if (!value.trim()) return 'Escribí tu correo electrónico.';
      const domain = value.trim().slice(value.trim().lastIndexOf('@') + 1);
      if (domain !== domain.toLowerCase()) return 'El dominio del correo debe estar escrito en minúsculas.';
    }
  }
  return null;
}
