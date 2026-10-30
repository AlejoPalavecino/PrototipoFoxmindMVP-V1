import { request as httpRequest, type IncomingMessage, type ServerResponse } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { generationSchema } from './activity-generation-proxy.ts';
import { parseStartExtraction, parseRetryExtraction, parseApplyExtraction, parseWallQuery, parseWallMutation, privateGradingInput, gradeCorrectionInput, gradePublicationInput, parseNotificationQuery } from '../../../../src/core/domain/index.ts';

const requestLimit = 512 * 1024;
const responseLimit = 2 * 1024 * 1024;
const uuid = '[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}';
type Rule = { path: RegExp; methods: Record<string, string[] | null> };
const rule = (path: string, methods: Rule['methods']): Rule => ({ path: new RegExp(`^/api/v1/classrooms${path}$`), methods });
const routes: Rule[] = [
  rule('', { GET: null }), rule('/drafts', { GET: null, POST: [] }),
  rule(`/drafts/${uuid}`, { GET: null, PATCH: ['revision', 'payload'] }),
  rule(`/drafts/${uuid}/publish`, { POST: ['revision'] }),
  rule(`/drafts/${uuid}/curriculum-extractions`, { POST: ['revision', 'planFileId'] }),
  rule(`/drafts/${uuid}/curriculum-extractions/${uuid}`, { GET: null }),
  rule(`/drafts/${uuid}/curriculum-extractions/${uuid}/retry`, { POST: ['revision', 'requestId'] }),
  rule(`/drafts/${uuid}/curriculum-extractions/${uuid}/apply`, { POST: ['revision', 'requestId', 'units'] }),
  rule('/codes/preview', { POST: ['code'] }), rule('/codes/confirm', { POST: ['confirmation'] }),
  rule('/invitations', { GET: null }), rule(`/invitations/${uuid}/accept`, { POST: [] }),
  rule(`/${uuid}`, { GET: null }),
  rule(`/${uuid}/progress`, { GET: null }),
  rule(`/${uuid}/members/${uuid}/(?:progress|ai-summary)`, { GET: null }),
  rule(`/${uuid}/plan`, { POST: ['revision', 'operation'] }),
  rule(`/${uuid}/library`, { GET: null, POST: ['revision', 'operation'] }),
  rule(`/${uuid}/wall`, { GET: null, POST: ['revision', 'operation'] }),
  rule(`/${uuid}/wall/${uuid}`, { GET: null }),
  rule(`/${uuid}/wall/${uuid}/replies`, { GET: null }),
  rule(`/${uuid}/activity-generations`, { GET: null, POST: [] }),
  rule(`/${uuid}/activity-generations/sources`, { GET: null }),
  rule(`/${uuid}/activity-generations/${uuid}`, { GET: null }),
  rule(`/${uuid}/activity-generations/${uuid}/(?:apply|regenerate)`, { POST: [] }),
  rule(`/${uuid}/activities`, { GET: null, POST: ['revision', 'operation'] }),
  rule(`/${uuid}/activities/deadline`, { POST: ['local'] }),
  rule(`/${uuid}/activities/${uuid}(?:/preview)?`, { GET: null }),
  rule(`/${uuid}/activities/${uuid}/(?:session|eligibility)`, { GET: null }),
  rule(`/${uuid}/activities/${uuid}/start`, { POST: [] }),
  rule(`/${uuid}/activities/${uuid}/authorize-first`, { POST: ['revision', 'studentId', 'deadline'] }),
  rule(`/${uuid}/activities/${uuid}/(?:history|history-submissions)`, { GET: null }),
  rule(`/${uuid}/activities/${uuid}/reopen`, { POST: ['revision', 'studentId', 'deadline', 'confirm'] }),
  rule(`/${uuid}/attempts/${uuid}/history`, { GET: null }),
  rule(`/${uuid}/attempts/${uuid}/grading`, { GET: null, POST: ['revision', 'overallGrade', 'overallFeedback', 'questions'] }),
  rule(`/${uuid}/attempts/${uuid}/grading-ai`, { GET: null }),
  rule(`/${uuid}/attempts/${uuid}/grading-ai/${uuid}/(?:apply|discard)`, { POST: [] }),
  rule(`/${uuid}/attempts/${uuid}/publish-grade`, { POST: ['revision', 'confirm'] }),
  rule(`/${uuid}/attempts/${uuid}/grade-corrections`, { GET: null, POST: ['revision', 'newGrade', 'reason', 'confirm'] }),
  rule(`/${uuid}/attempts/${uuid}/result`, { GET: null }),
  rule(`/${uuid}/attempts/${uuid}/transfer`, { POST: ['revision'] }),
  rule(`/${uuid}/attempts/${uuid}/attachments-remove`, { POST: ['revision', 'fileId'] }),
  rule(`/${uuid}/attempts/${uuid}/submit-practical`, { POST: ['revision', 'confirm'] }),
  rule(`/${uuid}/attempts/${uuid}/answer`, { POST: ['revision', 'questionId', 'text', 'optionIds'] }),
  rule(`/${uuid}/attempts/${uuid}/submit-answers`, { POST: ['revision', 'confirm', 'confirmIncomplete'] }),
  rule(`/${uuid}/activities/${uuid}/submissions`, { GET: null }),
  rule(`/${uuid}/attempts/${uuid}/receipt`, { GET: null }),
  rule('/notifications', { GET: null }), rule('/notifications/page', { GET: null }),
  rule(`/notifications/${uuid}/(?:read|open)`, { POST: [] }),
  rule(`/${uuid}/settings`, { PATCH: ['revision', 'name', 'subject', 'division', 'academicYear', 'aiGradingEnabled'] }),
  rule(`/${uuid}/archive`, { POST: ['archived', 'revision'] }), rule(`/${uuid}/code`, { POST: [] }),
  rule(`/${uuid}/(?:members|history)`, { GET: null }), rule(`/${uuid}/members/${uuid}`, { GET: null }),
  rule(`/${uuid}/invitations`, { GET: null, POST: ['email'] }),
  rule(`/${uuid}/invitations/${uuid}/revoke`, { POST: [] }), rule(`/${uuid}/leave`, { POST: [] }),
  rule(`/${uuid}/members/${uuid}/remove`, { POST: [] }),
];
function destination(value: string | undefined): string {
  if (!value) throw new Error('Missing configuration');
  const url = new URL(value);
  const local = ['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname);
  if (url.origin !== value || url.username || url.password ||
    (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) throw new Error('Invalid configuration');
  return url.origin;
}
function fail(response: ServerResponse, status: number, code: string) {
  if (response.destroyed || response.writableEnded) return;
  if (response.headersSent) { response.destroy(); return; }
  const requestId = crypto.randomUUID();
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', 'X-Request-Id': requestId, ...(status === 503 ? { 'Retry-After': '3' } : {}) });
  response.end(JSON.stringify({ error: { code, requestId } }));
}
function length(value: string | string[] | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error('Invalid length');
  return Number(value);
}
function body(stream: IncomingMessage, limit: number, expected?: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []; let received = 0, settled = false;
    const done = (error?: Error) => {
      if (settled) return; settled = true;
      clearTimeout(timer); stream.off('data', data); stream.off('end', end); stream.off('error', abort); stream.off('aborted', abort);
      if (error) { stream.pause(); reject(error); } else resolve(Buffer.concat(chunks, received));
    };
    const data = (chunk: Buffer) => { received += chunk.length; if (received > limit) done(new RangeError('Body too large')); else if (expected !== undefined && received > expected) done(new Error('Length mismatch')); else chunks.push(chunk); };
    const end = () => done(expected !== undefined && expected !== received ? new Error('Length mismatch') : undefined);
    const abort = () => done(new Error('Body unavailable'));
    const timer = setTimeout(abort, 10_000);
    stream.on('data', data); stream.once('end', end); stream.once('error', abort); stream.once('aborted', abort);
  });
}
function object(value: unknown, keys: string[], required = true): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).every(key => keys.includes(key)) && (!required || keys.every(key => Object.hasOwn(value, key))));
}
function schema(value: unknown, keys: string[]): boolean {
  if (!object(value, keys, false) || !keys.filter(key => key !== 'aiGradingEnabled').every(key => Object.hasOwn(value, key))) return false;
  for (const key of keys) {
    if (key === 'aiGradingEnabled' && !Object.hasOwn(value, key)) continue;
    if (key === 'operation') { if (!value[key] || typeof value[key] !== 'object' || Array.isArray(value[key])) return false; }
    else if (key === 'archived' || key === 'aiGradingEnabled') { if (typeof value[key] !== 'boolean') return false; }
    else if (key === 'academicYear') { if (!Number.isInteger(value[key])) return false; }
    else if (key === 'deadline') {
      const item = value[key];
      if (!object(item, ['local', 'offsetMinutes'], false) || typeof item.local !== 'string'
        || (Object.hasOwn(item, 'offsetMinutes') && !Number.isInteger(item.offsetMinutes))) return false;
    }
    else if (key !== 'payload' && typeof value[key] !== 'string') return false;
  }
  if (!keys.includes('payload')) return true;
  const payload = value.payload;
  if (!object(payload, ['name', 'subject', 'division', 'academicYear', 'timezone', 'coverKey', 'planFileId', 'units'], false)) return false;
  for (const [key, item] of Object.entries(payload)) {
    if (key === 'academicYear') { if (!Number.isInteger(item)) return false; }
    else if (key === 'units') {
      if (!Array.isArray(item) || item.length > 100) return false;
      let topics = 0;
      for (const unit of item) {
        if (!object(unit, ['name', 'topics']) || typeof unit.name !== 'string' || !Array.isArray(unit.topics) || unit.topics.length > 100) return false;
        topics += unit.topics.length;
        if (topics > 500 || !unit.topics.every(topic => object(topic, ['name']) && typeof topic.name === 'string')) return false;
      }
    } else if (typeof item !== 'string') return false;
  }
  return true;
}

