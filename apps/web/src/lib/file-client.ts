export interface FileContext { kind: 'draft' | 'classroom'; id: string; purpose: 'plan' | 'material' }
export interface PrivateFileStatus {
  id: string; name: string; sizeBytes: number; ready: boolean;
  upload: string; validation: string; scan: string; rejectionCode: string | null;
}
export interface FileUsage { usedBytes: string; quotaBytes: string; availableBytes: string }
export function fileState(file: Pick<PrivateFileStatus, 'ready' | 'rejectionCode' | 'validation' | 'scan'>): 'pending' | 'rejected' | 'ready' {
  if (file.ready) return 'ready';
  return file.rejectionCode === 'FILE_REJECTED' || file.validation === 'REJECTED' || file.scan === 'REJECTED' ? 'rejected' : 'pending';
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parseFileContext(query: Record<string, string | string[] | undefined>): FileContext | null {
  const { kind, id, purpose } = query;
  if ((kind !== 'draft' && kind !== 'classroom') || typeof id !== 'string' || !uuid.test(id) ||
    (purpose !== 'plan' && purpose !== 'material') || (kind === 'draft' && purpose !== 'plan') ||
    Object.keys(query).some(key => !['kind', 'id', 'purpose'].includes(key))) return null;
  return { kind, id, purpose };
}
const messages: Record<string, string> = {
  AUTH_REQUIRED: 'Inicia sesión para continuar.', EMAIL_VERIFICATION_REQUIRED: 'Verifica tu correo para continuar.',
  FORBIDDEN: 'No tienes permiso para acceder a estos archivos.', NOT_FOUND: 'No se encontró el archivo o el contexto.',
  CSRF_INVALID: 'La sesión cambió. Vuelve a intentar.', ORIGIN_NOT_ALLOWED: 'Abre FoxMind desde su dirección habitual.',
  QUOTA_EXCEEDED: 'No hay espacio disponible. Los archivos existentes siguen disponibles.',
  FILE_TOO_LARGE: 'El archivo supera el tamaño permitido.', FILE_TYPE_NOT_ALLOWED: 'El tipo de archivo no está permitido.',
  FILE_REJECTED: 'El archivo fue rechazado. Selecciona otro archivo permitido.',
  FILE_NOT_READY: 'El archivo todavía no está listo.', UPLOAD_CONFLICT: 'Este archivo no se puede reemplazar. Reintenta con los mismos bytes.',
  INVALID_UPLOAD: 'No se pudo validar el archivo. Revisa su nombre y contenido.', RATE_LIMITED: 'Espera antes de volver a intentar.',
};
export class FileClientError extends Error {
  readonly code: string; readonly status: number; readonly retryAfter: number;
  constructor(code: string, status: number, retryAfter = 0) {
    super(messages[code] ?? 'No se pudo completar la operación. Vuelve a intentar en unos momentos.');
    this.code = code; this.status = status; this.retryAfter = retryAfter;
  }
}
export function createFileClient(fetcher: typeof fetch = fetch) {
  async function read<T>(path: string, init: RequestInit = {}): Promise<T> {
    try {
      const response = await fetcher(`/api/v1${path}`, { ...init, credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(65_000) });
      const data = await response.json();
      if (!response.ok) {
        const retry = Number(response.headers.get('retry-after'));
        throw new FileClientError(typeof data?.error?.code === 'string' ? data.error.code : 'SERVICE_UNAVAILABLE', response.status, Number.isSafeInteger(retry) && retry > 0 ? retry : 0);
      }
      return data as T;
    } catch (error) { throw error instanceof FileClientError ? error : new FileClientError('SERVICE_UNAVAILABLE', 503); }
  }
  async function mutate(path: string, body: BodyInit, method: 'POST' | 'PUT', contentType: string) {
    const { csrfToken } = await read<{ csrfToken: string }>('/auth/csrf');
    if (typeof csrfToken !== 'string' || !csrfToken) throw new FileClientError('AUTH_REQUIRED', 401);
    return read<PrivateFileStatus>(path, { method, body, headers: { 'Content-Type': contentType, 'X-CSRF-Token': csrfToken } });
  }
  const contentUrl = (id: string, mode: 'preview' | 'download') => {
    if (!uuid.test(id)) throw new FileClientError('INVALID_UPLOAD', 400);
    return `/api/v1/files/${id}/content?mode=${mode}`;
  };
  return {
    begin: (context: FileContext, file: File) => mutate('/files', JSON.stringify({ scope: { kind: context.kind, id: context.id }, purpose: context.purpose, name: file.name, bytes: file.size }), 'POST', 'application/json'),
    send: (id: string, file: File) => {
      if (!uuid.test(id)) throw new FileClientError('INVALID_UPLOAD', 400);
      return mutate(`/files/${id}/content`, file, 'PUT', 'application/octet-stream');
    },
    async upload(context: FileContext, file: File) {
      const pending = await this.begin(context, file);
      return this.send(pending.id, file);
    },
    status: (id: string) => {
      if (!uuid.test(id)) throw new FileClientError('INVALID_UPLOAD', 400);
      return read<PrivateFileStatus>(`/files/${id}`);
    },
    usage: (context: FileContext) => read<FileUsage>(`/files/usage?${new URLSearchParams({ kind: context.kind, id: context.id })}`),
    contentUrl,
  };
}
