import type { IncomingMessage, ServerResponse } from 'node:http';
import { HomeError } from '../../../../src/core/domain/index.ts';
import type { HomeService } from './service.ts';
const statuses: Record<string, number> = { INVALID_INPUT:400, FORBIDDEN:403, SERVICE_UNAVAILABLE:503,
  AUTH_REQUIRED:401, EMAIL_VERIFICATION_REQUIRED:403, CSRF_INVALID:403, ORIGIN_NOT_ALLOWED:403, RATE_LIMITED:429 };
function send(response: ServerResponse, status: number, body: unknown): void {
  if (response.writableEnded || response.destroyed) return;
  response.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff' });
  response.end(JSON.stringify(body));
}
export function createHomeHandler(service: HomeService, options: {
  admit(request: IncomingMessage, write: boolean, response: ServerResponse): Promise<void>;
}) {
  if (typeof options?.admit !== 'function') throw new HomeError('SERVICE_UNAVAILABLE');
  let active = 0;
  return (request: IncomingMessage, response: ServerResponse, next: () => void): void => {
    const url = new URL(request.url ?? '/', 'http://home.invalid');
    if (url.pathname !== '/home' && !url.pathname.startsWith('/home/')) { next(); return; }
    response.setHeader('Cache-Control','no-store');
    const match = /^\/home\/modules\/(pending|review|feedback|agenda|queries|materials|classrooms)$/.exec(url.pathname);
    if (url.pathname !== '/home' && !match) { send(response,404,{error:{code:'NOT_FOUND'}}); return; }
    if (request.method !== 'GET') { response.setHeader('Allow','GET'); send(response,405,{error:{code:'METHOD_NOT_ALLOWED'}}); return; }
    if (active >= 16) { send(response,503,{error:{code:'SERVICE_UNAVAILABLE'}}); return; }
    active++;
    void (async () => {
      await options.admit(request,false,response);
      if (request.headers['transfer-encoding'] || Number(request.headers['content-length'] ?? 0) || request.headers['content-encoding']) throw new HomeError('INVALID_INPUT');
      const query = Object.fromEntries(url.searchParams);
      if ([...url.searchParams.keys()].length !== Object.keys(query).length
        || Object.keys(query).some(key => !['timeZone', ...(match ? ['cursor'] : [])].includes(key))) throw new HomeError('INVALID_INPUT');
      const result = match ? await service.page(request,{...query,module:match[1],cursor:query.cursor ?? null}) : await service.read(request,query);
      send(response,200,result);
    })().catch(error => {
      const raw = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
      const code = Object.hasOwn(statuses,raw) ? raw : 'SERVICE_UNAVAILABLE'; send(response,statuses[code],{error:{code}});
    }).finally(() => { active--; });
  };
}
