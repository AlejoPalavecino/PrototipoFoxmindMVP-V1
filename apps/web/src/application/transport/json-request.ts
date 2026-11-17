import { ApiError } from '../../../../../src/core/contracts/academic-client.ts';
import type { AttemptEditor } from '../../../../../src/core/contracts/participation.ts';

export interface JsonRequestOptions {
  csrfToken: (signal?: AbortSignal) => Promise<string>;
  fetch?: typeof fetch;
  prefix?: string;
  decode?: (path: string, value: unknown) => unknown;
}

/** Browser transport only. Academic response policies are supplied by composition. */
export function createJsonRequest(options: JsonRequestOptions) {
  const request = options.fetch ?? fetch, prefix = options.prefix ?? '';
  if (prefix !== '' && !/^\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+$/.test(prefix)) throw new Error('A same-origin API prefix is required.');
  return async function response<T>(path: string, method = 'GET', data?: unknown, signal?: AbortSignal, editor?: AttemptEditor): Promise<T> {
    signal?.throwIfAborted();
    const headers: Record<string, string> = {};
    if (method !== 'GET') {
      headers['X-CSRF-Token'] = await options.csrfToken(signal);
      signal?.throwIfAborted();
      headers['Content-Type'] = data instanceof File ? 'application/octet-stream' : 'application/json';
    }
    if (editor) { headers['X-Attempt-Editor'] = editor.token; headers['X-Attempt-Epoch'] = editor.epoch; }
    let result: Response;
    try {
      result = await request(prefix + path, { method, headers, credentials: 'same-origin', cache: 'no-store',
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(60_000)]) : AbortSignal.timeout(60_000),
        body: method === 'GET' ? undefined : data instanceof File ? data : JSON.stringify(data ?? {}),
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new ApiError('SERVICE_UNAVAILABLE', 503);
    }
    signal?.throwIfAborted();
    if (!result.ok) {
      const error = await result.json().catch(() => ({}));
      signal?.throwIfAborted();
      const retry = Number(result.headers.get('retry-after'));
      throw new ApiError(error.error?.code ?? 'SERVICE_UNAVAILABLE', result.status, Number.isSafeInteger(retry) && retry > 0 ? retry : 0);
    }
    try {
      const value: unknown = await result.json(); signal?.throwIfAborted();
      return (options.decode ? options.decode(path, value) : value) as T;
    } catch { signal?.throwIfAborted(); throw new ApiError('SERVICE_UNAVAILABLE', 503); }
  };
}
