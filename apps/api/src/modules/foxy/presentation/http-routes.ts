import type { FoxyCatalogQueries, FoxyBinaryReader } from '../application/read-ports.ts';
import type { createFoxyCreationService } from '../resources/public.ts';
import { strictObject } from '../../../../../../src/core/domain/curriculum/plan.ts';
import { parseEditFoxyResource, parsePrepareFoxyPublication, parsePrepareFoxyVisualPublication, parseConfirmFoxyPublication, parseRetryFoxyPublication, parseDiscardFoxyPublication } from '../../../../../../src/core/domain/foxy/resource-validation.ts';
import { parseFoxySourceQuery } from '../../../../../../src/core/domain/foxy/source-query.ts';
import type { IncomingMessage } from 'node:http';
import type { createFoxyConversationService } from '../conversations/public.ts';
import type { createFoxyVisualService } from '../visuals/public.ts';
import type { createFoxyTurnService } from '../turns/public.ts';
import type { createFoxyCitationService } from '../citations/public.ts';
import type { createFoxyResourceService } from '../resources/public.ts';
import type { createFoxyPublicationService } from '../publications/public.ts';
import type { createFoxyPublicationManagementService } from '../publications/public.ts';
import type { createFoxyPrivateAssetEditorialService } from '../private-assets/public.ts';
import type { createFoxyPrivateAssetReadService } from '../private-assets/public.ts';
import { body, create, cursor, id, integer, message, query, remove, rename, visual } from './http-input.ts';

