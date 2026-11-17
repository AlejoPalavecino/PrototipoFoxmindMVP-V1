import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import { authenticateSession } from '../modules/identity/accounts/infrastructure/session-query.ts';
import { readSessionCookie } from '../modules/identity/accounts/presentation/transport.ts';
import { IdentityHttpError, publicIdentityError } from '../modules/identity/domain/errors.ts';
import { type IdentityRuntime } from './identity-runtime.ts';
import { clearSessionCookie } from '../modules/identity/accounts/presentation/session-cookies.ts';
import { type IdentityConfiguration } from '../modules/identity/accounts/infrastructure/security/configuration.ts';
import type { SqlTransaction } from '../../../../src/core/contracts/sql.ts';
import type { FoxyHttpServices } from '../modules/foxy/presentation/http-routes.ts';
import { createFoxyHandler } from '../modules/foxy/presentation/http.ts';

function forbid(): never { throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' }); }
function writeGuard(security: IdentityConfiguration, request: IncomingMessage, verifier: string, write: boolean): void {
  if (!write) return;
  try { security.assertOrigin(request.headers.origin); } catch (error) { throw publicIdentityError(error); }
  if (!security.validateCsrf(verifier, request.headers['x-csrf-token'])) throw new IdentityHttpError('CSRF_INVALID');
}
export function createFoxyAuthentication(security: IdentityConfiguration) {
  return async (tx: SqlTransaction, input: unknown, write: boolean): Promise<string> => {
    const request = input as IncomingMessage, cookie = readSessionCookie(request.headers.cookie);
    const context = cookie.verifier ? await authenticateSession(tx, cookie.verifier) : null;
    if (!context) throw new IdentityHttpError('AUTH_REQUIRED');
    if (!context.user.email_verified_at) throw new IdentityHttpError('EMAIL_VERIFICATION_REQUIRED');
    if (context.user.account_role !== 'teacher') return forbid();
    writeGuard(security, request, context.verifier, write); return context.user.id;
  };
}
function admission(runtime: IdentityRuntime) {
  return async (request: IncomingMessage, write: boolean, response: ServerResponse): Promise<void> => {
    const security = runtime.configuration.security, cookie = readSessionCookie(request.headers.cookie);
    const context = cookie.verifier ? await runtime.store.authenticate(cookie.verifier) : null;
    if (cookie.present && !context) response.setHeader('Set-Cookie', clearSessionCookie(security));
    const ip = request.socket.remoteAddress;
    if (!ip) throw new IdentityHttpError('SERVICE_UNAVAILABLE');
    await runtime.generalAdmission(ip, context);
    if (!context) throw new IdentityHttpError('AUTH_REQUIRED');
    if (!context.user.email_verified_at) throw new IdentityHttpError('EMAIL_VERIFICATION_REQUIRED');
    if (context.user.account_role !== 'teacher') return forbid();
    writeGuard(security, request, context.verifier, write);
  };
}
export function installFoxyTransport(app: Pick<INestApplication, 'use'>, runtime: IdentityRuntime, services: FoxyHttpServices): void {
  const handler = createFoxyHandler(services, { admit: admission(runtime) });
  app.use((request: IncomingMessage, response: ServerResponse, next: () => void) => {
    const path = request.url?.split('?')[0], base = '/api/v1/foxy-ai';
    if (path === base || path?.startsWith(`${base}/`)) response.setHeader('X-Request-Id', randomUUID());
    handler(request, response, next);
  });
}
