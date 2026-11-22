import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import { clearSessionCookie } from '../modules/identity/accounts/presentation/session-cookies.ts';
import { type IdentityConfiguration } from '../modules/identity/accounts/infrastructure/security/configuration.ts';
import { IdentityHttpError, publicIdentityError } from '../modules/identity/domain/errors.ts';
import type { IdentityRuntime } from './identity-runtime.ts';
import { readSessionCookie } from '../modules/identity/accounts/presentation/transport.ts';
import { authenticateSession } from '../modules/identity/accounts/infrastructure/session-query.ts';
import type { ClassroomPorts } from '../modules/classrooms/access/application/runtime-ports.ts';
import type { ClassroomsHttpOperations, AcademicHttpServices } from './academic-http.ts';
import type { InvitationDeliveryWorker } from '../modules/classrooms/invitations/infrastructure/delivery.ts';
import { ClassroomIdentityError } from '../modules/classrooms/access/infrastructure/errors.ts';
import { createClassroomsHandler } from './academic-http.ts';
import type { ActivityAiService } from '../modules/activities/generation/infrastructure/activity-ai/service.ts';
import type { ClassroomAiService } from '../modules/curriculum/generation/infrastructure/ai/service.ts';

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
  runtime: IdentityRuntime, service: AcademicHttpServices | ClassroomsHttpOperations, options: { ai?: ClassroomAiService; activityAi?: ActivityAiService } = {}): void {
  const classrooms = createClassroomsHandler(service, {
    ai: options.ai, activityAi: options.activityAi,
    async admit(request, write, response) {
      try {
        const security = runtime.configuration.security;
        const cookie = readSessionCookie(request.headers.cookie);
        const context = cookie.verifier ? await runtime.store.authenticate(cookie.verifier) : null;
        if (cookie.present && !context) response.setHeader('Set-Cookie', clearSessionCookie(security));
        const ip = runtime.configuration.security.clientAddress(request);
        if (!ip) throw new IdentityHttpError('SERVICE_UNAVAILABLE');
        const pathname = new URL(request.url ?? '/', 'http://classrooms.invalid').pathname;
        const [, , , collection, resource] = pathname.split('/');
        if (collection === 'invitations' && resource === 'batch' &&
          context?.user.account_role === 'teacher' && context.user.email_verified_at) {
          try { writeGuard(security, request, context.verifier, write); }
          catch (error) {
            await runtime.generalAdmission(ip, context);
            throw error;
          }
          // A classroom-sized batch behind Next shares its socket peer with unrelated app traffic.
          await runtime.store.admit(security, [
            { action: 'general-identity', namespace: 'identifier', subject: `classroom-invitation-batch:account:${context.user.id}`,
              budget: { limit: 120, windowSeconds: 60 } },
            { action: 'general-identity', namespace: 'identifier', subject: `classroom-invitation-batch:peer:${ip}`,
              budget: { limit: 2000, windowSeconds: 60 } },
          ]);
          return;
        }
        await runtime.generalAdmission(ip, context);
        if (!context) throw new IdentityHttpError('AUTH_REQUIRED');
        if (!context.user.email_verified_at) throw new IdentityHttpError('EMAIL_VERIFICATION_REQUIRED');
        writeGuard(security, request, context.verifier, write);
        if (request.method === 'POST' && pathname === '/classrooms/codes/preview' && context.user.account_role === 'student') {
          // Reuse committed identity admission so unsuccessful guesses still count across processes.
          // The socket peer may be a shared web proxy. Client-supplied forwarding headers carry no authority.
          await runtime.store.admit(security, [
            { action: 'general-identity', namespace: 'identifier', subject: `classroom-code:account-minute:${context.user.id}`,
              budget: { limit: 10, windowSeconds: 60 } },
            { action: 'general-identity', namespace: 'identifier', subject: `classroom-code:account-hour:${context.user.id}`,
              budget: { limit: 30, windowSeconds: 3600 } },
            { action: 'general-identity', namespace: 'identifier', subject: `classroom-code:peer:${ip}`,
              budget: { limit: 2000, windowSeconds: 60 } },
          ]);
        }
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
