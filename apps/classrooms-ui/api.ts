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
export interface Material {
  id: string;
  title: string;
  fileId: string;
  fileName: string;
  extension: string;
  sizeBytes: string;
  unitId: string | null;
  topicId: string | null;
  ready: boolean;
  previewable: boolean;
  linked: boolean;
  deleted: boolean;
  deletionPending: boolean;
}
export interface WallContent {
  id: string;
  authorName: string;
  initials: string;
  body: string | null;
  createdAt: string;
  editedAt: string | null;
  removedAt: string | null;
  canEdit: boolean;
  canRemove: boolean;
}
export interface WallPost extends WallContent {
  type: 'NOTICE' | 'QUERY';
  replies: WallContent[];
}
export interface WallData { revision: string; posts: WallPost[] }
export type ActivityType = 'ASSIGNMENT' | 'QUESTIONNAIRE' | 'EVALUATION';
export interface ActivityQuestion {
  id?: string;
  type: 'DEVELOPMENT' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
  prompt: string;
  points: string;
  scoringRule?: 'EXACT' | 'PARTIAL' | null;
  options: { id?: string; text: string; correct?: boolean }[];
}
export interface ActivitySummary {
  id: string; type: ActivityType; title: string | null; unitId: string | null; topicId: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'WITHDRAWN'; publishedAt: string | null; deadlineAt: string | null;
  allowLate: boolean; locked: boolean; zone: string;
}
export interface ActivityDetail extends ActivitySummary {
  instructions: string | null; attachmentRequired: boolean; questions: ActivityQuestion[];
  instructionFiles: { id: string; name: string; extension: string; ready: boolean }[];
  materials: { id: string; title: string; fileId: string; extension: string }[];
}
export interface ActivityData { revision: string; preview: boolean; activity: ActivityDetail }
export interface AttemptEditor { token: string; epoch: string }
export interface AttemptSessionData {
  activity: ActivityDetail; expected: boolean; eligibilityReason: string | null; archived: boolean; serverTime: string;
  reception: { deadlineAt: string | null; open: boolean; late: boolean }; canStart: boolean; canTransfer: boolean;
  attempt: { id: string; number: number; status: 'DRAFT' | 'SUBMITTED'; openedAt: string; submittedAt: string | null;
    appliedDeadlineAt: string | null; submittedLate: boolean | null; epoch: string; revision: string;
    attachments?: AttemptAttachment[];
    answers: { questionId: string; text: string | null; optionIds: string[]; savedAt: string }[] } | null;
  editor?: AttemptEditor;
}
export interface AttemptAttachment extends FileState {
  extension: string; sizeBytes: string; selected: boolean;
}
export interface AssignmentReceipt {
  id: string; number: number; submittedAt: string; appliedDeadlineAt: string | null; submittedLate: boolean;
  firstName: string; lastName: string; attachments: AttemptAttachment[];
}
export interface ActivityEligibilityData {
  revision: string; published: boolean; students: { studentId: string; firstName: string; lastName: string;
    expected: boolean; reason: string | null; individualDeadlineAt: string | null }[];
}
export interface DeadlineResolution {
  zone: string; local: string; reason: 'NONEXISTENT' | 'AMBIGUOUS' | null;
  choices: { instant: string; offsetMinutes: number; offset: string }[];
}
export interface ClassroomNotification {
  id: string;
  classroomId: string;
  classroomName: string;
  eventType: 'WALL_NOTICE' | 'WALL_QUERY' | 'WALL_REPLY';
  postId: string;
  replyId: string | null;
  createdAt: string;
  readAt: string | null;
}
export interface WallTarget { classroomId: string; postId: string; replyId: string | null }
export function canPreviewMaterial(material: Pick<Material, 'extension' | 'ready' | 'deleted'>): boolean {
  return material.ready && !material.deleted && ['pdf', 'jpg', 'jpeg', 'png'].includes(material.extension);
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
  MATERIAL_FILE_TOO_LARGE: 'El material puede pesar hasta 50 MB.',
  MATERIAL_FILE_TYPE_NOT_ALLOWED: 'El material debe ser PDF, DOCX, PPTX, XLSX, JPG, JPEG, PNG o ZIP.',
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
  uploadInstruction?(classroomId: string, activityId: string, file: File): Promise<FileState>;
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
    editor?: AttemptEditor,
  ): Promise<T> {
    const headers: Record<string, string> = {};
    if (method !== 'GET') {
      headers['X-CSRF-Token'] = await options.csrfToken();
      headers['Content-Type'] =
        data instanceof File ? 'application/octet-stream' : 'application/json';
    }
    if (editor) {
      headers['X-Attempt-Editor'] = editor.token;
      headers['X-Attempt-Epoch'] = editor.epoch;
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
    attempt: (path, data, editor, signal) => response('/classrooms' + path, 'POST', data, signal, editor),
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
    uploadClassroom: async (classroomId, file, purpose) => {
      const material = purpose === 'material';
      if (file.size > (material ? 50_000_000 : 20_000_000)) throw new ApiError(material ? 'MATERIAL_FILE_TOO_LARGE' : 'FILE_TOO_LARGE');
      if (!(material ? /\.(pdf|docx|pptx|xlsx|jpg|jpeg|png|zip)$/i : /\.(pdf|docx)$/i).test(file.name))
        throw new ApiError(material ? 'MATERIAL_FILE_TYPE_NOT_ALLOWED' : 'FILE_TYPE_NOT_ALLOWED');
      try {
        const started = await response<{ id: string }>('/files', 'POST', {
          scope: { kind: 'classroom', id: classroomId }, purpose, name: file.name, bytes: file.size,
        });
        return await response<FileState>(`/files/${started.id}/content`, 'PUT', file);
      } catch (error) {
        if (material && error instanceof ApiError && ['FILE_TOO_LARGE', 'FILE_TYPE_NOT_ALLOWED', 'FILE_REJECTED'].includes(error.code))
          throw new ApiError(`MATERIAL_${error.code}`, error.status, error.retryAfter);
        throw error;
      }
    },
    uploadInstruction: async (classroomId, activityId, file) => {
      if (file.size > 20_000_000) throw new ApiError('FILE_TOO_LARGE');
      if (!/\.(pdf|docx)$/i.test(file.name)) throw new ApiError('FILE_TYPE_NOT_ALLOWED');
      const started = await response<{ id: string }>('/files', 'POST', {
        scope: { kind: 'classroom', id: classroomId }, purpose: 'instructions', targetId: activityId, name: file.name, bytes: file.size,
      });
      return response<FileState>(`/files/${started.id}/content`, 'PUT', file);
    },
    uploadAttachment: async (classroomId, attemptId, file, editor) => {
      if (file.size > 50_000_000) throw new ApiError('MATERIAL_FILE_TOO_LARGE');
      if (!/\.(pdf|docx|pptx|xlsx|jpg|jpeg|png|zip)$/i.test(file.name)) throw new ApiError('MATERIAL_FILE_TYPE_NOT_ALLOWED');
      if (!/^[A-Za-z0-9_-]{43}$/.test(editor.token) || !/^(0|[1-9][0-9]{0,18})$/.test(editor.epoch)) throw new ApiError('INVALID_INPUT');
      const started = await response<{ id: string }>('/files', 'POST', {
        scope: { kind: 'classroom', id: classroomId }, purpose: 'attachment', targetId: attemptId, name: file.name, bytes: file.size,
      }, undefined, editor);
      try { return await response<FileState>(`/files/${started.id}/content`, 'PUT', file, undefined, editor); }
      catch (error) {
        if (error instanceof ApiError && error.code === 'FILE_REJECTED') throw new ApiError('MATERIAL_FILE_REJECTED', error.status, error.retryAfter);
        throw error;
      }
    },
    fileUrl: (id, preview = false) =>
      `${prefix}/files/${encodeURIComponent(id)}/content?mode=${preview ? 'preview' : 'download'}`,
  };
}
