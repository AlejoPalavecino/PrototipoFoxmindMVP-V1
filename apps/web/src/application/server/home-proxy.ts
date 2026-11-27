import type { IncomingMessage, ServerResponse } from 'node:http';
import { parseHomeQuery, parseHomePageQuery, parseHomeResponse, parseHomeModuleResponse } from '../../../../../src/core/domain/home/validation.ts';
import { apiDestination, forward, reject, rejectRequest, relayJson, requireNoBody, strictPath, upstreamHeaders } from './transport/api-transport.ts';

const MAX_RESPONSE = 2 * 1024 * 1024, TIMEOUT_MS = 30_000;
const modulePath = /^\/api\/v1\/home\/modules\/(pending|review|feedback|agenda|queries|materials|classrooms|drafts|submitted)$/;

function route(request: IncomingMessage): { url: URL; module: boolean } {
  const url = strictPath(request.url), match = modulePath.exec(url.pathname);
  if (url.pathname !== '/api/v1/home' && !match) reject(404, 'NOT_FOUND');
  if (request.method !== 'GET') reject(405, 'METHOD_NOT_ALLOWED');
  requireNoBody(request);
  const query = Object.fromEntries(url.searchParams);
  if ([...url.searchParams.keys()].length !== Object.keys(query).length) reject(400, 'INVALID_INPUT');
  try {
    if (match) {
      if (Object.hasOwn(query, 'module')) throw new Error();
      parseHomePageQuery({ ...query, module: match[1], cursor: query.cursor ?? null });
    } else parseHomeQuery(query);
  } catch { reject(400, 'INVALID_INPUT'); }
  return { url, module: Boolean(match) };
}

export async function proxyHomeRequest(request: IncomingMessage, response: ServerResponse, configuredOrigin?: string): Promise<void> {
  let selected: ReturnType<typeof route>, origin: string;
  try { selected = route(request); origin = apiDestination(configuredOrigin); }
  catch (error) { await rejectRequest(request, response, error, { budget: 0 }); return; }
  await forward(request, response, {
    origin, path: selected.url.pathname + selected.url.search, method: 'GET', headers: upstreamHeaders(request, ['cookie', 'origin']), timeoutMs: TIMEOUT_MS,
    handle: result => relayJson(result, response, { limit: MAX_RESPONSE, timeoutMs: TIMEOUT_MS, cookies: 'session-clear',
      validate: (status, body) => { if (status === 200) { if (selected.module) parseHomeModuleResponse(body); else parseHomeResponse(body); } } }),
  });
}