type Services = { privateAssetEditorial?: ReturnType<typeof createFoxyPrivateAssetEditorialService>; creations?: ReturnType<typeof createFoxyCreationService>; visuals?: ReturnType<typeof createFoxyVisualService>; privateAssetReader?: FoxyBinaryReader; privateAssetReadService?: ReturnType<typeof createFoxyPrivateAssetReadService>; conversations: ReturnType<typeof createFoxyConversationService>; turns: ReturnType<typeof createFoxyTurnService>;
  catalog: FoxyCatalogQueries; citations: ReturnType<typeof createFoxyCitationService>;
  resources: ReturnType<typeof createFoxyResourceService>; publications: ReturnType<typeof createFoxyPublicationService>; publicationFiles: FoxyBinaryReader; publicationManagement: ReturnType<typeof createFoxyPublicationManagementService>; capabilities(request: IncomingMessage): Promise<unknown> };
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
// Shared request context of one Foxy call; each route returns undefined when it does not apply (D3: foxyRoute split).
type Context = { services: Services; request: IncomingMessage; url: URL; path: string; signal: AbortSignal };
type Route = (context: Context) => Promise<Result> | undefined;
const invalidInput = (): never => { throw Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' }); };
const hasBody = (request: IncomingMessage) => request.headers['transfer-encoding'] !== undefined
  || (request.headers['content-length'] !== undefined && request.headers['content-length'] !== '0');
const fileMode = (url: URL) => {
  const mode = query(url, ['mode']).mode ?? 'download';
  return mode === 'preview' || mode === 'download' ? mode : invalidInput();
};
const page = (url: URL) => {
  const params = query(url, ['limit', 'afterId']);
  return { limit: integer(params.limit, 20, 1, 50), afterId: params.afterId === undefined ? null : id(params.afterId) };
};

const editorialRoute: Route = ({ services, request, url, path }) => {
  const editorial = /^\/assets\/([^/]+)\/editorial$/u.exec(path);
  if (!editorial || request.method !== 'PATCH') return undefined;
  return (async () => {
    query(url, []); if (!services.privateAssetEditorial) return missing();
    return { status: 200, body: await services.privateAssetEditorial.edit(request, id(editorial[1]!), await body(request)) };
  })();
};
const privateAssetRoute: Route = ({ services, request, url, path, signal }) => {
  const privateAsset = /^\/assets\/([^/]+)(?:\/(file))?$/u.exec(path);
  if (!privateAsset || request.method !== 'GET') return undefined;
  return (async () => {
    if (hasBody(request)) invalidInput();
    const assetId = id(privateAsset[1]!);
    if (!privateAsset[2]) {
      query(url, []); if (!services.privateAssetReadService) return missing();
      return { status: 200, body: await services.privateAssetReadService.inspect(request, assetId) };
    }
    const mode = fileMode(url);
    if (!services.privateAssetReader) return missing();
    const result = await services.privateAssetReader.readFile(request, assetId, mode, signal);
    return { status: 200, binary: result.bytes, headers: result.headers };
  })();
};
const capabilitiesRoute: Route = ({ services, request, url, path }) => {
  if (path !== '/capabilities' || request.method !== 'GET') return undefined;
  return (async () => { query(url, []); return { status: 200, body: await services.capabilities(request) }; })();
};
const creationsRoute: Route = ({ services, request, url, path }) => {
  if (path !== '/creations' || request.method !== 'GET') return undefined;
  return (async () => {
    const params = query(url, ['limit','after','q','context','type','status']);
    if (!services.creations) return missing();
    return { status: 200, body: await services.creations.list(request, { limit: integer(params.limit,20,1,50), after: cursor(params.after),
      q: params.q, context: params.context, type: params.type, status: params.status }) };
  })();
};
const collectionRoute: Route = ({ services, request, url, path }) => (path === '/conversations' ? collection(services, request, url) : undefined);
const cancelVisualRoute: Route = ({ services, request, url, path }) => {
  const cancelVisual = /^\/conversations\/([^/]+)\/visuals\/([^/]+)\/cancel$/u.exec(path);
  if (!cancelVisual || request.method !== 'POST') return undefined;
  return (async () => {
    query(url, []); strictObject(await body(request), []);
    if (!services.visuals) return missing();
    return { status: 200, body: await services.visuals.cancel(request, id(cancelVisual[1]!), id(cancelVisual[2]!)) };
  })();
};
const visualsRoute: Route = ({ services, request, url, path, signal }) => {
  const visuals = /^\/conversations\/([^/]+)\/visuals(?:\/([^/]+))?$/u.exec(path);
  if (!visuals || (request.method !== 'GET' && request.method !== 'POST')) return undefined;
  return (async () => {
    const conversationId = id(visuals[1]!);
    if (request.method === 'POST' && !visuals[2]) {
      query(url, []); const input = visual(await body(request));
      if (signal.aborted) throw Object.assign(new Error('SERVICE_UNAVAILABLE'), { code: 'SERVICE_UNAVAILABLE' });
      if (!services.visuals) return missing();
      const result = await services.visuals.start(request, conversationId, input);
      return { status: result.created ? 202 : 200, body: result };
    }
    if (request.method !== 'GET') return missing();
    if (hasBody(request)) invalidInput();
    if (visuals[2]) {
      query(url, []); const jobId = id(visuals[2]); if (!services.visuals) return missing();
      return { status: 200, body: await services.visuals.get(request, conversationId, jobId) };
    }
    const pageQuery = page(url);
    if (!services.visuals) return missing();
    return { status: 200, body: await services.visuals.list(request, conversationId, pageQuery) };
  })();
};
const cancelTurnRoute: Route = ({ services, request, url, path }) => {
  const cancelTurn = /^\/conversations\/([^/]+)\/turns\/([^/]+)\/cancel$/u.exec(path);
  if (!cancelTurn || request.method !== 'POST') return undefined;
  return (async () => {
    query(url, []); strictObject(await body(request), []);
    return { status: 200, body: await services.turns.cancel(request, id(cancelTurn[1]!), id(cancelTurn[2]!)) };
  })();
};
const resourceTurnRoute: Route = ({ services, request, url, path }) => {
  const resourceTurn = /^\/conversations\/([^/]+)\/turns\/([^/]+)\/resource$/u.exec(path);
  if (!resourceTurn || request.method !== 'POST') return undefined;
  return (async () => {
    query(url, []); const result = await services.resources.fromTurn(request, id(resourceTurn[1]!), id(resourceTurn[2]!));
    return { status: result.created ? 201 : 200, body: result };
  })();
};
const activityDraftRoute: Route = ({ services, request, url, path }) => {
  const activityDraft = /^\/resources\/([^/]+)\/activity-draft$/u.exec(path);
  if (!activityDraft || request.method !== 'POST') return undefined;
  return (async () => {
    query(url, []); return { status: 200, body: await services.resources.prepareActivity(request, id(activityDraft[1]!), await body(request)) };
  })();
};
const resourcePublicationsRoute: Route = ({ services, request, url, path }) => {
  const preparePublication = /^\/resources\/([^/]+)\/publications$/u.exec(path);
  if (!preparePublication || (request.method !== 'POST' && request.method !== 'GET')) return undefined;
  return (async () => {
    const resourceId = id(preparePublication[1]!);
    if (request.method === 'GET') return { status: 200, body: await services.publications.list(request, resourceId, page(url)) };
    query(url, []); const result = await services.publications.prepare(request, resourceId, parsePrepareFoxyPublication(await body(request)));
    return { status: result.created ? 202 : 200, body: result };
  })();
};
const assetPublicationsRoute: Route = ({ services, request, url, path }) => {
  const prepareVisualPublication = /^\/assets\/([^/]+)\/publications$/u.exec(path);
  if (!prepareVisualPublication || (request.method !== 'POST' && request.method !== 'GET')) return undefined;
  return (async () => {
    if (request.method === 'POST') {
      query(url, []); const result = await services.publications.prepareVisual(request, id(prepareVisualPublication[1]!), parsePrepareFoxyVisualPublication(await body(request)));
      return { status: result.created ? 202 : 200, body: result };
    }
    if (hasBody(request)) invalidInput();
    const pageQuery = page(url);
    return { status: 200, body: await services.publications.listVisual(request, id(prepareVisualPublication[1]!), pageQuery) };
  })();
};
const managementRoute: Route = ({ services, request, url, path }) => {
  const management = /^\/publications\/([^/]+)\/(management|retry|discard)$/u.exec(path);
  if (!management) return undefined;
  return (async () => {
    query(url, []); const publicationId = id(management[1]!);
    if (management[2] === 'management' && request.method === 'GET') return { status: 200, body: await services.publicationManagement.inspect(request, publicationId) };
    if (management[2] === 'retry' && request.method === 'POST') return { status: 200, body: await services.publicationManagement.retry(request, publicationId, parseRetryFoxyPublication(await body(request))) };
    if (management[2] === 'discard' && request.method === 'POST') return { status: 200, body: await services.publicationManagement.discard(request, publicationId, parseDiscardFoxyPublication(await body(request))) };
    return missing();
  })();
};
const publicationFileRoute: Route = ({ services, request, url, path }) => {
  const publicationFile = /^\/publications\/([^/]+)\/file$/u.exec(path);
  if (!publicationFile || request.method !== 'GET') return undefined;
  return (async () => {
    const mode = fileMode(url);
    const result = await services.publicationFiles.readFile(request, id(publicationFile[1]!), mode);
    return { status: 200, binary: result.bytes, headers: result.headers };
  })();
};
const publicationRoute: Route = ({ services, request, url, path }) => {
  const publication = /^\/publications\/([^/]+)(?:\/(confirm))?$/u.exec(path);
  if (!publication) return undefined;
  return (async () => {
    query(url, []); const publicationId = id(publication[1]!);
    if (!publication[2] && request.method === 'GET') return { status: 200, body: await services.publications.inspect(request, publicationId) };
    if (publication[2] && request.method === 'POST') return { status: 200, body: await services.publications.confirm(request, publicationId, parseConfirmFoxyPublication(await body(request))) };
    return missing();
  })();
};
const resourceRoute: Route = ({ services, request, url, path }) => {
  const resource = /^\/resources\/([^/]+)$/u.exec(path);
  if (!resource || (request.method !== 'GET' && request.method !== 'PATCH')) return undefined;
  return (async () => {
    query(url, []); const resourceId = id(resource[1]!);
    if (request.method === 'GET') return { status: 200, body: await services.resources.get(request, resourceId) };
    return { status: 200, body: await services.resources.edit(request, resourceId, parseEditFoxyResource(await body(request))) };
  })();
};
const citationRoute: Route = ({ services, request, url, path }) => {
  const citation = /^\/conversations\/([^/]+)\/turns\/([^/]+)\/citations(?:\/([^/]+)\/file)?$/u.exec(path);
  if (!citation || request.method !== 'GET') return undefined;
  return (async () => {
    const conversationId = id(citation[1]!), turnId = id(citation[2]!);
    if (!citation[3]) { query(url, []); return { status: 200, body: await services.citations.list(request, conversationId, turnId) }; }
    if (!/^c[1-9][0-9]*$/u.test(citation[3])) invalidInput();
    const mode = fileMode(url);
    const result = await services.citations.readFile(request, conversationId, turnId, citation[3], mode);
    return { status: 200, binary: result.bytes, headers: result.headers };
  })();
};
// The conversation catch-all answers every remaining /conversations/... path, including unknown ones (404).
const conversationRoute: Route = ({ services, request, url, path }) => {
  const match = /^\/conversations\/([^/]+)(?:\/(turns|curriculum|sources)(?:\/([^/]+))?)?$/u.exec(path);
  if (!match) return undefined;
  return (async () => {
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
  })();
};

// Ordered first match: the order is the one foxyRoute had before the split and is pinned by foxy-route-dispatch.
const routes: readonly Route[] = [editorialRoute, privateAssetRoute, capabilitiesRoute, creationsRoute, collectionRoute,
  cancelVisualRoute, visualsRoute, cancelTurnRoute, resourceTurnRoute, activityDraftRoute, resourcePublicationsRoute,
  assetPublicationsRoute, managementRoute, publicationFileRoute, publicationRoute, resourceRoute, citationRoute, conversationRoute];

export async function foxyRoute(services: Services, request: IncomingMessage, url: URL, signal: AbortSignal = new AbortController().signal): Promise<Result> {
  const context = { services, request, url, path: url.pathname.slice('/api/v1/foxy-ai'.length), signal };
  for (const route of routes) {
    const result = route(context);
    if (result) return result;
  }
  return missing();
}
export type { Services as FoxyHttpServices };
