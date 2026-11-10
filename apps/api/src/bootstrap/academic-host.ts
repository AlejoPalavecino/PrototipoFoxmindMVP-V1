import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import { clearSessionCookie } from '../modules/identity/presentation/session-cookies.ts';
import { type IdentityConfiguration } from '../modules/identity/infrastructure/security/configuration.ts';
import { IdentityHttpError, publicIdentityError } from '../modules/identity/domain/errors.ts';
import type { IdentityRuntime } from './identity-runtime.ts';
import { readSessionCookie } from '../modules/identity/presentation/transport.ts';
import { authenticateSession } from '../modules/identity/infrastructure/session-query.ts';
import type { ClassroomPorts } from '../modules/classrooms/infrastructure/contracts.ts';
import type { ClassroomsHttpOperations } from './academic-http.ts';
import type { InvitationDeliveryWorker } from '../modules/classrooms/infrastructure/delivery.ts';
import { ClassroomIdentityError } from '../modules/classrooms/infrastructure/errors.ts';
import { createClassroomsHandler } from './academic-http.ts';
import type { ActivityAiService } from '../modules/activities/infrastructure/activity-ai/service.ts';
import type { ClassroomAiService } from '../modules/curriculum/infrastructure/ai/service.ts';

function writeGuard(security: IdentityConfiguration, request: IncomingMessage, verifier: string, write: boolean): void {
  if (!write && !['POST', 'PUT', 'PATCH'].includes(request.method ?? '')) return;
  try { security.assertOrigin(request.headers.origin); }
  catch (error) { throw publicIdentityError(error); }
  if (!security.validateCsrf(verifier, request.headers['x-csrf-token'])) throw new IdentityHttpError('CSRF_INVALID');
}

/** Repeatable under the domain's user lock: same P3 digest/clock/policy, no admission or lifetime writes. */
export function createIdentityClassroomAuthentication(security: IdentityConfiguration): ClassroomPorts['authenticate'] {
  return async (tx, input, write) => {
    const request = input as IncomingMessage;
    try {
      const cookie = readSessionCookie(request.headers.cookie);
      const context = cookie.verifier ? await authenticateSession(tx, cookie.verifier) : null;
      if (!context) throw new IdentityHttpError('AUTH_REQUIRED');
      if (!context.user.email_verified_at) throw new IdentityHttpError('EMAIL_VERIFICATION_REQUIRED');
      writeGuard(security, request, context.verifier, write);
      return context.user.id;
    } catch (error) {
      // SQL/programming errors are sanitized by ClassroomCore, not mislabeled authentication failures.
      if (error instanceof IdentityHttpError) throw new ClassroomIdentityError(error);
      throw error;
    }
  };
}

/** Installed before general body parsers. The handler calls this ingress admission exactly once. */
export function installClassroomsTransport(app: Pick<INestApplication, 'use'>,
  runtime: IdentityRuntime, service: ClassroomsHttpOperations, options: { ai?: ClassroomAiService; activityAi?: ActivityAiService } = {}): void {
  const classrooms = createClassroomsHandler(service, {
    ai: options.ai, activityAi: options.activityAi,
    async admit(request, write, response) {
      try {
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
      } catch (error) { throw new ClassroomIdentityError(publicIdentityError(error)); }
    },
  });
  app.use('/api/v1', (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    const path = request.url?.split('?')[0];
    if (path !== '/classrooms' && !path?.startsWith('/classrooms/')) { next(); return; }
    response.setHeader('X-Request-Id', randomUUID());
    classrooms(request, response, next);
  });
}

/** Root ownership drains delivery before imported Prisma teardown; repeated Nest cleanup is harmless. */
export class ClassroomHostLifecycle {
  private closing?: Promise<void>;
  constructor(private readonly worker: Pick<InvitationDeliveryWorker, 'onModuleDestroy'>,
    private readonly sender: { close(): void }) {}
  close(): Promise<void> { return this.closing ??= this.drain(); }
  private async drain(): Promise<void> {
    try { await this.worker.onModuleDestroy(); }
    finally { this.sender.close(); }
  }
  onModuleDestroy(): Promise<void> { return this.close(); }
}
