import type { createFoxyCreationService } from './creation-service.ts';
import { parseEditFoxyResource, parseFoxySourceQuery, parsePrepareFoxyPublication, parsePrepareFoxyVisualPublication, parseConfirmFoxyPublication, parseRetryFoxyPublication, parseDiscardFoxyPublication } from '../../../../src/core/domain/index.ts';
import type { IncomingMessage } from 'node:http';
import type { createFoxyConversationService } from './conversation-service.ts';
import type { createFoxyVisualService } from './visual-service.ts';
import type { createFoxyTurnService } from './turn-service.ts';
import type { FoxyContextCatalogService } from './context-catalog.ts';
import type { createFoxyCitationService } from './citation-service.ts';
import type { createFoxyResourceService } from './resource-service.ts';
import type { createFoxyPublicationService } from './publication-service.ts';
import type { createFoxyPublicationFileReader } from './publication-file-reader.ts';
import type { createFoxyPublicationManagementService } from './publication-management-service.ts';
import type { createFoxyPrivateAssetReader } from './private-asset-reader.ts';
import type { createFoxyPrivateAssetReadService } from './private-asset-read-service.ts';
import { body, create, cursor, id, integer, message, query, remove, rename, visual } from './http-input.ts';

type Services = { creations?: ReturnType<typeof createFoxyCreationService>; visuals?: ReturnType<typeof createFoxyVisualService>; privateAssetReader?: ReturnType<typeof createFoxyPrivateAssetReader>; privateAssetReadService?: ReturnType<typeof createFoxyPrivateAssetReadService>; conversations: ReturnType<typeof createFoxyConversationService>; turns: ReturnType<typeof createFoxyTurnService>;
  catalog: Pick<FoxyContextCatalogService, 'curriculum' | 'sources'>; citations: ReturnType<typeof createFoxyCitationService>;
  resources: ReturnType<typeof createFoxyResourceService>; publications: ReturnType<typeof createFoxyPublicationService>; publicationFiles: ReturnType<typeof createFoxyPublicationFileReader>; publicationManagement: ReturnType<typeof createFoxyPublicationManagementService>; capabilities(request: IncomingMessage): Promise<unknown> };
