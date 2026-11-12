import { HomeClientError, type HomeClient } from '../features/home/api.ts';
import { parseHomeQuery, parseHomePageQuery, parseHomeResponse, parseHomeModuleResponse } from '../../../../src/core/domain/index.ts';
export function createWebHomeClient(fetcher: typeof fetch = fetch, onIdentityRequired?: (code:string)=>void): HomeClient {
  async function call(path: string, signal?: AbortSignal): Promise<unknown> {
    try {
      const response = await fetcher(`/api/v1/home${path}`,{ method:'GET',credentials:'same-origin',cache:'no-store',
        signal:signal ? AbortSignal.any([signal,AbortSignal.timeout(30_000)]) : AbortSignal.timeout(30_000) });
      const body: unknown = await response.json();
      if (!response.ok) {
        const code = body && typeof body === 'object' && 'error' in body && body.error && typeof body.error === 'object'
          && 'code' in body.error && typeof body.error.code === 'string' ? body.error.code : 'SERVICE_UNAVAILABLE';
        if (['AUTH_REQUIRED','EMAIL_VERIFICATION_REQUIRED'].includes(code)) onIdentityRequired?.(code);
        throw new HomeClientError(code,response.status);
      }
      return body;
    } catch (error) {
      if (signal?.aborted || error instanceof HomeClientError) throw error;
      throw new HomeClientError('SERVICE_UNAVAILABLE',503);
    }
  }
  return {
    async read(input,signal) {
      const query = parseHomeQuery(input), result = await call(`?${new URLSearchParams({...query})}`,signal);
      try { return parseHomeResponse(result); } catch { throw new HomeClientError('SERVICE_UNAVAILABLE',503); }
    },
    async page(input,signal) {
      const query = parseHomePageQuery(input), search = new URLSearchParams({timeZone:query.timeZone});
      if (query.cursor !== null) search.set('cursor',query.cursor);
      if (query.order !== undefined) search.set('order',query.order);
      const result = await call(`/modules/${query.module}?${search}`,signal);
      try { return parseHomeModuleResponse(result); } catch { throw new HomeClientError('SERVICE_UNAVAILABLE',503); }
    },
  };
}
