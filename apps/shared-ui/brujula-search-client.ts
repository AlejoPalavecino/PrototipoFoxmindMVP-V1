import { parseBrujulaSearchPage, type BrujulaSearchClient } from '../../src/core/domain/brujula-search.ts';

export function createBrujulaSearchClient(api: { call<T>(path: string, method?: string, data?: unknown, signal?: AbortSignal): Promise<T> }): BrujulaSearchClient {
  return async (query, cursor, signal) => {
    const params = new URLSearchParams({ q: query, ...(cursor ? { cursor } : {}) });
    return parseBrujulaSearchPage(await api.call(`/search?${params}`, 'GET', undefined, signal));
  };
}
