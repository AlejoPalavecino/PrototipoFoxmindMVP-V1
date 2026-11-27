import { request as httpRequest, type IncomingMessage, type ServerResponse } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { aiQuotaEventsPath, aiQuotaPath } from '../../../../../src/core/contracts/ai-quota.ts';
import { apiDestination, ProxyRejection, rejectRequest, relayHeaders, sendError, upstreamHeaders } from './transport/api-transport.ts';

const IDLE_MS = 22_000;

function check(request: IncomingMessage, response: ServerResponse): string {
  const path = request.url?.split('?')[0];
  if (path !== aiQuotaPath && path !== aiQuotaEventsPath) throw new ProxyRejection(404, 'NOT_FOUND');
  if (request.method !== 'GET') { response.setHeader('Allow', 'GET'); throw new ProxyRejection(405, 'METHOD_NOT_ALLOWED'); }
  if (request.url !== path || Number(request.headers['content-length']) || request.headers['transfer-encoding'])
    throw new ProxyRejection(400, 'INVALID_INPUT');
  // The quota stream is private state read with the session cookie; browsers must not embed it cross-site.
  if (['cross-site', 'same-site'].includes(request.headers['sec-fetch-site'] ?? '')) throw new ProxyRejection(403, 'ORIGIN_NOT_ALLOWED');
  return path;
}

export async function proxyAiQuotaRequest(request: IncomingMessage, response: ServerResponse, configuredOrigin?: string) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  let path: string, origin: string;
  try { path = check(request, response); origin = apiDestination(configuredOrigin); }
  catch (error) { await rejectRequest(request, response, error, { budget: 0 }); return; }

  await new Promise<void>(resolve => {
    const transport = origin.startsWith('https:') ? httpsRequest : httpRequest;
    const upstream = transport(origin + path, { headers: upstreamHeaders(request, ['cookie']) });
    // Once the event stream started, a failure can only end it; before that, the client gets a 503.
    const unavailable = () => {
      if (response.headersSent) response.end(); else sendError(response, 503, 'SERVICE_UNAVAILABLE');
      upstream.destroy();
    };
    response.once('close', () => { upstream.destroy(); resolve(); });
    upstream.setTimeout(IDLE_MS, unavailable);
    upstream.on('error', unavailable);
    upstream.once('response', result => {
      const status = result.statusCode ?? 503;
      const type = result.headers['content-type'] ?? '';
      const events = path === aiQuotaEventsPath && status === 200;
      if (response.destroyed || (status !== 200 && status < 400) || result.headers['content-encoding']
        || !(events ? /^text\/event-stream(?:;|$)/i : /^application\/json(?:;|$)/i).test(type)) {
        unavailable();
        return;
      }
      if (events) {
        response.setHeader('Cache-Control', 'no-store, no-transform');
        response.setHeader('X-Accel-Buffering', 'no');
      }
      for (const [name, value] of Object.entries(relayHeaders(result, 'session-clear'))) response.setHeader(name, value);
      response.writeHead(status, { 'Content-Type': type });
      result.once('error', unavailable);
      result.pipe(response);
    });
    upstream.end();
  });
}
