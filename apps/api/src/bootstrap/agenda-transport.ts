import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import { type IdentityRuntime } from './identity-runtime.ts';
import { type IdentityConfiguration } from '../modules/identity/accounts/infrastructure/security/configuration.ts';
import type { AgendaAuthentication } from '../modules/agenda/public.ts';
import type { AgendaService } from '../modules/agenda/public.ts';
import { createAgendaHandler } from '../modules/agenda/events/presentation/http.ts';
import { admitRequest, authenticateInTransaction } from './http-admission.ts';

export function createAgendaAuthentication(security: IdentityConfiguration): AgendaAuthentication {
  return (tx, input, write) => authenticateInTransaction(security, tx, input, write);
}
export function installAgendaTransport(app: Pick<INestApplication, 'use'>, runtime: IdentityRuntime, service: AgendaService): void {
  const handler = createAgendaHandler(service, { admit: async (request: IncomingMessage, write: boolean, response: ServerResponse) => {
    await admitRequest(runtime, request, response, { write });
  } });
  app.use('/api/v1', (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    const path = request.url?.split('?')[0];
    if (path !== '/agenda' && !path?.startsWith('/agenda/')) { next(); return; }
    response.setHeader('X-Request-Id', randomUUID());
    handler(request, response, next);
  });
}
