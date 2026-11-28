import type { IncomingMessage, ServerResponse } from 'node:http';
import { readAiMonthlyQuotaRejection } from '../../../../../../../src/core/contracts/ai-quota.ts';
import { studyFail, studyObject } from '../../../../../../../src/core/domain/study/folders.ts';
import type { StudyService } from '../application/service.ts';
import type { SharedStudyStrategyService } from '../../strategies/public.ts';
import { publicError, sendJson } from '../../../../platform/http/json-response.ts';
type StudyHttpService = StudyService & { sharedStrategy: SharedStudyStrategyService };
async function body(request: IncomingMessage, limit = 512 * 1024) { let bytes = 0; const chunks: Buffer[] = []; for await (const chunk of request) {
    const b = Buffer.from(chunk);
    bytes += b.length;
    if (bytes > limit)
        studyFail('PAYLOAD_TOO_LARGE');
    chunks.push(b);
} if (!(request.headers['content-type'] ?? '').toLowerCase().startsWith('application/json'))
    studyFail('INVALID_INPUT'); try {
    return studyObject(JSON.parse(Buffer.concat(chunks).toString('utf8')));
}
catch {
    studyFail('INVALID_INPUT');
} }
const statuses: Record<string, number> = { AUTH_REQUIRED: 401, EMAIL_VERIFICATION_REQUIRED: 403, FORBIDDEN: 403, CSRF_INVALID: 403, ORIGIN_NOT_ALLOWED: 403, RATE_LIMITED: 429, INVALID_INPUT: 400, AI_INPUT_LIMIT:400, PAYLOAD_TOO_LARGE: 413, CONFLICT: 409, FILE_NOT_READY: 409, QUOTA_EXCEEDED: 409, EMPTY_ANSWERS: 409, SOURCE_UNAVAILABLE: 409, PREVIEW_UNAVAILABLE: 422, AI_BUSY: 503, AI_TIMEOUT: 504, AI_RATE_LIMITED: 429, AI_MONTHLY_BUDGET_EXCEEDED: 429, AI_BUDGET_EXCEEDED: 429, AI_GLOBAL_DAILY_BUDGET_EXCEEDED: 429, AI_UNAVAILABLE: 503, SERVICE_UNAVAILABLE: 503 };
const json = (res: ServerResponse, status: number, value: unknown) => sendJson(res, status, value);
export function createStudyHandler(service: StudyHttpService, admit: (r: IncomingMessage, w: boolean, res: ServerResponse) => Promise<void>) { let active = 0; return (request: IncomingMessage, response: ServerResponse, next: () => void) => { let url: URL; try {
    url = new URL(request.url ?? '/', 'http://study.invalid');
}
catch {
    json(response, 400, { error: { code: 'INVALID_INPUT' } });
    return;
} const path = url.pathname.replace(/^\/api\/v1/u, ''), match = /^\/study-folders(?:\/([^/]+)(?:\/(commands)|\/docx-preview\/([^/]+)|\/images\/([^/]+)|\/chat-previews\/([^/]+))?)?\/?$/u.exec(path);
const strategyPath = /^\/study-folders\/([^/]+)\/shared-strategy(?:\/([^/]+))?$/u.exec(path);
if (!match && !strategyPath) {
    next();
    return;
} response.setHeader('Cache-Control', 'no-store'); response.setHeader('X-Content-Type-Options', 'nosniff'); if (active >= 16) {
    json(response, 503, { error: { code: 'SERVICE_UNAVAILABLE' } });
    return;
} active++; const write = request.method !== 'GET'; void (async () => { await admit(request, write, response); let result: unknown;
if (strategyPath) {
    const [, folderId, strategyId] = strategyPath;
    if (url.search || (request.method !== 'PUT' && (request.headers['transfer-encoding'] || Number(request.headers['content-length'] ?? '0') > 0)))
        studyFail('INVALID_INPUT');
    if (!strategyId && request.method === 'GET') result = await service.sharedStrategy.get(request, folderId);
    else if (!strategyId && request.method === 'PUT') result = await service.sharedStrategy.publish(request, folderId, await body(request, 16 * 1024));
    else if (strategyId && request.method === 'DELETE') result = await service.sharedStrategy.withdraw(request, folderId, strategyId);
    else studyFail('INVALID_INPUT');
    json(response, 200, result);
    return;
}
if (!match) return;
if (match[1] && match[4]) {
    const download = url.search === '?mode=download';
    if (write || url.search && !download) studyFail('INVALID_INPUT');
    const image = await service.image(request, match[1], match[4]);
    if (response.destroyed || response.writableEnded) return;
    response.setHeader('Content-Type', image.mimeType);
    response.setHeader('Content-Length', image.bytes.byteLength);
    if (download) response.setHeader('Content-Disposition', `attachment; filename="imagen.${image.mimeType === 'image/png' ? 'png' : 'jpg'}"`);
    response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    response.setHeader('Content-Security-Policy', "sandbox; default-src 'none'; frame-ancestors 'self'");
    response.end(image.bytes);
    return;
}
if (!match[1] && request.method === 'GET')
    result = await service.list(request);
else if (!match[1] && request.method === 'POST')
    result = await service.create(request, await body(request));
else if (match[1] && match[5] && request.method === 'GET' && !url.search)
    result = await service.chatPreview(request, match[1], match[5]);
else if (match[1] && match[3] && request.method === 'GET' && !url.search)
    result = await service.previewDocx(request, match[1], match[3]);
else if (match[1] && !match[2] && !match[3] && !match[5] && request.method === 'GET')
    result = await service.get(request, match[1]);
else if (match[1] && !match[2] && !match[3] && !match[5] && request.method === 'PATCH')
    result = await service.patch(request, match[1], await body(request));
else if (match[1] && match[2] && request.method === 'POST')
    result = await service.command(request, match[1], await body(request));
else
    studyFail('INVALID_INPUT'); json(response, 200, result); })().catch(error => {
    const { code: safe, status } = publicError(error, statuses);
    const quota = safe === 'AI_MONTHLY_BUDGET_EXCEEDED' ? readAiMonthlyQuotaRejection(error?.quota) : undefined;
    json(response, status, { error: { code: safe, ...(quota ? { quota } : {}) } });
}).finally(() => { active--; }); }; }
