export interface Topic {
  id?: string;
  name: string;
  status?: string;
}
export interface Unit {
  id?: string;
  name: string;
  topics: Topic[];
}
export interface Payload {
  name?: string;
  subject?: string;
  division?: string;
  academicYear?: number;
  timezone?: string;
  coverKey?: string;
  planFileId?: string;
  units?: Unit[];
}
export interface Draft {
  id: string;
  revision: string;
  payload: Payload;
  publishedClassroomId: string | null;
}
export interface Classroom {
  id: string;
  name: string;
  subject: string;
  division: string;
  academicYear: number;
  timezone: string;
  coverKey: string;
  archived: boolean;
  teacher: string;
  role: 'teacher' | 'student';
  revision: string;
}
export interface Detail extends Classroom {
  units: Unit[];
  plans: { id: string; fileId: string; version: number }[];
}
export interface Invitation {
  id: string;
  name: string;
  teacher: string;
  expiresAt: string;
  recipient?: string;
  acceptedAt?: string;
  revokedAt?: string;
  issuedAt?: string;
  deliveryStatus?: string;
  deliveryError?: string | null;
}
export interface Member {
  studentId?: string;
  enrollmentId?: string;
  firstName: string;
  lastName: string;
  periods?: {
    joinedAt: string;
    endedAt: string | null;
    endReason: string | null;
  }[];
}
export interface FileState {
  id: string;
  name: string;
  ready: boolean;
  upload: string;
  validation: string;
  scan: string;
  rejectionCode: string | null;
}
const messages: Record<string, string> = {
  AUTH_REQUIRED: 'Tu sesión finalizó. Inicia sesión para continuar.',
  EMAIL_VERIFICATION_REQUIRED: 'Verifica tu correo para continuar.',
  CSRF_INVALID: 'La sesión cambió. Vuelve a intentar la acción.',
  ORIGIN_NOT_ALLOWED: 'Abre FoxMind desde su dirección habitual para continuar.',
  RATE_LIMITED: 'Se alcanzó el límite de intentos. Espera antes de volver a intentar.',
  REQUEST_TOO_LARGE: 'Los datos superan el tamaño permitido.',
  INVALID_INPUT: 'Revisá los campos: hay un dato incompleto o inválido.',
  FORBIDDEN:
    'Tu cuenta no tiene acceso a esta acción. Verificá tu correo o volvé a ingresar.',
  CONFLICT:
    'No se pudo guardar: el estado cambió o la acción está temporalmente bloqueada. Actualizá y volvé a intentar.',
  ENROLLMENT_UNAVAILABLE:
    'No pudimos completar el ingreso. Revisá el código, la invitación y la cuenta utilizada.',
  SERVICE_UNAVAILABLE:
    'El servicio no está disponible. Tus cambios confirmados siguen guardados. Volvé a intentar.',
  QUOTA_EXCEEDED: 'No hay espacio disponible para este archivo.',
  FILE_NOT_READY: 'El archivo todavía no está aprobado.',
  FILE_REJECTED: 'El archivo no superó la revisión. Elegí otro PDF o DOCX.',
  FILE_TOO_LARGE: 'El plan puede pesar hasta 20 MB.',
  FILE_TYPE_NOT_ALLOWED: 'El plan debe ser un PDF o DOCX.',
};
export class ApiError extends Error {
  code: string;
  readonly status: number;
  readonly retryAfter: number;
  constructor(code: string, status = 0, retryAfter = 0) {
    super(
      messages[code] ?? 'No se pudo completar la acción. Volvé a intentar.',
    );
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}
export interface ClassroomClient {
  call<T>(
    path: string,
    method?: string,
    data?: unknown,
    signal?: AbortSignal,
  ): Promise<T>;
  upload(draftId: string, file: File): Promise<FileState>;
  fileStatus(id: string, signal?: AbortSignal): Promise<FileState>;
  fileUrl(id: string, preview?: boolean): string;
}
export function createClassroomClient(options: {
  csrfToken: () => Promise<string>;
  fetch?: typeof fetch;
  prefix?: string;
}): ClassroomClient {
  const request = options.fetch ?? fetch;
  const prefix = options.prefix ?? '';
  if (prefix !== '' && !/^\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+$/.test(prefix))
    throw new Error('A same-origin API prefix is required.');
  async function response<T>(
    path: string,
    method = 'GET',
    data?: unknown,
    signal?: AbortSignal,
  ): Promise<T> {
    const headers: Record<string, string> = {};
    if (method !== 'GET') {
      headers['X-CSRF-Token'] = await options.csrfToken();
      headers['Content-Type'] =
        data instanceof File ? 'application/octet-stream' : 'application/json';
    }
    let res: Response;
    try { res = await request(prefix + path, {
      method,
      headers,
      credentials: 'same-origin',
      cache: 'no-store',
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(60_000)]) : AbortSignal.timeout(60_000),
      body:
        method === 'GET'
          ? undefined
          : data instanceof File
            ? data
            : JSON.stringify(data ?? {}),
    }); } catch (error) {
      if (signal?.aborted) throw error;
      throw new ApiError('SERVICE_UNAVAILABLE', 503);
    }
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      const retry = Number(res.headers.get('retry-after'));
      throw new ApiError(error.error?.code ?? 'SERVICE_UNAVAILABLE', res.status,
        Number.isSafeInteger(retry) && retry > 0 ? retry : 0);
    }
    try { return await res.json(); }
    catch { throw new ApiError('SERVICE_UNAVAILABLE', 503); }
  }
  return {
    call: (path, method, data, signal) =>
      response('/classrooms' + path, method, data, signal),
    upload: async (draftId, file) => {
      if (file.size > 20000000) throw new ApiError('FILE_TOO_LARGE');
      if (!/\.(pdf|docx)$/i.test(file.name))
        throw new ApiError('FILE_TYPE_NOT_ALLOWED');
      const started = await response<{ id: string }>('/files', 'POST', {
        scope: { kind: 'draft', id: draftId },
        purpose: 'plan',
        name: file.name,
        bytes: file.size,
      });
      return response<FileState>(`/files/${started.id}/content`, 'PUT', file);
    },
    fileStatus: (id, signal) =>
      response<FileState>(`/files/${id}`, 'GET', undefined, signal),
    fileUrl: (id, preview = false) =>
      `${prefix}/files/${encodeURIComponent(id)}/content?mode=${preview ? 'preview' : 'download'}`,
  };
}
