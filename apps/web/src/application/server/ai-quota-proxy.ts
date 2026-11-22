import { clientAddressHeaders } from './client-address.ts';
import { request as httpRequest, type IncomingMessage, type ServerResponse } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { aiQuotaEventsPath, aiQuotaPath } from '../../../../../src/core/contracts/ai-quota.ts';

function apiOrigin(value?: string) {
  if (!value) return null;
  try {
    const target = new URL(value);
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(target.hostname);
    return value === target.origin && (target.protocol === 'https:' || local && target.protocol === 'http:') ? target : null;
  } catch { return null; }
}

export async function proxyAiQuotaRequest(request: IncomingMessage, response: ServerResponse, configuredOrigin?: string) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  const reject = (status: number, code: string) => {
    if (response.destroyed || response.writableEnded) return;
    if (response.headersSent) { response.end(); return; }
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: { code } }));
  };
  const path = request.url?.split('?')[0];
  if (path !== aiQuotaPath && path !== aiQuotaEventsPath) return reject(404, 'NOT_FOUND');
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return reject(405, 'METHOD_NOT_ALLOWED');
  }
  if (request.url !== path || Number(request.headers['content-length']) || request.headers['transfer-encoding'])
    return reject(400, 'INVALID_INPUT');
  if (['cross-site', 'same-site'].includes(request.headers['sec-fetch-site'] ?? '')) return reject(403, 'ORIGIN_NOT_ALLOWED');
  const origin = apiOrigin(configuredOrigin);
  if (!origin) return reject(503, 'SERVICE_UNAVAILABLE');

  await new Promise<void>(resolve => {
    const transport = origin.protocol === 'https:' ? httpsRequest : httpRequest;
    const upstream = transport(new URL(path, origin), { headers: { cookie: request.headers.cookie ?? '', ...clientAddressHeaders(request) } });
    const unavailable = () => { reject(503, 'SERVICE_UNAVAILABLE'); upstream.destroy(); };
    response.once('close', () => { upstream.destroy(); resolve(); });
    upstream.setTimeout(22_000, unavailable);
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
      const clearing = (result.headers['set-cookie'] ?? []).filter(value =>
        /^foxmind_session=; Path=\/; HttpOnly; SameSite=Lax(?:; Secure)?; Max-Age=0$/u.test(value));
      if (clearing.length === 1) response.setHeader('Set-Cookie', clearing[0]);
      for (const key of ['retry-after', 'x-request-id']) {
        const value = result.headers[key];
        if (typeof value === 'string') response.setHeader(key, value);
      }
      response.writeHead(status, { 'Content-Type': type });
      result.once('error', unavailable);
      result.pipe(response);
    });
    upstream.end();
  });
}
