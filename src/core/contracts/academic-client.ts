import type { FileState } from './materials.ts';
import type { AttemptEditor } from './participation.ts';
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
  FILE_REJECTED: 'El archivo no superó la revisión. Elegí otro PDF, Word o PowerPoint.',
  FILE_TOO_LARGE: 'El plan puede pesar hasta 20 MB.',
  FILE_TYPE_NOT_ALLOWED: 'El plan debe ser PDF, Word o PowerPoint.',
  MATERIAL_FILE_TOO_LARGE: 'PDF, Word y PowerPoint admiten hasta 20 MB; los demás formatos, hasta 50 MB.',
  MATERIAL_FILE_TYPE_NOT_ALLOWED: 'El material debe ser PDF, DOC, DOCX, PPT, PPTX, XLSX, JPG, JPEG, PNG o ZIP.',
  MATERIAL_FILE_REJECTED: 'El archivo no superó la revisión de seguridad. Elige otro archivo permitido; este material no se publicó.',
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
  attempt?<T>(path: string, data: unknown, editor?: AttemptEditor, signal?: AbortSignal): Promise<T>;
  call<T>(
    path: string,
    method?: string,
    data?: unknown,
    signal?: AbortSignal,
  ): Promise<T>;
  upload(draftId: string, file: File): Promise<FileState>;
  uploadClassroom?(classroomId: string, file: File, purpose: 'plan' | 'material'): Promise<FileState>;
  uploadAttachment?(classroomId: string, attemptId: string, file: File, editor: AttemptEditor): Promise<FileState>;
  fileStatus(id: string, signal?: AbortSignal): Promise<FileState>;
  fileUrl(id: string, preview?: boolean): string;
}
