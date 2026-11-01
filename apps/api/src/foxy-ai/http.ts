import type { IncomingMessage, ServerResponse } from 'node:http';
import { foxyRoute, type FoxyHttpServices } from './http-routes.ts';

const statuses: Record<string, number> = { AUTH_REQUIRED: 401, EMAIL_VERIFICATION_REQUIRED: 403, FORBIDDEN: 403,
  CSRF_INVALID: 403, ORIGIN_NOT_ALLOWED: 403, RATE_LIMITED: 429, INVALID_INPUT: 400, PAYLOAD_TOO_LARGE: 413, RESPONSE_TOO_LARGE: 413,
  NOT_FOUND: 404, EMPTY_CONTENT: 400, CONFLICT: 409, QUOTA_EXCEEDED: 409, AI_BUDGET_EXCEEDED: 429, FILE_NOT_READY: 409, AI_INPUT_LIMIT: 400, AI_UNAVAILABLE: 503, SERVICE_UNAVAILABLE: 503 };
function json(response: ServerResponse, status: number, body?: unknown): void {
  if (response.writableEnded || response.destroyed) return;
  response.statusCode = status;
  if (status === 204) { response.end(); return; }
  response.setHeader('Content-Type', 'application/json; charset=utf-8'); response.end(JSON.stringify(body));
}
function reject(response: ServerResponse, error: unknown): void {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  const safe = Object.hasOwn(statuses, code) ? code : 'SERVICE_UNAVAILABLE';
  json(response, statuses[safe]!, { error: { code: safe } });
}
export function createFoxyHandler(services: FoxyHttpServices, options: {
  admit(request: IncomingMessage, write: boolean, response: ServerResponse): Promise<void>;
}) {
  if (typeof options?.admit !== 'function') throw Object.assign(new Error('SERVICE_UNAVAILABLE'), { code: 'SERVICE_UNAVAILABLE' });
  let active = 0;
  return (request: IncomingMessage, response: ServerResponse, next: () => void): void => {
    let url: URL;
    try { url = new URL(request.url ?? '/', 'http://foxy.invalid'); }
    catch { response.setHeader('Cache-Control', 'no-store'); response.setHeader('X-Content-Type-Options', 'nosniff');
      reject(response, { code: 'INVALID_INPUT' }); return; }
    const base = '/api/v1/foxy-ai';
    if (url.pathname !== base && !url.pathname.startsWith(`${base}/`)) { next(); return; }
    response.setHeader('Cache-Control', 'no-store'); response.setHeader('X-Content-Type-Options', 'nosniff');
    if (active >= 16) { reject(response, { code: 'SERVICE_UNAVAILABLE' }); return; }
    active++;
    const controller = new AbortController();
    const close = () => { if (!response.writableFinished) controller.abort(); };
    const timer = setTimeout(() => { controller.abort(); if (response.headersSent) response.destroy(); else reject(response, { code: 'SERVICE_UNAVAILABLE' }); }, 30000);
    response.once('close',close); request.once('aborted',close);
    void (async () => { await options.admit(request, request.method !== 'GET', response);
      if (controller.signal.aborted || response.destroyed || response.writableEnded) return;
      const result = await foxyRoute(services, request, url, controller.signal);
      if (controller.signal.aborted) return;
      if (result.binary) {
        if (response.writableEnded || response.destroyed) return;
        response.statusCode = result.status;
        const requestedType = result.headers?.['Content-Type'];
        const contentType = requestedType && ['application/pdf','image/png','image/jpeg'].includes(requestedType) ? requestedType : 'application/octet-stream';
        const disposition = contentType !== 'application/octet-stream' && /^inline(?:;|$)/iu.test(result.headers?.['Content-Disposition'] ?? '') ? 'inline' : 'attachment';
        response.setHeader('Content-Type', contentType); response.setHeader('Content-Length', String(result.binary.byteLength));
        response.setHeader('Content-Disposition', disposition); response.setHeader('Content-Security-Policy', "sandbox; default-src 'none'");
        response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
        response.setHeader('Cache-Control', 'no-store'); response.setHeader('X-Content-Type-Options', 'nosniff');
        await new Promise<void>(resolve => {
          const finish = () => { response.off('finish',finish); response.off('close',finish); resolve(); };
          response.once('finish',finish); response.once('close',finish); response.end(result.binary);
        }); return;
      }
      json(response, result.status, result.body);
    })().catch(error => reject(response, error)).finally(() => { clearTimeout(timer); response.off('close',close); request.off('aborted',close); active--; });
  };
}
