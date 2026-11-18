import type { StudyCollection, StudyDetail, StudyFolder } from '../model/study-contracts.ts';
import type {
  StudyFolderInput,
  StudyCommandResponse,
  StudyAction,
  StudyCommandData,
} from '../model/study-commands.ts';
import { StudyError } from './study-error.ts';
import { isAiBudgetRejectionCode } from '../../../../../../src/core/contracts/ai-quota.ts';
export function createStudyClient(fetcher: typeof fetch = fetch) {
  const requests = new Map<string, string>();
  async function call<T>(path = '', method = 'GET', body?: unknown): Promise<T> {
    let response: Response;
    try {
      const headers: Record<string, string> = {};
      if (method !== 'GET') {
        const csrf = await fetcher('/api/v1/auth/csrf', {
          credentials: 'same-origin',
          cache: 'no-store',
        });
        const data = await csrf.json();
        if (!csrf.ok) throw new StudyError(data?.error?.code ?? 'AUTH_REQUIRED', csrf.status);
        headers['X-CSRF-Token'] = data.csrfToken;
        headers['Content-Type'] = 'application/json';
      }
      response = await fetcher(`/api/v1/study-folders${path}`, {
        method,
        headers,
        credentials: 'same-origin',
        cache: 'no-store',
        signal: AbortSignal.timeout(120000),
        body: method === 'GET' ? undefined : JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok)
        throw new StudyError(result?.error?.code ?? 'SERVICE_UNAVAILABLE', response.status, result?.error?.quota);
      return result as T;
    } catch (e) {
      if (e instanceof StudyError) throw e;
      throw new StudyError('SERVICE_UNAVAILABLE', 503);
    }
  }
  return {
    call,
    list: () => call<StudyCollection>(),
    get: (id: string) => call<StudyDetail>(`/${encodeURIComponent(id)}`),
    create: (data: StudyFolderInput) =>
      call<{
        folder: StudyFolder;
      }>('', 'POST', data),
    update: (id: string, data: StudyFolderInput) =>
      call<{
        folder: StudyFolder;
      }>(`/${encodeURIComponent(id)}`, 'PATCH', data),
    cancel: (id: string, targetRequestId: string) =>
      call<{
        folder: StudyFolder;
        result: {
          status: 'CANCELLED' | 'ALREADY_FINISHED';
        };
      }>(`/${encodeURIComponent(id)}/commands`, 'POST', {
        action: 'CANCEL_GENERATION',
        targetRequestId,
      }),
    command: async <A extends StudyAction>(
      id: string,
      revision: string,
      action: A,
      data: StudyCommandData[A] = {} as StudyCommandData[A],
      requestId?: string,
    ) => {
      const key = JSON.stringify({ id, action, data });
      const token = requestId ?? requests.get(key) ?? crypto.randomUUID();
      requests.set(key, token);
      const result = await call<StudyCommandResponse>(
        `/${encodeURIComponent(id)}/commands`,
        'POST',
        { ...data, revision, requestId: token, action },
      ).catch((error: unknown) => {
        if (
          error instanceof StudyError &&
          isAiBudgetRejectionCode(error.code) &&
          requests.get(key) === token
        )
          requests.delete(key);
        throw error;
      });
      const status = result.result?.status;
      if (status === 'PENDING') throw new StudyError('PENDING', 409);
      requests.delete(key);
      if (status === 'FAILED') {
        const code = result.result?.errorCode;
        if (isAiBudgetRejectionCode(code)) throw new StudyError(code, 429, result.result?.quota);
        throw new StudyError('AI_FAILED', 503);
      }
      if (status === 'INSUFFICIENT') throw new StudyError('SOURCES_INSUFFICIENT', 422);
      return result;
    },
  };
}
