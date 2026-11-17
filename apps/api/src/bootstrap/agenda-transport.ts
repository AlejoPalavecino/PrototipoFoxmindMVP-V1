import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import { authenticateSession } from '../modules/identity/accounts/infrastructure/session-query.ts';
import { readSessionCookie } from '../modules/identity/accounts/presentation/transport.ts';
import { IdentityHttpError, publicIdentityError } from '../modules/identity/domain/errors.ts';
import { type IdentityRuntime } from './identity-runtime.ts';
import { clearSessionCookie } from '../modules/identity/accounts/presentation/session-cookies.ts';
import { type IdentityConfiguration } from '../modules/identity/accounts/infrastructure/security/configuration.ts';
import type { AgendaAuthentication } from '../modules/agenda/public.ts';
import type { AgendaService } from '../modules/agenda/public.ts';
import { createAgendaHandler } from '../modules/agenda/events/presentation/http.ts';

function writeGuard(security: IdentityConfiguration, request: IncomingMessage, verifier: string, write: boolean): void {
  if (!write && request.method !== 'POST') return;
  try { security.assertOrigin(request.headers.origin); }
  catch (error) { throw publicIdentityError(error); }
  if (!security.validateCsrf(verifier, request.headers['x-csrf-token'])) throw new IdentityHttpError('CSRF_INVALID');
}
export function createAgendaAuthentication(security: IdentityConfiguration): AgendaAuthentication {
  return async (tx, input, write) => {
    const request = input as IncomingMessage;
    const cookie = readSessionCookie(request.headers.cookie);
    const context = cookie.verifier ? await authenticateSession(tx, cookie.verifier) : null;
    if (!context) throw new IdentityHttpError('AUTH_REQUIRED');
    if (!context.user.email_verified_at) throw new IdentityHttpError('EMAIL_VERIFICATION_REQUIRED');
    writeGuard(security, request, context.verifier, write);
    return context.user.id;
  };
}
function admission(runtime: IdentityRuntime) {
  return async (request: IncomingMessage, write: boolean, response: ServerResponse) => {
    const security = runtime.configuration.security;
    const cookie = readSessionCookie(request.headers.cookie);
    const context = cookie.verifier ? await runtime.store.authenticate(cookie.verifier) : null;
    if (cookie.present && !context) response.setHeader('Set-Cookie', clearSessionCookie(security));
    const ip = request.socket.remoteAddress;
    if (!ip) throw new IdentityHttpError('SERVICE_UNAVAILABLE');
    await runtime.generalAdmission(ip, context);
    if (!context) throw new IdentityHttpError('AUTH_REQUIRED');
    if (!context.user.email_verified_at) throw new IdentityHttpError('EMAIL_VERIFICATION_REQUIRED');
    writeGuard(security, request, context.verifier, write);
  };
}
export function installAgendaTransport(app: Pick<INestApplication, 'use'>, runtime: IdentityRuntime, service: AgendaService): void {
  const handler = createAgendaHandler(service, { admit: admission(runtime) });
  app.use('/api/v1', (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    const path = request.url?.split('?')[0];
    if (path !== '/agenda' && !path?.startsWith('/agenda/')) { next(); return; }
    response.setHeader('X-Request-Id', randomUUID());
    handler(request, response, next);
  });
}
