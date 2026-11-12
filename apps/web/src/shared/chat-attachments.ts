import type { ChatAttachment } from '../../../../src/core/contracts/chat-attachments.ts';

const root = '/api/v1/chat-attachments';
export const teacherAttachmentPath = (conversationId: string) => `${root}/teacher/${encodeURIComponent(conversationId)}`;
export const studentAttachmentPath = (folderId: string, conversationId: string) =>
  `${root}/student/${encodeURIComponent(folderId)}/${encodeURIComponent(conversationId)}`;

const messages: Record<string, string> = {
  INVALID_INPUT: 'Elegí un PDF o DOCX con un nombre de hasta 120 caracteres.',
  INVALID_UPLOAD: 'El archivo está vacío o supera el límite de 20 MB.',
  REQUEST_TOO_LARGE: 'El archivo supera el límite de 20 MB.',
  QUOTA_EXCEEDED: 'No hay espacio disponible. Podés quitar un adjunto o desmarcar la copia en carpeta.',
  FILE_REJECTED: 'El archivo no pasó la validación. Elegí otro documento.',
  FILE_NOT_READY: 'Foxy no pudo leer el documento. Probá con otro PDF o DOCX.',
  FORBIDDEN: 'Este chat ya no permite el cambio. Actualizá la conversación.',
  AUTH_REQUIRED: 'Volvé a iniciar sesión para acceder a tus archivos.',
};

export async function requestChatAttachment<T>(path: string, method: 'GET' | 'PUT' | 'DELETE', signal: AbortSignal, body?: File) {
  const headers: Record<string, string> = {};
  if (method !== 'GET') {
    const csrf = await fetch('/api/v1/auth/csrf', { signal, cache: 'no-store' });
    if (!csrf.ok) throw new Error(messages.AUTH_REQUIRED);
    headers['X-CSRF-Token'] = (await csrf.json()).csrfToken;
    if (body) headers['Content-Type'] = 'application/octet-stream';
  }
  const response = await fetch(path, { method, headers, body, signal, cache: 'no-store', credentials: 'same-origin' });
  const data = await response.json();
  if (!response.ok) throw new Error(messages[data.error?.code] ?? 'No pudimos completar el cambio. Volvé a intentar.');
  return data as T;
}

export type { ChatAttachment };
