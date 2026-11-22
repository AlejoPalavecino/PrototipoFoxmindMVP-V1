import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import { clearSessionCookie } from '../modules/identity/accounts/presentation/session-cookies.ts';
import type { IdentitySecurityConfiguration as IdentityConfiguration } from '../modules/identity/public.ts';
import { IdentityHttpError, publicIdentityError } from '../modules/identity/domain/errors.ts';
import type { IdentityRuntime } from '../modules/identity/accounts/application/runtime.ts';
import { readSessionCookie } from '../modules/identity/accounts/presentation/transport.ts';
import { authenticateSession } from '../modules/identity/accounts/infrastructure/session-query.ts';
import type { AttemptWriteAuthorizer } from '../modules/files/custody/infrastructure/access.ts';
import { createFileAccess } from '../modules/files/custody/infrastructure/access.ts';
import { FileError } from '../modules/files/domain/errors.ts';
import { createFilesHandler } from '../modules/files/uploads/presentation/http.ts';
import type { FileService } from '../modules/files/custody/infrastructure/service.ts';
import type { FileCleanupWorker } from '../modules/files/custody/infrastructure/cleanup-worker.ts';
import { FileIdentityError } from '../modules/files/custody/infrastructure/store.ts';

function writeGuard(security: IdentityConfiguration, request: IncomingMessage, verifier: string): void {
  if (request.method !== 'POST' && request.method !== 'PUT') return;
  try { security.assertOrigin(request.headers.origin); }
  catch (error) { throw publicIdentityError(error); }
  if (!security.validateCsrf(verifier, request.headers['x-csrf-token'])) throw new IdentityHttpError('CSRF_INVALID');
}

/** No admission or lifetime writes: every invocation uses exactly the caller-owned transaction. */
export function createIdentityFileAccess(security: IdentityConfiguration, authorizeAttemptWrite?: AttemptWriteAuthorizer) {
  return createFileAccess({
    async authenticate(tx, input) {
      const request = input as IncomingMessage;
      const cookie = readSessionCookie(request.headers.cookie);
      const context = cookie.verifier ? await authenticateSession(tx, cookie.verifier) : null;
      if (!context) throw new FileIdentityError(new IdentityHttpError('AUTH_REQUIRED'));
      try { writeGuard(security, request, context.verifier); }
      catch (error) { throw new FileIdentityError(publicIdentityError(error)); }
      return context.user.id;
    },
    authorizeAttemptWrite: authorizeAttemptWrite ?? (async () => { throw new FileError('FORBIDDEN'); }),
  });
}

/** Express owns the mount prefix. The same IncomingMessage and unread binary stream enter the file handler. */
export function installFilesTransport(app: Pick<INestApplication, 'use'>, runtime: IdentityRuntime, service: FileService): void {
  const files = createFilesHandler(service);
  app.use('/api/v1', (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    const path = request.url?.split('?')[0];
    if (path !== '/files' && !path?.startsWith('/files/')) { next(); return; }
    const requestId = randomUUID();
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Request-Id', requestId);
    void (async () => {
      const security = runtime.configuration.security;
      const cookie = readSessionCookie(request.headers.cookie);
      const context = cookie.verifier ? await runtime.store.authenticate(cookie.verifier) : null;
      if (cookie.present && !context) response.setHeader('Set-Cookie', clearSessionCookie(security));
      const ip = runtime.configuration.security.clientAddress(request);
      if (!ip) throw new IdentityHttpError('SERVICE_UNAVAILABLE');
      await runtime.generalAdmission(ip, context);
      if (!context) throw new IdentityHttpError('AUTH_REQUIRED');
      writeGuard(security, request, context.verifier);
      files(request, response, next);
    })().catch(error => {
      const safe = publicIdentityError(error);
      if (safe.retryAfter) response.setHeader('Retry-After', String(safe.retryAfter));
      // Do not consume an unbounded rejected upload; end the sanitized response before closing its socket.
      if (!request.complete) { response.setHeader('Connection', 'close'); response.once('finish', () => request.destroy()); }
      response.statusCode = safe.status;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.end(JSON.stringify({ error: { code: safe.code, requestId } }));
    });
  });
}

/** Root ownership closes cleanup/storage before imported Prisma teardown; repeated framework calls are harmless. */
export class FileHostLifecycle {
  private closing: Promise<void> | undefined;
  constructor(private readonly worker: Pick<FileCleanupWorker, 'onModuleDestroy'>, private readonly infrastructure: { close(): void | Promise<void> }) {}
  close(): Promise<void> {
    this.closing ??= this.drain().catch(error => { this.closing = undefined; throw error; });
    return this.closing;
  }
  private async drain(): Promise<void> {
    try { await this.worker.onModuleDestroy(); }
    finally { await this.infrastructure.close(); }
  }
  onModuleDestroy(): Promise<void> { return this.close(); }
}
