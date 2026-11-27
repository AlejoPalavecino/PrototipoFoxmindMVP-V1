import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import { type IdentityRuntime } from './identity-runtime.ts';
import { type IdentityConfiguration } from '../modules/identity/accounts/infrastructure/security/configuration.ts';
import type { SqlTransaction } from '../../../../src/core/contracts/sql.ts';
import type { FoxyHttpServices } from '../modules/foxy/presentation/http-routes.ts';
import { createFoxyHandler } from '../modules/foxy/presentation/http.ts';
import { admitRequest, authenticateInTransaction } from './http-admission.ts';

export function createFoxyAuthentication(security: IdentityConfiguration) {
  return (tx: SqlTransaction, input: unknown, write: boolean): Promise<string> =>
    authenticateInTransaction(security, tx, input, write, { role: 'teacher' });
}
export function installFoxyTransport(app: Pick<INestApplication, 'use'>, runtime: IdentityRuntime, services: FoxyHttpServices): void {
  const handler = createFoxyHandler(services, { admit: async (request: IncomingMessage, write: boolean, response: ServerResponse) => {
    await admitRequest(runtime, request, response, { write, role: 'teacher' });
  } });
  app.use((request: IncomingMessage, response: ServerResponse, next: () => void) => {
    const path = request.url?.split('?')[0], base = '/api/v1/foxy-ai';
    if (path === base || path?.startsWith(`${base}/`)) response.setHeader('X-Request-Id', randomUUID());
    handler(request, response, next);
  });
}
