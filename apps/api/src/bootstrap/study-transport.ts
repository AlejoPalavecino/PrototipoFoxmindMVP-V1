import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import { authenticateSession } from '../modules/identity/accounts/infrastructure/session-query.ts';
import { readSessionCookie } from '../modules/identity/accounts/presentation/transport.ts';
import { clearSessionCookie } from '../modules/identity/accounts/presentation/session-cookies.ts';
import { type IdentityRuntime, type IdentitySecurityConfiguration as IdentityConfiguration, IdentityHttpError, publicIdentityError } from '../modules/identity/public.ts';
import { studyFail } from '../../../../src/core/domain/study/folders.ts';
import type { StudyAuthentication } from '../modules/study/application/contracts.ts';
import type { StudyService } from '../modules/study/folders/application/service.ts';
import { createStudyHandler } from '../modules/study/folders/presentation/http.ts';
function guard(security: IdentityConfiguration, r: IncomingMessage, verifier: string, write: boolean) { if (!write)
    return; try {
    security.assertOrigin(r.headers.origin);
}
catch (e) {
    throw publicIdentityError(e);
} if (!security.validateCsrf(verifier, r.headers['x-csrf-token']))
    throw new IdentityHttpError('CSRF_INVALID'); }
export function createStudyAuthentication(security: IdentityConfiguration): StudyAuthentication { return async (tx, input, write) => { const r = input as IncomingMessage, cookie = readSessionCookie(r.headers.cookie), context = cookie.verifier ? await authenticateSession(tx, cookie.verifier) : null; if (!context)
    throw new IdentityHttpError('AUTH_REQUIRED'); if (!context.user.email_verified_at)
    throw new IdentityHttpError('EMAIL_VERIFICATION_REQUIRED'); if (context.user.account_role !== 'student')
    studyFail('FORBIDDEN'); guard(security, r, context.verifier, write); return context.user.id; }; }
export function installStudyTransport(app: Pick<INestApplication, 'use'>, runtime: IdentityRuntime, service: StudyService) { const handler = createStudyHandler(service, async (r, w, res) => { const cookie = readSessionCookie(r.headers.cookie), context = cookie.verifier ? await runtime.store.authenticate(cookie.verifier) : null; if (cookie.present && !context)
    res.setHeader('Set-Cookie', clearSessionCookie(runtime.configuration.security)); const ip = r.socket.remoteAddress; if (!ip)
    throw new IdentityHttpError('SERVICE_UNAVAILABLE'); await runtime.generalAdmission(ip, context); if (!context)
    throw new IdentityHttpError('AUTH_REQUIRED'); if (!context.user.email_verified_at)
    throw new IdentityHttpError('EMAIL_VERIFICATION_REQUIRED'); if (context.user.account_role !== 'student')
    studyFail('FORBIDDEN'); guard(runtime.configuration.security, r, context.verifier, w); }); app.use('/api/v1', (request: IncomingMessage, response: ServerResponse, next: () => void) => { if (!request.url?.startsWith('/study-folders')) {
    next();
    return;
} response.setHeader('X-Request-Id', randomUUID()); handler(request, response, next); }); }
