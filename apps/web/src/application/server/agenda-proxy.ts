import type { IncomingMessage, ServerResponse } from 'node:http';
import { performance } from 'node:perf_hooks';
import { apiDestination, forward, readBounded, reject, rejectRequest, relayJson, strictPath, upstreamHeaders } from './transport/api-transport.ts';

const MAX_REQUEST = 32 * 1024, MAX_RESPONSE = 2 * 1024 * 1024, BODY_TIMEOUT_MS = 10_000, TIMEOUT_MS = 30_000;
const eventPath = /^\/api\/v1\/agenda\/events\/([a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/i;
const occurrencePath = /^\/api\/v1\/agenda\/events\/([a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})\/occurrences\/\d{4}-\d{2}-\d{2}$/i;

function route(request: IncomingMessage): { url: URL; method: string } {
  const url = strictPath(request.url), method = request.method ?? 'GET';
  const methods = url.pathname === '/api/v1/agenda' || url.pathname === '/api/v1/agenda/upcoming' ? ['GET']
    : url.pathname === '/api/v1/agenda/open' ? ['POST'] : occurrencePath.test(url.pathname) ? ['PATCH', 'DELETE']
      : eventPath.test(url.pathname) ? ['GET', 'PUT', 'PATCH', 'DELETE'] : [];
  if (!methods.length) reject(404, 'NOT_FOUND');
  if (!methods.includes(method)) reject(405, 'METHOD_NOT_ALLOWED');
  return { url, method };
}
/** Transport only (F2): size, encoding and media type. Query and body shape are the API's rules. */
async function body(request: IncomingMessage, method: string): Promise<Buffer | undefined> {
  const length = request.headers['content-length'];
  if (length !== undefined && (typeof length !== 'string' || !/^\d+$/.test(length))) reject(400, 'INVALID_INPUT');
  if (Number(length ?? 0) > MAX_REQUEST) reject(413, 'REQUEST_TOO_LARGE');
  if (request.headers['content-encoding'] && request.headers['content-encoding'] !== 'identity') reject(400, 'INVALID_INPUT');
  if (method === 'GET') {
    if (Number(length ?? 0) || request.headers['transfer-encoding']) reject(400, 'INVALID_INPUT');
    return undefined;
  }
  if (!/^application\/json(?:;|$)/i.test(request.headers['content-type'] ?? '')) reject(400, 'INVALID_INPUT');
  const content = await readBounded(request, MAX_REQUEST, BODY_TIMEOUT_MS);
  if (length !== undefined && content.length !== Number(length)) reject(400, 'INVALID_INPUT');
  return content;
}

export async function proxyAgendaRequest(request: IncomingMessage, response: ServerResponse, configuredOrigin?: string): Promise<void> {
  const deadline = performance.now() + BODY_TIMEOUT_MS;
  let selected: ReturnType<typeof route>, content: Buffer | undefined, origin: string;
  try {
    selected = route(request);
    content = await body(request, selected.method);
    origin = apiDestination(configuredOrigin);
  } catch (error) { await rejectRequest(request, response, error, { budget: MAX_REQUEST + 1, deadline }); return; }
  await forward(request, response, {
    origin, path: selected.url.pathname + selected.url.search, method: selected.method, body: content, timeoutMs: TIMEOUT_MS,
    headers: upstreamHeaders(request, ['cookie', 'origin', 'x-csrf-token', 'content-type']),
    handle: result => relayJson(result, response, { limit: MAX_RESPONSE, timeoutMs: TIMEOUT_MS, cookies: 'session-clear' }),
  });
}
