import type { ChatAttachment } from '../../../../src/core/contracts/chat-attachments.ts';
import { createSessionCsrfSource } from './http/csrf.ts';

// One CSRF token for the tab's attachments; account mutations in this tab drop it.
const csrf = createSessionCsrfSource();
const root = '/api/v1/chat-attachments';
export const teacherAttachmentPath = (conversationId: string) => `${root}/teacher/${encodeURIComponent(conversationId)}`;
export const teacherAttachmentFilePath = (conversationId: string, attachmentId: string) =>
  `${teacherAttachmentPath(conversationId)}/${encodeURIComponent(attachmentId)}/file?mode=preview`;
export const studentAttachmentPath = (folderId: string, conversationId: string) =>
  `${root}/student/${encodeURIComponent(folderId)}/${encodeURIComponent(conversationId)}`;

const messages: Record<string, string> = {
  INVALID_INPUT: 'Elegí un PDF, Word o PowerPoint con un nombre de hasta 120 caracteres.',
  INVALID_UPLOAD: 'El archivo está vacío o supera el límite de 20 MB.',
  REQUEST_TOO_LARGE: 'El archivo supera el límite de 20 MB.',
  QUOTA_EXCEEDED: 'No hay espacio disponible. Podés quitar un adjunto o desmarcar la copia en carpeta.',
  FILE_REJECTED: 'El archivo no pasó la validación. Elegí otro documento.',
  FILE_NOT_READY: 'Foxy no pudo leer el documento. Probá con otro documento compatible.',
  FORBIDDEN: 'Este chat ya no permite el cambio. Actualizá la conversación.',
  AUTH_REQUIRED: 'Volvé a iniciar sesión para acceder a tus archivos.',
};

export async function requestChatAttachment<T>(path: string, method: 'GET' | 'PUT' | 'DELETE', signal: AbortSignal, body?: File) {
  const headers: Record<string, string> = {};
  if (method !== 'GET') {
    try {
      headers['X-CSRF-Token'] = await csrf.token(signal);
    } catch (error) {
      if (signal.aborted) throw error;
      throw new Error(messages.AUTH_REQUIRED);
    }
    if (body) headers['Content-Type'] = 'application/octet-stream';
  }
  const response = await fetch(path, { method, headers, body, signal, cache: 'no-store', credentials: 'same-origin' });
  const data = await response.json();
  if (!response.ok && data.error?.code === 'CSRF_INVALID') csrf.invalidate();
  if (!response.ok) throw new Error(messages[data.error?.code] ?? 'No pudimos completar el cambio. Volvé a intentar.');
  return data as T;
}

export type { ChatAttachment };
