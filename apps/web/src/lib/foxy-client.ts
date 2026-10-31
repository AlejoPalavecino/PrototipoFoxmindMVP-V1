import { agendaId, type CreateFoxyConversation, type FoxyContext, type FoxyPurpose,
  type FoxySourceKind, type FoxySourceCursor, type SendFoxyMessage } from '../../../../src/core/domain/index.ts';

export interface FoxyConversation { id: string; title: string; context: FoxyContext; revision: string }
export interface FoxyConversationCursor { updatedAt: string; id: string }
export interface FoxyTurn { id: string; sequence: number; state: 'QUEUED' | 'RUNNING' | 'READY' | 'FAILED' | 'STALE';
  purpose: FoxyPurpose; message: string; answer: { title: string; markdown: string; schemaVersion: 'foxy-answer-v1'; warnings: string[]; missingInformation: string[] } | null;
  errorCode: string | null; createdAt: string }
export interface FoxyCapabilities { textGeneration: { enabled: boolean }; imageGeneration: { enabled: boolean }; diagramGeneration: { enabled: boolean } }
export interface FoxyCurriculum { context: FoxyContext; classroomRevision: string | null; classroomTitle: string | null;
  archived: boolean; canGenerate: boolean; units: { id: string; name: string; position: number;
    topics: { id: string; name: string; position: number; status: 'PENDING' | 'NEXT' | 'TAUGHT' }[] }[] }
export interface FoxySource { sourceId: string; kind: FoxySourceKind; title: string; available: boolean; reason: string | null;
  extension: string | null; sizeBytes: string | null; unitId: string | null; topicIds: string[]; planVersion: number | null;
  currentPlan: boolean | null; createdAt: string; publishedAt: string | null; documentCount: number }
export interface FoxyCitation { id: string; sourceKind: FoxySourceKind | null; sourceTitle: string | null; documentTitle: string | null;
  page: number | null; availability: 'AVAILABLE' | 'TEXT_ONLY' | 'UNAVAILABLE'; href: string | null }
type Page<T, C> = { items: T[]; next: C | null };
type TurnPage = { items: FoxyTurn[]; nextAfterSequence: number | null };
type TurnReceipt = { id: string; sequence: number; state: FoxyTurn['state'] };
export class FoxyClientError extends Error {
  readonly code: string; readonly status: number;
  constructor(code: string, status: number) { super('No se pudo completar la solicitud de Foxy AI.'); this.code = code; this.status = status; }
}
const root = '/api/v1/foxy-ai';
const safeCodes = new Set(['AUTH_REQUIRED', 'EMAIL_VERIFICATION_REQUIRED', 'FORBIDDEN', 'CSRF_INVALID', 'ORIGIN_NOT_ALLOWED',
  'RATE_LIMITED', 'INVALID_INPUT', 'NOT_FOUND', 'CONFLICT', 'FILE_NOT_READY', 'EMPTY_CONTENT', 'AI_INPUT_LIMIT',
  'AI_UNAVAILABLE', 'AI_BUDGET_EXCEEDED', 'RESPONSE_TOO_LARGE', 'REQUEST_TOO_LARGE', 'SERVICE_UNAVAILABLE']);
