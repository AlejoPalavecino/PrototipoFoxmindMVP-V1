import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import { admitRequest, assertWriteGuard } from './http-admission.ts';
import type { IdentitySecurityConfiguration as IdentityConfiguration } from '../modules/identity/public.ts';
import { IdentityHttpError, publicIdentityError } from '../modules/identity/domain/errors.ts';
import type { IdentityRuntime } from '../modules/identity/accounts/application/runtime.ts';
import { readSessionCookie } from '../modules/identity/accounts/presentation/transport.ts';
import { authenticateSession } from '../modules/identity/accounts/infrastructure/session-query.ts';
import type { AttemptWriteAuthorizer } from '../modules/files/custody/infrastructure/access.ts';
import { createFileAccess } from '../modules/files/custody/infrastructure/access.ts';
import { FileError } from '../modules/files/domain/errors.ts';
import { createFilesHandler } from '../modules/files/uploads/presentation/http.ts';
import { createTransferGate, TRANSFER_IDLE_MS, type TransferGate } from '../platform/http/transfer-gate.ts';
import type { FileService } from '../modules/files/custody/infrastructure/service.ts';
import type { FileCleanupWorker } from '../modules/files/custody/infrastructure/cleanup-worker.ts';
import { FileIdentityError } from '../modules/files/custody/infrastructure/store.ts';
import { sendJson } from '../platform/http/json-response.ts';

/** No admission or lifetime writes: every invocation uses exactly the caller-owned transaction. */
export function createIdentityFileAccess(security: IdentityConfiguration, authorizeAttemptWrite?: AttemptWriteAuthorizer) {
  return createFileAccess({
    async authenticate(tx, input) {
      const request = input as IncomingMessage;
      const cookie = readSessionCookie(request.headers.cookie);
      const context = cookie.verifier ? await authenticateSession(tx, cookie.verifier) : null;
      if (!context) throw new FileIdentityError(new IdentityHttpError('AUTH_REQUIRED'));
      // Email verification is enforced by the custody store under its own lock.
      try { assertWriteGuard(security, request, context.verifier, false); }
      catch (error) { throw new FileIdentityError(publicIdentityError(error)); }
      return context.user.id;
    },
    authorizeAttemptWrite: authorizeAttemptWrite ?? (async () => { throw new FileError('FORBIDDEN'); }),
  });
}

/** Express owns the mount prefix. The same IncomingMessage and unread binary stream enter the file handler. */
export function installFilesTransport(app: Pick<INestApplication, 'use'>, runtime: IdentityRuntime, service: FileService, transfers: TransferGate = createTransferGate()): void {
  // The account authenticated here owns the request's transfer slot.
  const owners = new WeakMap<IncomingMessage, string>();
  const files = createFilesHandler(service, { gate: transfers, owner: request => owners.get(request), idleMs: TRANSFER_IDLE_MS });
  app.use('/api/v1', (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    const path = request.url?.split('?')[0];
    if (path !== '/files' && !path?.startsWith('/files/')) { next(); return; }
    const requestId = randomUUID();
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Request-Id', requestId);
    void (async () => {
      const context = (await admitRequest(runtime, request, response))!;
      owners.set(request, context.user.id);
      files(request, response, next);
    })().catch(error => {
      const safe = publicIdentityError(error);
      if (safe.retryAfter) response.setHeader('Retry-After', String(safe.retryAfter));
      // Do not consume an unbounded rejected upload; end the sanitized response before closing its socket.
      if (!request.complete) { response.setHeader('Connection', 'close'); response.once('finish', () => request.destroy()); }
      sendJson(response, safe.status, { error: { code: safe.code, requestId } });
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
