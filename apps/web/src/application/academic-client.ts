import { parseGradingView, parsePublishedGradeResult, parseGradeCorrectionsView, parseNotificationPage } from '../../../../src/core/domain/index.ts';

import { ApiError, type ClassroomClient } from '../../../../src/core/contracts/academic-client.ts';
import type { AttemptEditor } from '../../../../src/core/contracts/participation.ts';
import type { FileState } from '../../../../src/core/contracts/materials.ts';

export function createClassroomClient(options: {
  csrfToken: (signal?: AbortSignal) => Promise<string>;
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
    signal?.throwIfAborted();
    const headers: Record<string, string> = {};
    if (method !== 'GET') {
      headers['X-CSRF-Token'] = await options.csrfToken(signal);
      signal?.throwIfAborted();
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
    signal?.throwIfAborted();
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      signal?.throwIfAborted();
      const retry = Number(res.headers.get('retry-after'));
      throw new ApiError(error.error?.code ?? 'SERVICE_UNAVAILABLE', res.status,
        Number.isSafeInteger(retry) && retry > 0 ? retry : 0);
    }
    try {
      let value: unknown = await res.json();
      signal?.throwIfAborted();
      if (/\/attempts\/[^/]+\/(?:grading|publish-grade)$/.test(path)) value = parseGradingView(value);
      else if (/\/attempts\/[^/]+\/grade-corrections$/.test(path)) value = parseGradeCorrectionsView(value);
      else if (/\/attempts\/[^/]+\/result$/.test(path)) value = parsePublishedGradeResult(value);
      else if (/\/notifications\/page(?:\?|$)/.test(path)) value = parseNotificationPage(value);
      return value as T;
    } catch { signal?.throwIfAborted(); throw new ApiError('SERVICE_UNAVAILABLE', 503); }
  }
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
