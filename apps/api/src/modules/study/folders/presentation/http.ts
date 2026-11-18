import type { IncomingMessage, ServerResponse } from 'node:http';
import { studyFail, studyObject } from '../../../../../../../src/core/domain/study/folders.ts';
import type { StudyService } from '../application/service.ts';
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
const statuses: Record<string, number> = { AUTH_REQUIRED: 401, EMAIL_VERIFICATION_REQUIRED: 403, FORBIDDEN: 403, CSRF_INVALID: 403, ORIGIN_NOT_ALLOWED: 403, RATE_LIMITED: 429, INVALID_INPUT: 400, AI_INPUT_LIMIT:400, PAYLOAD_TOO_LARGE: 413, CONFLICT: 409, FILE_NOT_READY: 409, QUOTA_EXCEEDED: 409, EMPTY_ANSWERS: 409, SOURCE_UNAVAILABLE: 409, PREVIEW_UNAVAILABLE: 422, AI_BUSY: 503, AI_TIMEOUT: 504, AI_RATE_LIMITED: 429, AI_BUDGET_EXCEEDED: 429, AI_UNAVAILABLE: 503, SERVICE_UNAVAILABLE: 503 };
function json(res: ServerResponse, status: number, value: unknown) { if (res.destroyed || res.writableEnded)
    return; res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(value)); }
export function createStudyHandler(service: StudyService, admit: (r: IncomingMessage, w: boolean, res: ServerResponse) => Promise<void>) { let active = 0; return (request: IncomingMessage, response: ServerResponse, next: () => void) => { let url: URL; try {
    url = new URL(request.url ?? '/', 'http://study.invalid');
}
catch {
    json(response, 400, { error: { code: 'INVALID_INPUT' } });
    return;
} const path = url.pathname.replace(/^\/api\/v1/u, ''), match = /^\/study-folders(?:\/([^/]+)(?:\/(commands)|\/docx-preview\/([^/]+))?)?\/?$/u.exec(path); if (!match) {
    next();
    return;
} response.setHeader('Cache-Control', 'no-store'); response.setHeader('X-Content-Type-Options', 'nosniff'); if (active >= 16) {
    json(response, 503, { error: { code: 'SERVICE_UNAVAILABLE' } });
    return;
} active++; const write = request.method !== 'GET'; void (async () => { await admit(request, write, response); let result: unknown; if (!match[1] && request.method === 'GET')
    result = await service.list(request);
else if (!match[1] && request.method === 'POST')
    result = await service.create(request, await body(request));
else if (match[1] && match[3] && request.method === 'GET' && !url.search)
    result = await service.previewDocx(request, match[1], match[3]);
else if (match[1] && !match[2] && !match[3] && request.method === 'GET')
    result = await service.get(request, match[1]);
else if (match[1] && !match[2] && !match[3] && request.method === 'PATCH')
    result = await service.patch(request, match[1], await body(request));
else if (match[1] && match[2] && request.method === 'POST')
    result = await service.command(request, match[1], await body(request));
else
    studyFail('INVALID_INPUT'); json(response, 200, result); })().catch(error => { const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'SERVICE_UNAVAILABLE'; const safe = Object.hasOwn(statuses, code) ? code : 'SERVICE_UNAVAILABLE'; json(response, statuses[safe]!, { error: { code: safe } }); }).finally(() => { active--; }); }; }
