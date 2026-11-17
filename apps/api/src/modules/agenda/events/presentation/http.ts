import type { IncomingMessage, ServerResponse } from 'node:http';
import { AgendaError } from '../../../../../../../src/core/domain/agenda/index.ts';
import type { AgendaService } from '../application/agenda-service.ts';
import { agendaRoute } from './http-routes.ts';

const statuses = { INVALID_INPUT: 400, FORBIDDEN: 403, CONFLICT: 409, SERVICE_UNAVAILABLE: 503 };
const identityStatuses: Record<string, number> = { AUTH_REQUIRED: 401, EMAIL_VERIFICATION_REQUIRED: 403,
  CSRF_INVALID: 403, ORIGIN_NOT_ALLOWED: 403, RATE_LIMITED: 429 };
function json(response: ServerResponse, status: number, body: unknown): void {
  if (response.writableEnded || response.destroyed) return;
  response.statusCode = status;
  if (status === 204) { response.end(); return; }
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body));
}
function reject(response: ServerResponse, error: unknown): void {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (Object.hasOwn(identityStatuses, code)) {
    json(response, identityStatuses[code], { error: { code } });
    return;
  }
  const safe = Object.hasOwn(statuses, code) ? code as keyof typeof statuses : 'SERVICE_UNAVAILABLE';
  json(response, statuses[safe], { error: { code: safe,
    ...(error instanceof AgendaError && error.details ? { details: error.details } : {}) } });
}
export function createAgendaHandler(service: AgendaService, options: {
  admit(request: IncomingMessage, write: boolean, response: ServerResponse): Promise<void>;
}) {
  if (typeof options?.admit !== 'function') throw new AgendaError('SERVICE_UNAVAILABLE');
  let active = 0;
  return (request: IncomingMessage, response: ServerResponse, next: () => void): void => {
    const url = new URL(request.url ?? '/', 'http://agenda.invalid');
    if (url.pathname !== '/agenda' && !url.pathname.startsWith('/agenda/')) { next(); return; }
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (active >= 16) { reject(response, new AgendaError('SERVICE_UNAVAILABLE')); return; }
    active++;
    void (async () => {
      await options.admit(request, request.method !== 'GET', response);
      const result = await agendaRoute(service, request, url);
      json(response, result.status, result.body);
    })().catch(error => reject(response, error)).finally(() => { active--; });
  };
}