function encodedCursor(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  if (bytes.length > 3000) throw new FoxyClientError('INVALID_INPUT', 400);
  let raw = ''; for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '');
}
function params(values: Record<string, string | number | null | object>): string {
  const query = new URLSearchParams();
  for (const [name, value] of Object.entries(values)) if (value !== null) query.set(name, typeof value === 'object' ? encodedCursor(value) : String(value));
  return `?${query}`;
}
export function createWebFoxyClient(fetcher: typeof fetch = fetch, onIdentityRequired?: (code: string) => void) {
  async function call<T>(path: string, method = 'GET', data?: unknown, signal?: AbortSignal): Promise<T> {
    const combined = signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000);
    async function json<TResponse>(url: string, init: RequestInit): Promise<TResponse> {
      const response = await fetcher(url, { ...init, credentials: 'same-origin', cache: 'no-store', signal: combined });
      if (response.status === 204) return undefined as TResponse;
      let result: unknown; try { result = await response.json(); } catch { throw new FoxyClientError('SERVICE_UNAVAILABLE', 503); }
      if (!response.ok) {
        const candidate = (result as { error?: { code?: unknown } } | null)?.error?.code;
        const code = typeof candidate === 'string' && safeCodes.has(candidate) ? candidate : 'SERVICE_UNAVAILABLE';
        throw new FoxyClientError(code, response.status);
      }
      return result as TResponse;
    }
    try {
      combined.throwIfAborted();
      const headers: Record<string, string> = {};
      if (method !== 'GET') {
        const csrf = await json<{ csrfToken: string }>('/api/v1/auth/csrf', { method: 'GET' });
        if (!csrf || typeof csrf.csrfToken !== 'string' || !csrf.csrfToken) throw new FoxyClientError('SERVICE_UNAVAILABLE', 503);
        headers['X-CSRF-Token'] = csrf.csrfToken; headers['Content-Type'] = 'application/json';
      }
      return await json<T>(`${root}${path}`, { method, headers, ...(method === 'GET' ? {} : { body: JSON.stringify(data) }) });
    } catch (error) {
      if (signal?.aborted) throw error;
      if (error instanceof FoxyClientError) {
        if (error.code === 'AUTH_REQUIRED' || error.code === 'EMAIL_VERIFICATION_REQUIRED') onIdentityRequired?.(error.code);
        throw error;
      }
      throw new FoxyClientError('SERVICE_UNAVAILABLE', 503);
    }
  }
  const conversationPath = (conversationId: string) => `/conversations/${agendaId(conversationId)}`;
  const turnsPath = (conversationId: string) => `${conversationPath(conversationId)}/turns`;
  const turnPath = (conversationId: string, turnId: string) => `${turnsPath(conversationId)}/${agendaId(turnId)}`;
  return {
    capabilities: (signal?: AbortSignal) => call<FoxyCapabilities>('/capabilities', 'GET', undefined, signal),
    listConversations: (page: { limit: number; after: FoxyConversationCursor | null }, signal?: AbortSignal) =>
      call<Page<FoxyConversation, FoxyConversationCursor>>(`/conversations${params(page)}`, 'GET', undefined, signal),
    createConversation: (input: CreateFoxyConversation, signal?: AbortSignal) =>
      call<{ created: boolean; conversation: FoxyConversation }>('/conversations', 'POST', input, signal),
    getConversation: (id: string, signal?: AbortSignal) => call<FoxyConversation>(conversationPath(id), 'GET', undefined, signal),
    renameConversation: (id: string, input: { revision: string; title: string }, signal?: AbortSignal) =>
      call<FoxyConversation>(conversationPath(id), 'PATCH', input, signal),
    removeConversation: (id: string, input: { revision: string; confirm: true }, signal?: AbortSignal) =>
      call<void>(conversationPath(id), 'DELETE', input, signal),
    curriculum: (id: string, signal?: AbortSignal) => call<FoxyCurriculum>(`${conversationPath(id)}/curriculum`, 'GET', undefined, signal),
    sources: (id: string, page: { kind: FoxySourceKind; limit: number; after: FoxySourceCursor | null }, signal?: AbortSignal) =>
      call<{ context: FoxyContext; items: FoxySource[]; next: FoxySourceCursor | null }>(`${conversationPath(id)}/sources${params(page)}`, 'GET', undefined, signal),
    sendMessage: (id: string, input: SendFoxyMessage, signal?: AbortSignal) =>
      call<{ created: boolean; turn: TurnReceipt; conversationRevision: string }>(turnsPath(id), 'POST', input, signal),
    listTurns: (id: string, page: { afterSequence: number; limit: number }, signal?: AbortSignal) =>
      call<TurnPage>(`${turnsPath(id)}${params(page)}`, 'GET', undefined, signal),
    getTurn: (id: string, turnId: string, signal?: AbortSignal) => call<FoxyTurn>(turnPath(id, turnId), 'GET', undefined, signal),
    citations: (id: string, turnId: string, signal?: AbortSignal) => call<FoxyCitation[]>(`${turnPath(id, turnId)}/citations`, 'GET', undefined, signal),
    citationUrl: (id: string, turnId: string, citationId: string, mode: 'preview' | 'download' = 'download') => {
      if (!/^c[1-9][0-9]*$/u.test(citationId) || !['preview', 'download'].includes(mode)) throw new FoxyClientError('INVALID_INPUT', 400);
      return `${root}${turnPath(id, turnId)}/citations/${citationId}/file?mode=${mode}`;
    },
  };
}
export type WebFoxyClient = ReturnType<typeof createWebFoxyClient>;