function extractionSchema(path: string, value: unknown): boolean {
  try {
    if (path.endsWith('/apply')) parseApplyExtraction(value);
    else if (path.endsWith('/retry')) parseRetryExtraction(value);
    else parseStartExtraction(value);
    return true;
  } catch { return false; }
}

function activitySchema(value: unknown): boolean {
  if (!object(value, ['revision', 'operation']) || typeof value.revision !== 'string') return false;
  const op = value.operation;
  if (!object(op, ['action', 'id', 'type', 'payload', 'title', 'unitId', 'topicId', 'topicIds', 'deadline', 'allowLate'], false) || typeof op.action !== 'string') return false;
  const shapes: Record<string, string[]> = {
    create: ['action', 'type'], save: ['action', 'id', 'payload'], publish: ['action', 'id'], withdraw: ['action', 'id'],
    metadata: ['action', 'id', 'title', 'unitId'], deadline: ['action', 'id', 'deadline', 'allowLate'],
  };
  if (!Object.hasOwn(shapes, op.action)) return false;
  if (op.action === 'metadata') {
    if (!object(op, [...shapes.metadata, 'topicId', 'topicIds'], false)
      || !shapes.metadata.every(key => Object.hasOwn(op, key))) return false;
  } else if (!object(op, shapes[op.action])) return false;
  if (op.action === 'create') return typeof op.type === 'string' && ['ASSIGNMENT', 'QUESTIONNAIRE', 'EVALUATION'].includes(op.type);
  if (typeof op.id !== 'string' || !new RegExp(`^${uuid}$`).test(op.id)) return false;
  const association = (p: Record<string, unknown>) => typeof p.title === 'string'
    && (p.unitId === null || typeof p.unitId === 'string' && new RegExp(`^${uuid}$`).test(p.unitId))
    && (Object.hasOwn(p, 'topicIds') ? Array.isArray(p.topicIds) && p.topicIds.length <= 100
      && p.topicIds.every(id => typeof id === 'string' && new RegExp(`^${uuid}$`).test(id))
      && new Set(p.topicIds).size === p.topicIds.length
      && (!Object.hasOwn(p, 'topicId') || p.topicId === (p.topicIds[0] ?? null))
      : Object.hasOwn(p, 'topicId') && (p.topicId === null || typeof p.topicId === 'string' && new RegExp(`^${uuid}$`).test(p.topicId)));
  const deadline = (item: unknown) => item === null || object(item, ['local', 'offsetMinutes'], false)
    && Object.hasOwn(item, 'local') && typeof item.local === 'string'
    && (!Object.hasOwn(item, 'offsetMinutes') || Number.isInteger(item.offsetMinutes));
  if (op.action === 'metadata') return association(op);
  if (op.action === 'deadline') return typeof op.allowLate === 'boolean' && deadline(op.deadline);
  if (op.action !== 'save') return true;
  const p = op.payload;
  if (!object(p, ['title', 'unitId', 'topicId', 'topicIds', 'instructions', 'attachmentRequired', 'instructionFileIds', 'materialIds', 'questions', 'deadline', 'allowLate', 'aiGradingRubric'], false)
    || !['title', 'unitId', 'instructions', 'attachmentRequired', 'instructionFileIds', 'materialIds', 'questions', 'deadline', 'allowLate'].every(key => Object.hasOwn(p, key))
    || !association(p) || typeof p.instructions !== 'string' || typeof p.attachmentRequired !== 'boolean' || typeof p.allowLate !== 'boolean'
    || (Object.hasOwn(p, 'aiGradingRubric') && typeof p.aiGradingRubric !== 'string')
    || !deadline(p.deadline) || !Array.isArray(p.questions)) return false;
  if (![p.instructionFileIds, p.materialIds].every(ids => Array.isArray(ids) && ids.every(id => typeof id === 'string' && new RegExp(`^${uuid}$`).test(id)))) return false;
  return p.questions.every(q => object(q, ['type', 'prompt', 'points', 'scoringRule', 'options'])
    && typeof q.type === 'string' && typeof q.prompt === 'string' && typeof q.points === 'string'
    && (q.scoringRule === null || typeof q.scoringRule === 'string') && Array.isArray(q.options)
    && q.options.every(o => object(o, ['text', 'correct']) && typeof o.text === 'string' && typeof o.correct === 'boolean'));
}

