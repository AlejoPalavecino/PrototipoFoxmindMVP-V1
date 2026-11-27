import { clientAddressHeaders } from './client-address.ts';
import { request as httpRequest, type IncomingMessage, type ServerResponse } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { performance } from 'node:perf_hooks';
import { Transform } from 'node:stream';
import { FILE_MAX_BYTES } from '../../../../../src/core/domain/documents/document-formats.ts';
import { apiDestination, ProxyRejection, rejectRequest, relayHeaders, sendError } from './transport/api-transport.ts';

const root = '/api/v1/foxy-ai', uuid = '[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}';
const conversation = new RegExp(`^${root}/conversations/${uuid}$`, 'i');
const visuals = new RegExp(`^${root}/conversations/${uuid}/visuals$`, 'i');
const visual = new RegExp(`^${root}/conversations/${uuid}/visuals/${uuid}$`, 'i');
const asset = new RegExp(`^${root}/assets/${uuid}$`, 'i');
const assetEditorial = new RegExp(`^${root}/assets/${uuid}/editorial$`, 'i');
const assetFile = new RegExp(`^${root}/assets/${uuid}/file$`, 'i');
const assetPublications = new RegExp(`^${root}/assets/${uuid}/publications$`, 'i');
const turns = new RegExp(`^${root}/conversations/${uuid}/turns$`, 'i');
const turn = new RegExp(`^${root}/conversations/${uuid}/turns/${uuid}$`, 'i');
const catalog = new RegExp(`^${root}/conversations/${uuid}/(curriculum|sources)$`, 'i');
const citations = new RegExp(`^${root}/conversations/${uuid}/turns/${uuid}/citations$`, 'i');
const citationFile = new RegExp(`^${root}/conversations/${uuid}/turns/${uuid}/citations/c[1-9][0-9]*/file$`, 'i');
const cancelGeneration = new RegExp(`^${root}/conversations/${uuid}/(turns|visuals)/${uuid}/cancel$`, 'i');
const turnResource = new RegExp(`^${root}/conversations/${uuid}/turns/${uuid}/resource$`, 'i');
const activityDraft = new RegExp(`^${root}/resources/${uuid}/activity-draft$`, 'i');
const resource = new RegExp(`^${root}/resources/${uuid}$`, 'i');
const preparePublication = new RegExp(`^${root}/resources/${uuid}/publications$`, 'i');
const publication = new RegExp(`^${root}/publications/${uuid}$`, 'i');
const publicationFile = new RegExp(`^${root}/publications/${uuid}/file$`, 'i');
const confirmPublication = new RegExp(`^${root}/publications/${uuid}/confirm$`, 'i');
const managementPublication = new RegExp(`^${root}/publications/${uuid}/management$`, 'i');
const commandPublication = new RegExp(`^${root}/publications/${uuid}/(retry|discard)$`, 'i');
const requestLimit = 1048576, jsonLimit = 2 * 1024 * 1024, binaryLimit = FILE_MAX_BYTES;
const fail = sendError;
function select(request: IncomingMessage): { url: URL; method: string; binary: boolean } {
  const raw = request.url ?? '', method = request.method ?? 'GET';
  if (!raw.startsWith(`${root}/`) || /[\\#]/u.test(raw) || /%|\.\./u.test(raw.split('?')[0]!)) throw new Error();
  const url = new URL(raw, 'http://web.invalid'), path = url.pathname, binary = citationFile.test(path) || publicationFile.test(path) || assetFile.test(path);
  const allowed = path === `${root}/capabilities` || path === `${root}/creations` || catalog.test(path) || turn.test(path) || visual.test(path) || asset.test(path) || citations.test(path) || binary || publication.test(path) || managementPublication.test(path) ? ['GET']
    : activityDraft.test(path) || turnResource.test(path) || cancelGeneration.test(path) || confirmPublication.test(path) || commandPublication.test(path) ? ['POST']
      : preparePublication.test(path) || assetPublications.test(path) || visuals.test(path) ? ['GET', 'POST']
      : assetEditorial.test(path) ? ['PATCH']
      : resource.test(path) ? ['GET', 'PATCH']
        : path === `${root}/conversations` || turns.test(path) ? ['GET', 'POST'] : conversation.test(path) ? ['GET', 'PATCH', 'DELETE'] : [];
  if (!allowed.length) throw Object.assign(new Error(), { status: 404 });
  if (!allowed.includes(method)) throw Object.assign(new Error(), { status: 405 });
  const keys = [...url.searchParams.keys()];
  if (new Set(keys).size !== keys.length) throw new Error();
  const query = path === `${root}/creations` ? ['limit', 'after', 'q', 'context', 'type', 'status']
    : path === `${root}/conversations` && method === 'GET' ? ['limit', 'after', 'q', 'context']
    : (preparePublication.test(path) || assetPublications.test(path) || visuals.test(path)) && method === 'GET' ? ['limit', 'afterId']
    : turns.test(path) && method === 'GET' ? ['afterSequence', 'limit']
      : path.endsWith('/sources') ? ['kind', 'limit', 'after'] : binary ? ['mode'] : [];
  if (keys.some(key => !query.includes(key))) throw new Error();
  if (url.searchParams.has('q') && ([...url.searchParams.get('q')!].length > 120 || /[\u0000-\u001f\u007f-\u009f]/u.test(url.searchParams.get('q')!))) throw new Error();
  if (url.searchParams.has('context') && !['ALL', 'GENERAL'].includes(url.searchParams.get('context')!) && !new RegExp(`^${uuid}$`, 'i').test(url.searchParams.get('context')!)) throw new Error();
  if (url.searchParams.has('type') && !['ALL', 'NOTE', 'PLAN', 'ACTIVITY', 'RUBRIC', 'DIAGRAM', 'IMAGE'].includes(url.searchParams.get('type')!)) throw new Error();
  if (url.searchParams.has('status') && !['ALL', 'PRIVATE', 'PREPARING', 'DRAFT', 'PUBLISHED'].includes(url.searchParams.get('status')!)) throw new Error();
  if (path === `${root}/creations` && url.searchParams.has('limit') && (Number(url.searchParams.get('limit')) < 1 || Number(url.searchParams.get('limit')) > 50)) throw new Error();
  if (url.searchParams.has('mode') && !['preview', 'download'].includes(url.searchParams.get('mode')!)) throw new Error();
  if (url.searchParams.has('kind') && !['PLAN', 'MATERIAL', 'ACTIVITY'].includes(url.searchParams.get('kind')!)) throw new Error();
  for (const name of ['limit', 'afterSequence']) if (url.searchParams.has(name) && !/^(?:0|[1-9][0-9]{0,9})$/u.test(url.searchParams.get(name)!)) throw new Error();
  if ((preparePublication.test(path) || assetPublications.test(path) || visuals.test(path)) && url.searchParams.has('limit') && (Number(url.searchParams.get('limit')) < 1 || Number(url.searchParams.get('limit')) > 50)) throw new Error();
  if (url.searchParams.has('afterId') && !new RegExp(`^${uuid}$`, 'i').test(url.searchParams.get('afterId')!)) throw new Error();
  if (url.searchParams.has('after') && !/^[A-Za-z0-9_-]{1,4096}$/u.test(url.searchParams.get('after')!)) throw new Error();
  return { url, method, binary };
}
function read(stream: IncomingMessage, limit: number, deadline?: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []; let size = 0, settled = false;
    const done = (error?: Error) => {
      if (settled) return; settled = true; clearTimeout(timer);
      stream.off('data', data); stream.off('end', end); stream.off('error', abort); stream.off('aborted', abort);
      if (error) { stream.pause(); reject(error); } else resolve(Buffer.concat(chunks));
    };
    const data = (chunk: Buffer) => { size += chunk.length; if (size > limit) done(new RangeError()); else chunks.push(chunk); };
    const end = () => done(), abort = () => done(new Error());
    const timer = setTimeout(abort, deadline === undefined ? 10000 : Math.max(0, deadline - performance.now()));
    stream.on('data', data); stream.once('end', end); stream.once('error', abort); stream.once('aborted', abort);
  });
}
function length(value: string | string[] | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^[0-9]+$/u.test(value) || !Number.isSafeInteger(Number(value))) throw new Error();
  return Number(value);
}
async function metadata(request: IncomingMessage, method: string, deadline: number): Promise<Buffer | undefined> {
  const expected = length(request.headers['content-length']);
  if (request.headers['content-encoding'] !== undefined) throw new Error();
  if ((expected ?? 0) > requestLimit) throw new RangeError();
  if (method === 'GET') { if ((expected ?? 0) || request.headers['transfer-encoding']) throw new Error(); return undefined; }
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?\s*$/iu.test(request.headers['content-type'] ?? '')) throw new Error();
  const content = await read(request, requestLimit, deadline);
  if (expected !== undefined && content.length !== expected) throw new Error();
  JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(content)); return content;
}
function counter(max: number, expected?: number): Transform {
  let received = 0;
  return new Transform({ transform(chunk: Buffer, _encoding, callback) {
    received += chunk.length; callback(received > max || (expected !== undefined && received > expected) ? new Error() : null, chunk);
  }, flush(callback) { callback(expected !== undefined && received !== expected ? new Error() : undefined); } });
}
function responseHeaders(result: IncomingMessage): Record<string, string | string[]> {
  return { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...relayHeaders(result, 'session-clear') };
}
async function receive(result: IncomingMessage, response: ServerResponse, binary: boolean, privateImage: boolean): Promise<void> {
  const status = result.statusCode ?? 503, contentType = result.headers['content-type'] ?? '', expected = length(result.headers['content-length']);
  if (status >= 300 && status < 400 || result.headers['content-encoding'] !== undefined) throw new Error();
  const headers = responseHeaders(result);
  if (status === 204) { response.writeHead(status, headers); response.end(); return; }
  const isBinary = binary && status === 200, max = isBinary ? (privateImage ? 10485760 : binaryLimit) : jsonLimit;
  if ((expected ?? 0) > max) throw new Error();
  if (!isBinary) {
    if (!/^application\/json(?:\s*;|$)/iu.test(contentType)) throw new Error();
    const data = await read(result, max);
    if (expected !== undefined && data.length !== expected) throw new Error();
    JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data));
    if (!response.destroyed && !response.writableEnded) { response.writeHead(status, { ...headers, 'Content-Type': 'application/json; charset=utf-8' }); response.end(data); }
    return;
  }
  const octet = /^application\/octet-stream(?:\s*;|$)/iu.test(contentType);
  if (privateImage ? !/^(image\/png|image\/jpeg|application\/octet-stream)(?:\s*;|$)/iu.test(contentType) : !octet && !/^(application\/pdf|image\/png|image\/jpeg|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)(?:\s*;|$)/iu.test(contentType)) throw new Error();
  headers['Content-Type'] = contentType;
  headers['Content-Security-Policy'] = "sandbox; default-src 'none'; frame-ancestors 'self'";
  headers['Cross-Origin-Resource-Policy'] = 'same-origin';
  if (expected !== undefined) headers['Content-Length'] = String(expected);
  const disposition = result.headers['content-disposition'];
  if (octet) headers['Content-Disposition'] = typeof disposition === 'string' && /^attachment(?:\s*;|$)/iu.test(disposition) ? disposition : 'attachment';
  else if (typeof disposition === 'string') headers['Content-Disposition'] = disposition;
  await new Promise<void>((resolve, reject) => {
    const limiter = counter(max, expected);
    const failed = () => { limiter.destroy(); reject(new Error()); };
    result.once('error', failed); result.once('aborted', failed); limiter.once('error', failed);
    response.once('finish', resolve); response.writeHead(status, headers); result.pipe(limiter).pipe(response);
  });
}
function forward(request: IncomingMessage, response: ServerResponse, origin: string,
  selected: ReturnType<typeof select>, content?: Buffer): Promise<void> {
  return new Promise(resolve => {
    const headers: Record<string, string> = {};
    Object.assign(headers, clientAddressHeaders(request));
    for (const key of ['cookie', 'origin', 'x-csrf-token', 'content-type']) {
      const value = request.headers[key]; if (typeof value === 'string') headers[key] = value;
    }
    if (content) headers['content-length'] = String(content.length);
    const transport = origin.startsWith('https:') ? httpsRequest : httpRequest;
    const upstream = transport(origin + selected.url.pathname + selected.url.search, { method: selected.method, headers });
    let incoming: IncomingMessage | undefined, settled = false;
    const finish = () => { if (settled) return; settled = true; clearTimeout(timer);
      request.off('aborted', finish); response.off('close', finish); incoming?.destroy(); upstream.destroy(); resolve(); };
    const unavailable = () => { if (!settled) fail(response, 503, 'SERVICE_UNAVAILABLE'); finish(); };
    const timer = setTimeout(unavailable, selected.binary ? 60000 : 30000);
    request.once('aborted', finish); response.once('close', finish); upstream.once('error', unavailable);
    upstream.once('response', result => { incoming = result; void receive(result, response, selected.binary, assetFile.test(selected.url.pathname)).then(finish, unavailable); });
    upstream.end(content);
  });
}
export async function proxyFoxyRequest(request: IncomingMessage, response: ServerResponse, configuredOrigin?: string): Promise<void> {
  const metadataDeadline = performance.now() + 10_000;
  let selected: ReturnType<typeof select>, content: Buffer | undefined, origin: string;
  try { selected = select(request); content = await metadata(request, selected.method, metadataDeadline); }
  catch (error) {
    const status = error instanceof RangeError ? 413 : (error as { status?: number }).status ?? 400;
    const code = status === 413 ? 'REQUEST_TOO_LARGE' : status === 405 ? 'METHOD_NOT_ALLOWED' : status === 404 ? 'NOT_FOUND' : 'INVALID_INPUT';
    await rejectRequest(request, response, new ProxyRejection(status, code), { budget: requestLimit + 1, deadline: metadataDeadline }); return;
  }
  try { origin = apiDestination(configuredOrigin); } catch { fail(response, 503, 'SERVICE_UNAVAILABLE'); return; }
  await forward(request, response, origin, selected, content);
}
