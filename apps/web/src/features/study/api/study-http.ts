import type { StudyCollection, StudyDetail, StudyFolder } from '../model/study-contracts.ts';
import type {
  StudyFolderInput,
  StudyCommandResponse,
  StudyAction,
  StudyCommandData,
} from '../model/study-commands.ts';
import { StudyError } from './study-error.ts';
import { isAiBudgetRejectionCode } from '../../../../../../src/core/contracts/ai-quota.ts';
import type { PutSharedStudyStrategy, SharedStudyStrategyView } from '../../../../../../src/core/contracts/study-shared-strategy.ts';
import type { CsrfTokenSource } from '../../../../../../src/core/contracts/csrf.ts';

export function createStudyClient(fetcher: typeof fetch = fetch, csrf?: CsrfTokenSource) {
  const requests = new Map<string, string>();
  async function call<T>(path = '', method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
    let response: Response;
    try {
      const headers: Record<string, string> = {};
      const timeout = AbortSignal.timeout(120000);
      const requestSignal = signal ? AbortSignal.any([signal,timeout]) : timeout;
      if (method !== 'GET') {
        headers['X-CSRF-Token'] = csrf ? await sharedToken(csrf, requestSignal) : await freshToken(requestSignal);
        if (body !== undefined) headers['Content-Type'] = 'application/json';
      }
      response = await fetcher(`/api/v1/study-folders${path}`, {
        method,
        headers,
        credentials: 'same-origin',
        cache: 'no-store',
        signal: requestSignal,
        body: method === 'GET' ? undefined : JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok)
        throw new StudyError(result?.error?.code ?? 'SERVICE_UNAVAILABLE', response.status, result?.error?.quota);
      return result as T;
    } catch (e) {
      if (e instanceof StudyError) {
        if (e.code === 'CSRF_INVALID') csrf?.invalidate();
        throw e;
      }
      throw new StudyError('SERVICE_UNAVAILABLE', 503);
    }
  }
  async function freshToken(signal: AbortSignal) {
    const response = await fetcher('/api/v1/auth/csrf', { credentials: 'same-origin', cache: 'no-store', signal });
    const data = await response.json();
    if (!response.ok) throw new StudyError(data?.error?.code ?? 'AUTH_REQUIRED', response.status);
    return data.csrfToken as string;
  }
  async function sharedToken(source: CsrfTokenSource, signal: AbortSignal) {
    try {
      return await source.token(signal);
    } catch (error) {
      const { code, status } = error as { code?: unknown; status?: unknown };
      if (typeof code === 'string' && typeof status === 'number') throw new StudyError(code, status);
      throw error;
    }
  }
  return {
    call,
    list: () => call<StudyCollection>(),
    sharedStrategy: (folderId: string, signal?: AbortSignal) =>
      call<SharedStudyStrategyView>(`/${encodeURIComponent(folderId)}/shared-strategy`, 'GET', undefined, signal),
    shareStrategy: (folderId: string, draft: PutSharedStudyStrategy, signal?: AbortSignal) =>
      call<SharedStudyStrategyView>(`/${encodeURIComponent(folderId)}/shared-strategy`, 'PUT', draft, signal),
    withdrawStrategy: (folderId: string, strategyId: string, signal?: AbortSignal) =>
      call<SharedStudyStrategyView>(`/${encodeURIComponent(folderId)}/shared-strategy/${encodeURIComponent(strategyId)}`, 'DELETE', undefined, signal),
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

export type SharedStrategyClient = Pick<ReturnType<typeof createStudyClient>, 'sharedStrategy'|'shareStrategy'|'withdrawStrategy'>;
