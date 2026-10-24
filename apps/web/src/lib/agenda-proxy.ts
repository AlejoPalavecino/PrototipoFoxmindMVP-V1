import { request as httpRequest, type IncomingMessage, type ServerResponse } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { agendaId, agendaObject, agendaRevision, parseAgendaEvent, parseAgendaRange } from '../../../../src/core/domain/index.ts';

const maxRequest = 32 * 1024, maxResponse = 2 * 1024 * 1024;
const eventPath = /^\/api\/v1\/agenda\/events\/([a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/i;
function fail(response: ServerResponse, status: number, code: string) {
  if (response.destroyed || response.writableEnded) return;
  if (response.headersSent) { response.destroy(); return; }
  response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  response.end(JSON.stringify({ error: { code } }));
}
function destination(value?: string) {
  const url = new URL(value ?? '');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.origin !== value || url.username || url.password || !(url.protocol === 'https:' || local && url.protocol === 'http:')) throw new Error();
  return url.origin;
}
function read(stream: IncomingMessage, limit: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []; let size = 0;
    const done = (error?: Error) => {
      clearTimeout(timer); stream.off('data', data); stream.off('end', end); stream.off('error', abort); stream.off('aborted', abort);
      if (error) { stream.pause(); reject(error); } else resolve(Buffer.concat(chunks));
    };
    const data = (chunk: Buffer) => { size += chunk.length; if (size > limit) done(new RangeError()); else chunks.push(chunk); };
    const end = () => done();
    const abort = () => done(new Error());
    const timer = setTimeout(abort, 10_000);
    stream.on('data', data); stream.once('end', end); stream.once('error', abort); stream.once('aborted', abort);
  });
}
function route(request: IncomingMessage): { url: URL; method: string } {
  const raw = request.url ?? '';
  if (/[\\#]/.test(raw) || /%|\.\./.test(raw.split('?')[0])) throw new Error();
  const url = new URL(raw, 'http://web.invalid'), method = request.method ?? 'GET';
  const methods = url.pathname === '/api/v1/agenda' || url.pathname === '/api/v1/agenda/upcoming' ? ['GET']
    : url.pathname === '/api/v1/agenda/open' ? ['POST'] : eventPath.test(url.pathname) ? ['GET', 'PUT', 'PATCH', 'DELETE'] : [];
  if (!methods.length) throw Object.assign(new Error(), { status: 404 });
  if (!methods.includes(method)) throw Object.assign(new Error(), { status: 405 });
  const query = Object.fromEntries(url.searchParams);
  if ([...url.searchParams.keys()].length !== Object.keys(query).length) throw new Error();
  if (url.pathname === '/api/v1/agenda') {
    agendaObject(query, ['startDate', 'endDateExclusive', 'timeZone', 'cursor']);
    const { cursor, ...range } = query; parseAgendaRange(range);
    if (cursor !== undefined && (!cursor || cursor.length > 4096 || !/^[A-Za-z0-9_-]+$/.test(cursor))) throw new Error();
  } else if (url.pathname.endsWith('/upcoming')) {
    agendaObject(query, ['limit']);
    if (query.limit !== undefined && (!/^[1-9]\d?$/.test(query.limit) || Number(query.limit) > 20)) throw new Error();
  } else if (url.search) throw new Error();
  return { url, method };
}
function validateBody(path: string, method: string, input: unknown) {
  if (path.endsWith('/open')) {
    const data = agendaObject(input, ['classroomId', 'activityId']);
    agendaId(data.classroomId); if (data.activityId !== null) agendaId(data.activityId);
  } else if (method === 'PUT') parseAgendaEvent(input);
  else {
    const data = agendaObject(input, method === 'PATCH' ? ['revision', 'event'] : ['revision']);
    agendaRevision(data.revision); if (method === 'PATCH') parseAgendaEvent(data.event);
  }
}
async function metadata(request: IncomingMessage, path: string, method: string) {
  const length = request.headers['content-length'];
  if (length !== undefined && (typeof length !== 'string' || !/^\d+$/.test(length))) throw new Error();
  if (Number(length ?? 0) > maxRequest) throw new RangeError();
  if (request.headers['content-encoding'] && request.headers['content-encoding'] !== 'identity') throw new Error();
  if (method === 'GET') {
    if (Number(length ?? 0) || request.headers['transfer-encoding']) throw new Error();
    return undefined;
  }
  if (!/^application\/json(?:;|$)/i.test(request.headers['content-type'] ?? '')) throw new Error();
  const content = await read(request, maxRequest);
  if (length !== undefined && content.length !== Number(length)) throw new Error();
  validateBody(path, method, JSON.parse(content.toString('utf8')));
  return content;
}
async function upstreamBody(result: IncomingMessage, response: ServerResponse) {
  const status = result.statusCode ?? 503;
  if (status >= 300 && status < 400) throw new Error();
  const headers: Record<string, string | string[]> = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  for (const key of ['retry-after', 'x-request-id', 'set-cookie']) {
    const value = result.headers[key]; if (value !== undefined) headers[key] = value;
  }
  if (status === 204) { response.writeHead(204, headers); response.end(); return; }
  if (result.headers['content-encoding'] || !/^application\/json(?:;|$)/i.test(result.headers['content-type'] ?? '')) throw new Error();
  if (Number(result.headers['content-length'] ?? 0) > maxResponse) throw new Error();
  const content = await read(result, maxResponse); JSON.parse(content.toString('utf8'));
  if (response.destroyed || response.writableEnded) return;
  response.writeHead(status, { ...headers, 'Content-Type': 'application/json; charset=utf-8' }); response.end(content);
}
function forward(request: IncomingMessage, response: ServerResponse, origin: string, url: URL, method: string, content?: Buffer) {
  return new Promise<void>(resolve => {
    const headers: Record<string, string> = {};
    for (const key of ['cookie', 'origin', 'x-csrf-token', 'content-type']) {
      const value = request.headers[key]; if (typeof value === 'string') headers[key] = value;
    }
    if (content) headers['content-length'] = String(content.length);
    const transport = origin.startsWith('https:') ? httpsRequest : httpRequest;
    const upstream = transport(origin + url.pathname + url.search, { method, headers });
    let incoming: IncomingMessage | undefined, settled = false;
    const finish = () => {
      if (settled) return; settled = true; clearTimeout(timer);
      request.off('aborted', finish); response.off('close', finish);
      incoming?.destroy(); upstream.destroy(); resolve();
    };
    const unavailable = () => { if (!settled) fail(response, 503, 'SERVICE_UNAVAILABLE'); finish(); };
    const timer = setTimeout(unavailable, 30_000);
    request.once('aborted', finish); response.once('close', finish);
    upstream.once('error', unavailable);
    upstream.once('response', result => { incoming = result; void upstreamBody(result, response).then(finish, unavailable); });
    upstream.end(content);
  });
}
export async function proxyAgendaRequest(request: IncomingMessage, response: ServerResponse, configuredOrigin?: string): Promise<void> {
  let selected: ReturnType<typeof route>, content: Buffer | undefined, origin: string;
  try { selected = route(request); content = await metadata(request, selected.url.pathname, selected.method); }
  catch (error) {
    const status = error instanceof RangeError ? 413 : (error as { status?: number }).status ?? 400;
    if (!request.complete) { response.setHeader('Connection', 'close'); request.resume(); }
    fail(response, status, status === 413 ? 'REQUEST_TOO_LARGE' : status === 405 ? 'METHOD_NOT_ALLOWED' : status === 404 ? 'NOT_FOUND' : 'INVALID_INPUT'); return;
  }
  try { origin = destination(configuredOrigin); } catch { fail(response, 503, 'SERVICE_UNAVAILABLE'); return; }
  await forward(request, response, origin, selected.url, selected.method, content);
}