/** Dedicated bounded P5 transport; Nest alone owns identity, authorization and domain validation. */
export async function proxyClassroomRequest(request: IncomingMessage, response: ServerResponse, configuredOrigin: string | undefined): Promise<void> {
  const reject = (status: number, code: string) => {
    if (!request.complete && !response.headersSent) {
      // Discard without buffering or forwarding. Destroying on `finish` can reset
      // a still-uploading client before its rejection response reaches the wire.
      response.setHeader('Connection', 'close'); request.resume();
    }
    fail(response, status, code);
  };
  let url: URL;
  try {
    // Validate raw spelling before WHATWG normalization can erase traversal segments.
    if (!request.url?.startsWith('/api/v1/classrooms') || /[%\\#]/.test(request.url) || request.url.split('?')[0].split('/').includes('..')) throw new Error();
    url = new URL(request.url, 'http://web.invalid');
  } catch { reject(400, 'INVALID_INPUT'); return; }
  const selected = routes.find(candidate => candidate.path.test(url.pathname));
  if (!selected) { reject(404, 'NOT_FOUND'); return; }
  const method = request.method ?? 'GET';
  if (!Object.hasOwn(selected.methods, method)) { reject(405, 'METHOD_NOT_ALLOWED'); return; }
  const wallPath = new RegExp(`^/api/v1/classrooms/${uuid}/wall(?:/${uuid}(?:/replies)?)?$`).test(url.pathname);
  const notificationPage = url.pathname === '/api/v1/classrooms/notifications/page';
  if (url.search && (!(wallPath || notificationPage) || method !== 'GET')) { reject(400, 'INVALID_INPUT'); return; }
  if (wallPath && method === 'GET') {
    try { parseWallQuery(url.searchParams, url.pathname.endsWith('/replies') ? 'replies' : url.pathname.endsWith('/wall') ? 'feed' : 'thread'); }
    catch { reject(400, 'INVALID_INPUT'); return; }
  }
  if (notificationPage && method === 'GET') {
    try { parseNotificationQuery(url.searchParams); } catch { reject(400, 'INVALID_INPUT'); return; }
  }
  const participation = /\/(?:session|eligibility|start|authorize-first|transfer)$/.test(url.pathname);
  const transfer = /\/attempts\/[^/]+\/transfer$/.test(url.pathname);
  if (participation && (request.headers['x-attempt-editor'] !== undefined || request.headers['x-attempt-epoch'] !== undefined)) {
    if (!transfer || typeof request.headers['x-attempt-editor'] !== 'string'
      || !/^[A-Za-z0-9_-]{43}$/.test(request.headers['x-attempt-editor'])
      || typeof request.headers['x-attempt-epoch'] !== 'string' || !/^(0|[1-9][0-9]{0,18})$/.test(request.headers['x-attempt-epoch'])) {
      reject(400, 'INVALID_INPUT'); return;
    }
  }
  const answerWrite = new RegExp(`^/api/v1/classrooms/${uuid}/attempts/${uuid}/(?:answer|submit-answers)$`).test(url.pathname);
  const practicalWrite = new RegExp(`^/api/v1/classrooms/${uuid}/attempts/${uuid}/(?:attachments-remove|submit-practical)$`).test(url.pathname);
  const historyRoute = new RegExp(`^/api/v1/classrooms/${uuid}/(?:activities/${uuid}/(?:history|history-submissions|reopen)|attempts/${uuid}/history)$`).test(url.pathname);
  const practicalRead = /\/(?:submissions|receipt)$/.test(url.pathname) || historyRoute;
  const gradingRoute = new RegExp(`^/api/v1/classrooms/${uuid}/attempts/${uuid}/grading$`).test(url.pathname);
  const gradingAiRoute = new RegExp(`^/api/v1/classrooms/${uuid}/attempts/${uuid}/grading-ai(?:/${uuid}/(?:apply|discard))?$`).test(url.pathname);
  const publicationRoute = new RegExp(`^/api/v1/classrooms/${uuid}/attempts/${uuid}/(?:publish-grade|result)$`).test(url.pathname);
  const correctionRoute = new RegExp(`^/api/v1/classrooms/${uuid}/attempts/${uuid}/grade-corrections$`).test(url.pathname);
  const progressRoute = new RegExp(`^/api/v1/classrooms/${uuid}/(?:progress|members/${uuid}/(?:progress|ai-summary))$`).test(url.pathname);
  const generationRoute = url.pathname.includes('/activity-generations');
  const extractionRoute = url.pathname.includes('/curriculum-extractions');
  if ((practicalWrite || answerWrite) && (typeof request.headers['x-attempt-editor'] !== 'string'
    || !/^[A-Za-z0-9_-]{43}$/.test(request.headers['x-attempt-editor'])
    || typeof request.headers['x-attempt-epoch'] !== 'string' || !/^(0|[1-9][0-9]{0,18})$/.test(request.headers['x-attempt-epoch']))) {
    reject(400, 'INVALID_INPUT'); return;
  }
  if ((practicalRead || gradingRoute || gradingAiRoute || publicationRoute || correctionRoute || progressRoute) && (request.headers['x-attempt-editor'] !== undefined || request.headers['x-attempt-epoch'] !== undefined)) {
    reject(400, 'INVALID_INPUT'); return;
  }
  let origin: string, expected: number | undefined;
  try { origin = destination(configuredOrigin); } catch { reject(503, 'SERVICE_UNAVAILABLE'); return; }
  try { expected = length(request.headers['content-length']); } catch { reject(400, 'INVALID_INPUT'); return; }
  if (request.headers['content-encoding'] && request.headers['content-encoding'] !== 'identity') { reject(400, 'INVALID_INPUT'); return; }
  if ((expected ?? 0) > requestLimit) { reject(413, 'REQUEST_TOO_LARGE'); return; }
  if (method === 'GET' && ((expected ?? 0) !== 0 || request.headers['transfer-encoding'])) { reject(400, 'INVALID_INPUT'); return; }
  let metadata: Buffer | undefined;
  if (method !== 'GET') {
    if (!/^application\/json(?:;|$)/i.test(request.headers['content-type'] ?? '')) { reject(400, 'INVALID_INPUT'); return; }
    try {
      metadata = await body(request, requestLimit, expected);
      const parsed = JSON.parse(metadata.toString('utf8'));
      const reopening = url.pathname.endsWith('/reopen');
      const validReopening = !reopening || object(parsed, ['revision', 'studentId', 'deadline', 'confirm'])
        && typeof parsed.revision === 'string' && typeof parsed.studentId === 'string' && new RegExp(`^${uuid}$`).test(parsed.studentId)
        && parsed.confirm === true && (parsed.deadline === null || object(parsed.deadline, ['local', 'offsetMinutes'], false)
          && typeof parsed.deadline.local === 'string' && (!Object.hasOwn(parsed.deadline, 'offsetMinutes') || Number.isInteger(parsed.deadline.offsetMinutes)));
      const aiKeys = url.pathname.endsWith('/apply') ? ['requestId', 'revision', 'snapshotHash', 'proposal'] : ['requestId', 'revision'];
      const validGradingAi = !gradingAiRoute || object(parsed, aiKeys) && typeof parsed.requestId === 'string'
        && new RegExp(`^${uuid}$`).test(parsed.requestId) && typeof parsed.revision === 'string' && /^(0|[1-9][0-9]{0,17})$/.test(parsed.revision)
        && (url.pathname.endsWith('/discard') || typeof parsed.snapshotHash === 'string' && /^[a-f0-9]{64}$/.test(parsed.snapshotHash)
          && !!parsed.proposal && typeof parsed.proposal === 'object' && !Array.isArray(parsed.proposal));
      const wallWrite = url.pathname.endsWith('/wall');
      if (wallWrite) parseWallMutation(parsed);
      if (gradingRoute) privateGradingInput(parsed);
      if (correctionRoute) gradeCorrectionInput(parsed);
      if (publicationRoute) gradePublicationInput(parsed);
      if ((!wallWrite && !practicalWrite && !answerWrite && !reopening && !gradingRoute && !gradingAiRoute && !publicationRoute && !correctionRoute && !extractionRoute && !generationRoute && !schema(parsed, selected.methods[method] ?? []))
        || (generationRoute && !generationSchema(url.pathname, parsed))
        || (extractionRoute && !extractionSchema(url.pathname, parsed))
        || !validReopening
        || !validGradingAi
        || (url.pathname.endsWith('/activities') && !activitySchema(parsed))
        || (answerWrite && (!object(parsed, selected.methods[method] ?? []) || typeof parsed.revision !== 'string'
          || (url.pathname.endsWith('/answer') ? typeof parsed.questionId !== 'string' || !new RegExp(`^${uuid}$`).test(parsed.questionId)
            || typeof parsed.text !== 'string' || !Array.isArray(parsed.optionIds) || !parsed.optionIds.every(id => typeof id === 'string' && new RegExp(`^${uuid}$`).test(id))
            : parsed.confirm !== true || typeof parsed.confirmIncomplete !== 'boolean')))
        || (practicalWrite && (!object(parsed, selected.methods[method] ?? []) || typeof parsed.revision !== 'string'
          || (url.pathname.endsWith('/attachments-remove') ? typeof parsed.fileId !== 'string' || !new RegExp(`^${uuid}$`).test(parsed.fileId) : parsed.confirm !== true)))) throw new Error('Invalid schema');
    } catch (error) { reject(error instanceof RangeError ? 413 : 400, error instanceof RangeError ? 'REQUEST_TOO_LARGE' : 'INVALID_INPUT'); return; }
  }
  if (response.destroyed) return;
  await new Promise<void>(resolve => {
    const headers: Record<string, string> = {};
    for (const name of ['cookie', 'origin', 'x-csrf-token', 'content-type']) {
      const value = request.headers[name]; if (typeof value === 'string') headers[name] = value;
    }
    if (transfer || practicalWrite || answerWrite) for (const name of ['x-attempt-editor', 'x-attempt-epoch']) {
      const value = request.headers[name]; if (typeof value === 'string') headers[name] = value;
    }
    if (metadata) headers['content-length'] = String(metadata.length);
    let settled = false, upstreamResponse: IncomingMessage | undefined;
    const transport = origin.startsWith('https:') ? httpsRequest : httpRequest;
    const upstream = transport(`${origin}${url.pathname}${url.search}`, { method, headers });
    const finish = () => {
      if (settled) return; settled = true;
      clearTimeout(deadline); request.off('aborted', disconnect); request.off('error', disconnect); response.off('close', disconnect); response.off('finish', finish);
      upstreamResponse?.destroy(); upstream.destroy(); resolve();
    };
    const disconnect = () => finish();
    const unavailable = () => { if (!settled) { fail(response, 503, 'SERVICE_UNAVAILABLE'); finish(); } };
    const deadline = setTimeout(unavailable, 30_000);
    request.once('aborted', disconnect); request.once('error', disconnect); response.once('close', disconnect); response.once('finish', finish);
    upstream.once('error', unavailable);
    upstream.once('response', result => {
      upstreamResponse = result;
      if (settled) { result.destroy(); return; }
      void (async () => {
        const status = result.statusCode ?? 503;
        if (status >= 300 && status < 400) throw new Error('Redirect unavailable');
        const size = length(result.headers['content-length']);
        if ((size ?? 0) > responseLimit || result.headers['content-encoding'] || !/^application\/json(?:;|$)/i.test(result.headers['content-type'] ?? '')) throw new Error('Invalid upstream');
        const content = await body(result, responseLimit, size);
        JSON.parse(content.toString('utf8'));
        if (settled) return;
        const output: Record<string, string | string[]> = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
        for (const name of ['retry-after', 'x-request-id', 'set-cookie']) { const value = result.headers[name]; if (value !== undefined) output[name] = value; }
        response.writeHead(status, output); response.end(content);
      })().catch(unavailable);
    });
    upstream.end(metadata);
  });
}
