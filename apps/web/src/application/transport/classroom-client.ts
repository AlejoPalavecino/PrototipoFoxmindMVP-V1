import { createJsonRequest } from './json-request.ts';
import { decodeAcademicResponse } from './academic-response.ts';
import { ApiError, type ClassroomClient } from '../../../../../src/core/contracts/academic-client.ts';
import type { FileState } from '../../../../../src/core/contracts/materials.ts';

export function createClassroomClient(options: {
  csrfToken: (signal?: AbortSignal) => Promise<string>;
  fetch?: typeof fetch;
  prefix?: string;
}): ClassroomClient {
  const prefix = options.prefix ?? '';
  const response = createJsonRequest({ ...options, decode: decodeAcademicResponse });
  return {
    attempt: (path, data, editor, signal) => response('/classrooms' + path, 'POST', data, signal, editor),
    call: (path, method, data, signal) =>
      response('/classrooms' + path, method, data, signal),
    upload: async (draftId, file) => {
      if (file.size > 20000000) throw new ApiError('FILE_TOO_LARGE');
      if (!/\.(pdf|doc|docx|ppt|pptx)$/i.test(file.name))
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
      if (file.size > (material && !/\.(pdf|doc|docx|ppt|pptx)$/i.test(file.name) ? 50_000_000 : 20_000_000)) throw new ApiError(material ? 'MATERIAL_FILE_TOO_LARGE' : 'FILE_TOO_LARGE');
      if (!(material ? /\.(pdf|doc|docx|ppt|pptx|xlsx|jpg|jpeg|png|zip)$/i : /\.(pdf|doc|docx|ppt|pptx)$/i).test(file.name))
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
    uploadAttachment: async (classroomId, attemptId, file, editor) => {
      if (file.size > (/\.(pdf|doc|docx|ppt|pptx)$/i.test(file.name) ? 20_000_000 : 50_000_000)) throw new ApiError('MATERIAL_FILE_TOO_LARGE');
      if (!/\.(pdf|doc|docx|ppt|pptx|xlsx|jpg|jpeg|png|zip)$/i.test(file.name)) throw new ApiError('MATERIAL_FILE_TYPE_NOT_ALLOWED');
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
