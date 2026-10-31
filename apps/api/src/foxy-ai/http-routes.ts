import { parseFoxySourceQuery } from '../../../../src/core/domain/index.ts';
import type { IncomingMessage } from 'node:http';
import type { createFoxyConversationService } from './conversation-service.ts';
import type { createFoxyTurnService } from './turn-service.ts';
import type { FoxyContextCatalogService } from './context-catalog.ts';
import { body, create, cursor, id, integer, message, query, remove, rename } from './http-input.ts';

type Services = { conversations: ReturnType<typeof createFoxyConversationService>; turns: ReturnType<typeof createFoxyTurnService>;
  catalog: Pick<FoxyContextCatalogService, 'curriculum' | 'sources'>; capabilities(request: IncomingMessage): Promise<unknown> };
type Result = { status: number; body?: unknown };
const missing = (): Result => ({ status: 404, body: { error: { code: 'NOT_FOUND' } } });
async function collection(services: Services, request: IncomingMessage, url: URL): Promise<Result> {
  if (request.method === 'POST') {
    query(url, []); const result = await services.conversations.create(request, create(await body(request)));
    return { status: result.created ? 201 : 200, body: result };
  }
  if (request.method === 'GET') {
    const params = query(url, ['limit', 'after']);
    return { status: 200, body: await services.conversations.list(request, { limit: integer(params.limit, 20, 1, 100), after: cursor(params.after) }) };
  }
  return missing();
}
async function conversation(services: Services, request: IncomingMessage, url: URL, conversationId: string): Promise<Result> {
  query(url, []);
  if (request.method === 'GET') return { status: 200, body: await services.conversations.get(request, conversationId) };
  if (request.method === 'PATCH') return { status: 200, body: await services.conversations.rename(request, conversationId, rename(await body(request))) };
  if (request.method === 'DELETE') { await services.conversations.remove(request, conversationId, remove(await body(request))); return { status: 204 }; }
  return missing();
}
async function turns(services: Services, request: IncomingMessage, url: URL, conversationId: string, turnId?: string): Promise<Result> {
  if (turnId && request.method === 'GET') { query(url, []); return { status: 200, body: await services.turns.get(request, conversationId, id(turnId)) }; }
  if (!turnId && request.method === 'POST') {
    query(url, []); const result = await services.turns.send(request, conversationId, message(await body(request)));
    return { status: result.created ? 202 : 200, body: result };
  }
  if (!turnId && request.method === 'GET') {
    const params = query(url, ['afterSequence', 'limit']);
    return { status: 200, body: await services.turns.list(request, conversationId,
      { afterSequence: integer(params.afterSequence, 0, 0, 2147483647), limit: integer(params.limit, 20, 1, 100) }) };
  }
  return missing();
}
export async function foxyRoute(services: Services, request: IncomingMessage, url: URL): Promise<Result> {
  const path = url.pathname.slice('/api/v1/foxy-ai'.length);
  if (path === '/capabilities' && request.method === 'GET') { query(url, []); return { status: 200, body: await services.capabilities(request) }; }
  if (path === '/conversations') return collection(services, request, url);
  const match = /^\/conversations\/([^/]+)(?:\/(turns|curriculum|sources)(?:\/([^/]+))?)?$/u.exec(path);
  if (!match) return missing();
  const conversationId = id(match[1]!), section = match[2], turnId = match[3];
  if (!section) return conversation(services, request, url, conversationId);
  if (section === 'turns') return turns(services, request, url, conversationId, turnId);
  if (!turnId && section === 'curriculum' && request.method === 'GET') {
    query(url, []); return { status: 200, body: await services.catalog.curriculum(request, conversationId) };
  }
  if (!turnId && section === 'sources' && request.method === 'GET') {
    const params = query(url, ['kind', 'limit', 'after']);
    return { status: 200, body: await services.catalog.sources(request, conversationId,
      parseFoxySourceQuery({ kind: params.kind, limit: integer(params.limit, 20, 1, 50), after: cursor(params.after) })) };
  }
  return missing();
}
export type { Services as FoxyHttpServices };
