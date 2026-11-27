import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import { type IdentityRuntime, type IdentitySecurityConfiguration as IdentityConfiguration } from '../modules/identity/public.ts';
import { studyFail } from '../../../../src/core/domain/study/folders.ts';
import type { StudyAuthentication } from '../modules/study/application/contracts.ts';
import { createStudyHandler } from '../modules/study/folders/presentation/http.ts';
import { admitRequest, authenticateInTransaction } from './http-admission.ts';

const forbidden = () => studyFail('FORBIDDEN');
export function createStudyAuthentication(security: IdentityConfiguration): StudyAuthentication {
  return (tx, input, write) => authenticateInTransaction(security, tx, input, write, { role: 'student', forbidden });
}
export function installStudyTransport(app: Pick<INestApplication, 'use'>, runtime: IdentityRuntime, service: Parameters<typeof createStudyHandler>[0]) {
  const handler = createStudyHandler(service, async (request: IncomingMessage, write: boolean, response: ServerResponse) => {
    await admitRequest(runtime, request, response, { write, role: 'student', forbidden });
  });
  app.use('/api/v1', (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    if (!request.url?.startsWith('/study-folders')) { next(); return; }
    response.setHeader('X-Request-Id', randomUUID()); handler(request, response, next);
  });
}