type Result = { status: number; body?: unknown; binary?: Uint8Array; headers?: Record<string, string> };
const missing = (): Result => ({ status: 404, body: { error: { code: 'NOT_FOUND' } } });
async function collection(services: Services, request: IncomingMessage, url: URL): Promise<Result> {
  if (request.method === 'POST') {
    query(url, []); const result = await services.conversations.create(request, create(await body(request)));
    return { status: result.created ? 201 : 200, body: result };
  }
  if (request.method === 'GET') {
    const params = query(url, ['limit', 'after', 'q', 'context']);
    return { status: 200, body: await services.conversations.list(request, { limit: integer(params.limit, 20, 1, 100), after: cursor(params.after), q: params.q, context: params.context }) };
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
export async function foxyRoute(services: Services, request: IncomingMessage, url: URL, signal: AbortSignal = new AbortController().signal): Promise<Result> {
  const path = url.pathname.slice('/api/v1/foxy-ai'.length);
  const privateAsset = /^\/assets\/([^/]+)(?:\/(file))?$/u.exec(path);
  if (privateAsset && request.method === 'GET') {
    if (request.headers['transfer-encoding'] !== undefined || (request.headers['content-length'] !== undefined && request.headers['content-length'] !== '0'))
      throw Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' });
    const assetId = id(privateAsset[1]!);
    if (!privateAsset[2]) {
      query(url, []); if (!services.privateAssetReadService) return missing();
      return { status: 200, body: await services.privateAssetReadService.inspect(request,assetId) };
    }
    const params = query(url,['mode']), mode = params.mode ?? 'download';
    if (mode !== 'preview' && mode !== 'download') throw Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' });
    if (!services.privateAssetReader) return missing();
    const result = await services.privateAssetReader.readFile(request,assetId,mode,signal);
    return { status: 200, binary: result.bytes, headers: result.headers };
  }
  if (path === '/capabilities' && request.method === 'GET') { query(url, []); return { status: 200, body: await services.capabilities(request) }; }
  if (path === '/creations' && request.method === 'GET') {
    const params = query(url, ['limit','after','q','context','type','status']);
    if (!services.creations) return missing();
    return { status: 200, body: await services.creations.list(request, { limit: integer(params.limit,20,1,50), after: cursor(params.after),
      q: params.q, context: params.context, type: params.type, status: params.status }) };
  }
  if (path === '/conversations') return collection(services, request, url);
  const visuals = /^\/conversations\/([^/]+)\/visuals(?:\/([^/]+))?$/u.exec(path);
  if (visuals && (request.method === 'GET' || request.method === 'POST')) {
    const conversationId = id(visuals[1]!);
    if (request.method === 'POST' && !visuals[2]) {
      query(url, []); const input = visual(await body(request));
      if (signal.aborted) throw Object.assign(new Error('SERVICE_UNAVAILABLE'), { code: 'SERVICE_UNAVAILABLE' });
      if (!services.visuals) return missing();
      const result = await services.visuals.start(request,conversationId,input);
      return { status: result.created ? 202 : 200, body: result };
    }
    if (request.method === 'GET') {
      if (request.headers['transfer-encoding'] !== undefined || (request.headers['content-length'] !== undefined && request.headers['content-length'] !== '0'))
        throw Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' });
      if (visuals[2]) {
        query(url, []); const jobId = id(visuals[2]); if (!services.visuals) return missing();
        return { status: 200, body: await services.visuals.get(request,conversationId,jobId) };
      }
      const params = query(url,['limit','afterId']), page = { limit: integer(params.limit,20,1,50), afterId: params.afterId === undefined ? null : id(params.afterId) };
      if (!services.visuals) return missing();
      return { status: 200, body: await services.visuals.list(request,conversationId,page) };
    }
    return missing();
  }
  const resourceTurn = /^\/conversations\/([^/]+)\/turns\/([^/]+)\/resource$/u.exec(path);
  if (resourceTurn && request.method === 'POST') {
    query(url, []); const result = await services.resources.fromTurn(request, id(resourceTurn[1]!), id(resourceTurn[2]!));
    return { status: result.created ? 201 : 200, body: result };
  }
  const preparePublication = /^\/resources\/([^/]+)\/publications$/u.exec(path);
  const activityDraft = /^\/resources\/([^/]+)\/activity-draft$/u.exec(path);
  if (activityDraft && request.method === 'POST') {
    query(url, []); return { status: 200, body: await services.resources.prepareActivity(request, id(activityDraft[1]!), await body(request)) };
  }
  if (preparePublication && request.method === 'POST') {
    query(url, []); const result = await services.publications.prepare(request, id(preparePublication[1]!), parsePrepareFoxyPublication(await body(request)));
    return { status: result.created ? 202 : 200, body: result };
  }
  if (preparePublication && request.method === 'GET') {
    const params = query(url, ['limit', 'afterId']);
    return { status: 200, body: await services.publications.list(request, id(preparePublication[1]!),
      { limit: integer(params.limit, 20, 1, 50), afterId: params.afterId === undefined ? null : id(params.afterId) }) };
  }
  const prepareVisualPublication = /^\/assets\/([^/]+)\/publications$/u.exec(path);
  if (prepareVisualPublication && request.method === 'POST') {
    query(url, []); const result = await services.publications.prepareVisual(request, id(prepareVisualPublication[1]!), parsePrepareFoxyVisualPublication(await body(request)));
    return { status: result.created ? 202 : 200, body: result };
  }
  if (prepareVisualPublication && request.method === 'GET') {
    if (request.headers['transfer-encoding'] !== undefined || (request.headers['content-length'] !== undefined && request.headers['content-length'] !== '0'))
      throw Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' });
    const params = query(url, ['limit','afterId']);
    return { status: 200, body: await services.publications.listVisual(request,id(prepareVisualPublication[1]!),
      { limit: integer(params.limit,20,1,50), afterId: params.afterId === undefined ? null : id(params.afterId) }) };
  }
  const management = /^\/publications\/([^/]+)\/(management|retry|discard)$/u.exec(path);
  if (management) {
    query(url, []); const publicationId = id(management[1]!);
    if (management[2] === 'management' && request.method === 'GET') return { status: 200, body: await services.publicationManagement.inspect(request, publicationId) };
    if (management[2] === 'retry' && request.method === 'POST') return { status: 200, body: await services.publicationManagement.retry(request, publicationId, parseRetryFoxyPublication(await body(request))) };
    if (management[2] === 'discard' && request.method === 'POST') return { status: 200, body: await services.publicationManagement.discard(request, publicationId, parseDiscardFoxyPublication(await body(request))) };
    return missing();
  }
  const publicationFile = /^\/publications\/([^/]+)\/file$/u.exec(path);
  if (publicationFile && request.method === 'GET') {
    const params = query(url, ['mode']), mode = params.mode ?? 'download';
    if (mode !== 'preview' && mode !== 'download') throw Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' });
    const result = await services.publicationFiles.readFile(request, id(publicationFile[1]!), mode);
    return { status: 200, binary: result.bytes, headers: result.headers };
  }
  const publication = /^\/publications\/([^/]+)(?:\/(confirm))?$/u.exec(path);
  if (publication) {
    query(url, []); const publicationId = id(publication[1]!);
    if (!publication[2] && request.method === 'GET') return { status: 200, body: await services.publications.inspect(request, publicationId) };
    if (publication[2] && request.method === 'POST') return { status: 200, body: await services.publications.confirm(request, publicationId, parseConfirmFoxyPublication(await body(request))) };
    return missing();
  }
  const resource = /^\/resources\/([^/]+)$/u.exec(path);
  if (resource && (request.method === 'GET' || request.method === 'PATCH')) {
    query(url, []); const resourceId = id(resource[1]!);
    if (request.method === 'GET') return { status: 200, body: await services.resources.get(request, resourceId) };
    return { status: 200, body: await services.resources.edit(request, resourceId, parseEditFoxyResource(await body(request))) };
  }
  const citation = /^\/conversations\/([^/]+)\/turns\/([^/]+)\/citations(?:\/([^/]+)\/file)?$/u.exec(path);
  if (citation && request.method === 'GET') {
    const conversationId = id(citation[1]!), turnId = id(citation[2]!);
    if (!citation[3]) { query(url, []); return { status: 200, body: await services.citations.list(request, conversationId, turnId) }; }
    if (!/^c[1-9][0-9]*$/u.test(citation[3])) throw Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' });
    const params = query(url, ['mode']), mode = params.mode ?? 'download';
    if (mode !== 'preview' && mode !== 'download') throw Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' });
    const result = await services.citations.readFile(request, conversationId, turnId, citation[3], mode);
    return { status: 200, binary: result.bytes, headers: result.headers };
  }

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
