import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import { authenticateSession, readSessionCookie, IdentityHttpError, publicIdentityError, type IdentityRuntime } from '../identity/index.ts';
import { clearSessionCookie, type IdentityConfiguration } from '../identity-security/index.ts';
import { studyFail, studyObject } from '../../../../src/core/domain/study-folders.ts';
import type { StudyAuthentication } from './types.ts';
import type { StudyService } from './service.ts';
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
async function body(request: IncomingMessage) { let bytes = 0; const chunks: Buffer[] = []; for await (const chunk of request) {
    const b = Buffer.from(chunk);
    bytes += b.length;
    if (bytes > 512 * 1024)
        studyFail('PAYLOAD_TOO_LARGE');
    chunks.push(b);
} if (!(request.headers['content-type'] ?? '').toLowerCase().startsWith('application/json'))
    studyFail('INVALID_INPUT'); try {
    return studyObject(JSON.parse(Buffer.concat(chunks).toString('utf8')));
}
catch {
    studyFail('INVALID_INPUT');
} }
const statuses: Record<string, number> = { AUTH_REQUIRED: 401, EMAIL_VERIFICATION_REQUIRED: 403, FORBIDDEN: 403, CSRF_INVALID: 403, ORIGIN_NOT_ALLOWED: 403, RATE_LIMITED: 429, INVALID_INPUT: 400, AI_INPUT_LIMIT:400, PAYLOAD_TOO_LARGE: 413, CONFLICT: 409, FILE_NOT_READY: 409, QUOTA_EXCEEDED: 409, EMPTY_ANSWERS: 409, SOURCE_UNAVAILABLE: 409, AI_UNAVAILABLE: 503, SERVICE_UNAVAILABLE: 503 };
function json(res: ServerResponse, status: number, value: unknown) { if (res.destroyed || res.writableEnded)
    return; res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(value)); }
export function createStudyHandler(service: StudyService, admit: (r: IncomingMessage, w: boolean, res: ServerResponse) => Promise<void>) { let active = 0; return (request: IncomingMessage, response: ServerResponse, next: () => void) => { let url: URL; try {
    url = new URL(request.url ?? '/', 'http://study.invalid');
}
catch {
    json(response, 400, { error: { code: 'INVALID_INPUT' } });
    return;
} const path = url.pathname.replace(/^\/api\/v1/u, ''), match = /^\/study-folders(?:\/([^/]+)(?:\/(commands))?)?\/?$/u.exec(path); if (!match) {
    next();
    return;
} response.setHeader('Cache-Control', 'no-store'); response.setHeader('X-Content-Type-Options', 'nosniff'); if (active >= 16) {
    json(response, 503, { error: { code: 'SERVICE_UNAVAILABLE' } });
    return;
} active++; const write = request.method !== 'GET'; void (async () => { await admit(request, write, response); let result: unknown; if (!match[1] && request.method === 'GET')
    result = await service.list(request);
else if (!match[1] && request.method === 'POST')
    result = await service.create(request, await body(request));
else if (match[1] && !match[2] && request.method === 'GET')
    result = await service.get(request, match[1]);
else if (match[1] && !match[2] && request.method === 'PATCH')
    result = await service.patch(request, match[1], await body(request));
else if (match[1] && match[2] && request.method === 'POST')
    result = await service.command(request, match[1], await body(request));
else
    studyFail('INVALID_INPUT'); json(response, 200, result); })().catch(error => { const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'SERVICE_UNAVAILABLE'; const safe = Object.hasOwn(statuses, code) ? code : 'SERVICE_UNAVAILABLE'; json(response, statuses[safe]!, { error: { code: safe } }); }).finally(() => { active--; }); }; }
export function installStudyTransport(app: Pick<INestApplication, 'use'>, runtime: IdentityRuntime, service: StudyService) { const handler = createStudyHandler(service, async (r, w, res) => { const cookie = readSessionCookie(r.headers.cookie), context = cookie.verifier ? await runtime.store.authenticate(cookie.verifier) : null; if (cookie.present && !context)
    res.setHeader('Set-Cookie', clearSessionCookie(runtime.configuration.security)); const ip = r.socket.remoteAddress; if (!ip)
    throw new IdentityHttpError('SERVICE_UNAVAILABLE'); await runtime.generalAdmission(ip, context); if (!context)
    throw new IdentityHttpError('AUTH_REQUIRED'); if (!context.user.email_verified_at)
    throw new IdentityHttpError('EMAIL_VERIFICATION_REQUIRED'); if (context.user.account_role !== 'student')
    studyFail('FORBIDDEN'); guard(runtime.configuration.security, r, context.verifier, w); }); app.use('/api/v1', (request: IncomingMessage, response: ServerResponse, next: () => void) => { if (!request.url?.startsWith('/study-folders')) {
    next();
    return;
} response.setHeader('X-Request-Id', randomUUID()); handler(request, response, next); }); }

