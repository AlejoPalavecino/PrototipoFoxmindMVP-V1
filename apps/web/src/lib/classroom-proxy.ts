import { request as httpRequest, type IncomingMessage, type ServerResponse } from 'node:http';
import { request as httpsRequest } from 'node:https';

const requestLimit = 512 * 1024;
const responseLimit = 2 * 1024 * 1024;
const uuid = '[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}';
type Rule = { path: RegExp; methods: Record<string, string[] | null> };
const rule = (path: string, methods: Rule['methods']): Rule => ({ path: new RegExp(`^/api/v1/classrooms${path}$`), methods });
const routes: Rule[] = [
  rule('', { GET: null }), rule('/drafts', { GET: null, POST: [] }),
  rule(`/drafts/${uuid}`, { GET: null, PATCH: ['revision', 'payload'] }),
  rule(`/drafts/${uuid}/publish`, { POST: ['revision'] }),
  rule('/codes/preview', { POST: ['code'] }), rule('/codes/confirm', { POST: ['confirmation'] }),
  rule('/invitations', { GET: null }), rule(`/invitations/${uuid}/accept`, { POST: [] }),
  rule(`/${uuid}`, { GET: null }),
  rule(`/${uuid}/settings`, { PATCH: ['revision', 'name', 'subject', 'division', 'academicYear'] }),
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
  if (!object(value, keys)) return false;
  for (const key of keys) {
    if (key === 'archived') { if (typeof value[key] !== 'boolean') return false; }
    else if (key === 'academicYear') { if (!Number.isInteger(value[key])) return false; }
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
  if (url.search) { reject(400, 'INVALID_INPUT'); return; }
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
      if (!schema(JSON.parse(metadata.toString('utf8')), selected.methods[method] ?? [])) throw new Error('Invalid schema');
    } catch (error) { reject(error instanceof RangeError ? 413 : 400, error instanceof RangeError ? 'REQUEST_TOO_LARGE' : 'INVALID_INPUT'); return; }
  }
  if (response.destroyed) return;
  await new Promise<void>(resolve => {
    const headers: Record<string, string> = {};
    for (const name of ['cookie', 'origin', 'x-csrf-token', 'content-type']) {
      const value = request.headers[name]; if (typeof value === 'string') headers[name] = value;
    }
    if (metadata) headers['content-length'] = String(metadata.length);
    let settled = false, upstreamResponse: IncomingMessage | undefined;
    const transport = origin.startsWith('https:') ? httpsRequest : httpRequest;
    const upstream = transport(`${origin}${url.pathname}`, { method, headers });
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
