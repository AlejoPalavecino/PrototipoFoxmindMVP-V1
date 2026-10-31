export interface AccountUser { id: string; firstName: string; lastName: string; email: string; emailVerified: boolean; accountRole: 'teacher' | 'student' }
export type AccountSession = { authenticated: false } | { authenticated: true; user: AccountUser };
const messages: Record<string, string> = {
  AUTH_REQUIRED: 'Tu sesión finalizó. Inicia sesión para continuar.',
  AUTHENTICATION_FAILED: 'El correo o la contraseña no son correctos.',
  EMAIL_VERIFICATION_REQUIRED: 'Verifica tu correo para continuar.',
  ORIGIN_NOT_ALLOWED: 'No se pudo validar la solicitud. Abre FoxMind desde su dirección habitual.',
  CSRF_INVALID: 'La sesión cambió. Vuelve a intentar la acción.',
  LINK_INVALID: 'El enlace no es válido, venció o ya fue utilizado. Solicita uno nuevo.',
  EMAIL_ALREADY_VERIFIED: 'El correo ya está verificado. Actualiza el estado para continuar.',
  VALIDATION_ERROR: 'Revisa los datos: nombres de hasta 80 caracteres, correo válido con dominio en minúsculas y contraseña de 16 a 128 caracteres.',
  REQUEST_TOO_LARGE: 'Los datos superan el tamaño permitido.',
  RATE_LIMITED: 'Se alcanzó el límite de intentos. Espera antes de volver a intentar.',
};
export class AccountError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryAfter: number;
  constructor(code: string, status: number, retryAfter = 0) {
    super(messages[code] ?? 'No pudimos conectar con FoxMind. Vuelve a intentar en unos momentos.');
    this.code = code; this.status = status; this.retryAfter = retryAfter;
  }
}
export function createAccountClient(fetcher: typeof fetch = fetch) {
  async function read<T>(path: string, init: RequestInit = {}): Promise<T> {
    let response: Response;
    try {
      response = await fetcher(`/api/v1${path}`, { ...init, credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15_000) });
    } catch { throw new AccountError('SERVICE_UNAVAILABLE', 503); }
    let data: unknown;
    try { data = response.status === 204 ? undefined : await response.json(); }
    catch { throw new AccountError('SERVICE_UNAVAILABLE', 503); }
    if (!response.ok) {
      const code = (data as { error?: { code?: string } })?.error?.code ?? 'SERVICE_UNAVAILABLE';
      const retry = Number(response.headers.get('retry-after'));
      throw new AccountError(code, response.status, Number.isSafeInteger(retry) && retry > 0 ? retry : 0);
    }
    return data as T;
  }
  async function session(): Promise<AccountSession> { return read<AccountSession>('/auth/session'); }
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
    if (['firstName', 'lastName'].includes(name) && (!value.trim() || count > 80)) return 'Completa nombre y apellido, con hasta 80 caracteres cada uno.';
    if (name === 'currentPassword' && !value) return 'Escribe tu contraseña actual.';
    if (name === 'email') {
      if (!value.trim()) return 'Escribe tu correo electrónico.';
      const domain = value.trim().slice(value.trim().lastIndexOf('@') + 1);
      if (domain !== domain.toLowerCase()) return 'El dominio del correo debe estar escrito en minúsculas.';
    }
  }
  return null;
}
