import { clientAddressHeaders } from './client-address.ts';
import { FILE_MAX_BYTES, uploadDeadlineMs } from '../../../../../src/core/domain/documents/document-formats.ts';
import { apiDestination, ProxyRejection, rejectRequest, relayHeaders, sendError } from './transport/api-transport.ts';
import { request as httpRequest, type IncomingMessage, type ServerResponse } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { Transform } from 'node:stream';

const metadataLimit = 16_384;
const binaryLimit = FILE_MAX_BYTES;
// Types the files API serves; anything else is relayed as a generic download, never as its own type.
const binaryTypes = new Set(['application/pdf', 'image/png', 'image/jpeg', 'application/zip', 'application/msword', 'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream']);
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const filePath = new RegExp(`^/api/v1/files/(${uuid})(/content)?$`, 'i');

const fail = sendError;
function route(url: URL, method: string): { status?: number; binary?: boolean } {
  const match = filePath.exec(url.pathname);
  const root = url.pathname === '/api/v1/files';
  const usage = url.pathname === '/api/v1/files/usage';
  if (!root && !usage && !match) return { status: 404 };
  if (!(root ? method === 'POST' : usage ? method === 'GET' : match?.[2] ? ['GET', 'PUT'].includes(method) : method === 'GET')) return { status: 405 };
  const keys = [...url.searchParams.keys()];
  if (usage) {
    if (keys.sort().join(',') !== 'id,kind' || !['draft', 'classroom'].includes(url.searchParams.get('kind') ?? '') ||
      !new RegExp(`^${uuid}$`, 'i').test(url.searchParams.get('id') ?? '')) return { status: 400 };
  } else if (method === 'GET' && match?.[2]) {
    if (keys.some(key => key !== 'mode') || keys.length > 1 ||
      (keys.length === 1 && !['preview', 'download'].includes(url.searchParams.get('mode') ?? ''))) return { status: 400 };
  } else if (url.search) return { status: 400 };
  return { binary: Boolean(match?.[2]) };
}
function declaredLength(value: string | string[] | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error('Invalid length');
  return Number(value);
}
function byteCounter(limit: number, expected?: number) {
  let received = 0;
  return new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      received += chunk.length;
      if (received > limit || (expected !== undefined && received > expected)) callback(new Error('Body limit exceeded'));
      else callback(null, chunk);
    },
    flush(callback) { callback(expected !== undefined && received !== expected ? new Error('Length mismatch') : undefined); },
  });
}

/** Binary-only ingress; P3 account routes and their transport remain unchanged. */
export async function proxyFileRequest(request: IncomingMessage, response: ServerResponse, configuredOrigin: string | undefined): Promise<void> {
  let url: URL, origin: string, length: number | undefined;
  // Rejected binaries are never drained into memory or forwarded: answer, then close the socket.
  const reject = (status: number, code: string) => { void rejectRequest(request, response, new ProxyRejection(status, code), { budget: 0, mode: 'close' }); };
  try {
    const raw = request.url ?? '/';
    // Same strict path rule as every other proxy: no escapes, encodings or traversal.
    if (/[\\#]/.test(raw) || /%|\.\./.test(raw.split('?')[0]!)) throw new Error('Unsafe path');
    url = new URL(raw, 'http://web.invalid');
  } catch { reject(400, 'INVALID_UPLOAD'); return; }
  const method = request.method ?? 'GET';
  const selected = route(url, method);
  if (selected.status) { reject(selected.status, selected.status === 404 ? 'NOT_FOUND' : selected.status === 405 ? 'METHOD_NOT_ALLOWED' : 'INVALID_UPLOAD'); return; }
  try { origin = apiDestination(configuredOrigin); } catch { reject(503, 'SERVICE_UNAVAILABLE'); return; }
  try { length = declaredLength(request.headers['content-length']); } catch { reject(400, 'INVALID_UPLOAD'); return; }
  if (request.headers['content-encoding'] && request.headers['content-encoding'] !== 'identity') { reject(400, 'INVALID_UPLOAD'); return; }
  if (method === 'GET' && (request.headers['transfer-encoding'] || (length ?? 0) !== 0)) { reject(400, 'INVALID_UPLOAD'); return; }
  const limit = method === 'PUT' ? binaryLimit : metadataLimit;
  if ((length ?? 0) > limit) { reject(413, 'FILE_TOO_LARGE'); return; }
  if (method === 'PUT' && (length === undefined || request.headers['content-type'] !== 'application/octet-stream')) { reject(400, 'INVALID_UPLOAD'); return; }
  if (method === 'POST' && request.headers['content-type']?.split(';')[0].trim() !== 'application/json') { reject(400, 'INVALID_UPLOAD'); return; }

  // Metadata is small and fully checked before forwarding; large binaries stream under backpressure.
  let metadata: Buffer | undefined;
  if (method === 'POST') {
    try {
      metadata = await new Promise<Buffer>((resolve, rejectBody) => {
        const chunks: Buffer[] = []; let received = 0;
        const done = (error?: Error) => {
          clearTimeout(timer); request.off('data', data); request.off('end', end); request.off('error', abort); request.off('aborted', abort);
          if (error) { request.pause(); rejectBody(error); } else resolve(Buffer.concat(chunks, received));
        };
        const data = (chunk: Buffer) => { received += chunk.length; if (received > metadataLimit) done(new RangeError()); else chunks.push(chunk); };
        const end = () => done(length !== undefined && received !== length ? new Error('Length mismatch') : undefined);
        const abort = () => done(new Error('Disconnected'));
        const timer = setTimeout(abort, 10_000);
        request.on('data', data); request.once('end', end); request.once('error', abort); request.once('aborted', abort);
      });
    } catch (error) { reject(error instanceof RangeError ? 413 : 400, error instanceof RangeError ? 'FILE_TOO_LARGE' : 'INVALID_UPLOAD'); return; }
  }
  const editor = request.headers['x-attempt-editor'], epoch = request.headers['x-attempt-epoch'];
  const hasEditor = editor !== undefined || epoch !== undefined;
  if (hasEditor) {
    let attachment = method === 'PUT' && filePath.test(url.pathname) && url.pathname.endsWith('/content') && !url.search;
    if (method === 'POST' && url.pathname === '/api/v1/files' && !url.search) {
      try {
        const data = JSON.parse(metadata!.toString('utf8'));
        attachment = data.purpose === 'attachment' && data.scope?.kind === 'classroom'
          && typeof data.targetId === 'string' && new RegExp(`^${uuid}$`, 'i').test(data.targetId)
          && typeof data.scope.id === 'string' && new RegExp(`^${uuid}$`, 'i').test(data.scope.id);
      } catch { attachment = false; }
    }
    if (!attachment || typeof editor !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(editor)
      || typeof epoch !== 'string' || !/^(0|[1-9][0-9]{0,18})$/.test(epoch)) { reject(400, 'INVALID_UPLOAD'); return; }
  }
  if (response.destroyed) return;
  await new Promise<void>(resolve => {
    const headers: Record<string, string> = {};
    Object.assign(headers, clientAddressHeaders(request));
    for (const name of ['cookie', 'origin', 'x-csrf-token', 'content-type']) {
      const value = request.headers[name]; if (typeof value === 'string') headers[name] = value;
    }
    if (hasEditor) { headers['x-attempt-editor'] = editor as string; headers['x-attempt-epoch'] = epoch as string; }
    if (metadata) headers['content-length'] = String(metadata.length);
    else if (method === 'PUT') headers['content-length'] = String(length);
    let settled = false, upstreamResponse: IncomingMessage | undefined, uploadCounter: Transform | undefined, responseCounter: Transform | undefined;
    let receiveTimer: ReturnType<typeof setTimeout> | undefined;
    const transport = origin.startsWith('https:') ? httpsRequest : httpRequest;
    const upstream = transport(`${origin}${url.pathname}${url.search}`, { method, headers });
    const finish = () => {
      if (settled) return; settled = true;
      clearTimeout(deadline); clearTimeout(receiveTimer);
      request.off('aborted', disconnect); request.off('error', disconnect); response.off('close', disconnect); response.off('finish', finish);
      if (uploadCounter) { request.unpipe(uploadCounter); uploadCounter.destroy(); }
      responseCounter?.destroy(); upstreamResponse?.destroy(); upstream.destroy();
      if (!request.complete) request.destroy();
      resolve();
    };
    const disconnect = () => { finish(); };
    const unavailable = () => { if (!settled) { fail(response, 503, 'SERVICE_UNAVAILABLE'); finish(); } };
    // Includes upload, validation/scan, upstream response and downstream delivery; a binary upload adds
    // its size-based receive window (F8).
    const receiveWindow = method === 'PUT' ? uploadDeadlineMs(length ?? 0) + 5_000 : 0;
    const deadline = setTimeout(unavailable, 60_000 + receiveWindow);
    request.once('aborted', disconnect); request.once('error', disconnect);
    response.once('close', disconnect); response.once('finish', finish);
    upstream.on('error', unavailable);
    upstream.once('response', result => {
      upstreamResponse = result;
      if (settled) { result.destroy(); return; }
      const status = result.statusCode ?? 503;
      if (status >= 300 && status < 400) { unavailable(); return; }
      const binary = method === 'GET' && selected.binary && status === 200;
      let expected: number | undefined;
      try { expected = declaredLength(result.headers['content-length']); } catch { unavailable(); return; }
      if ((expected ?? 0) > (binary ? binaryLimit : metadataLimit) || result.headers['content-encoding']) { unavailable(); return; }
      const responseHeaders: Record<string, string | string[]> = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
      Object.assign(responseHeaders, relayHeaders(result, 'session-clear'));
      const type = result.headers['content-type'];
      if (type !== undefined) responseHeaders['content-type'] = binary && !binaryTypes.has(type.split(';')[0]!.trim().toLowerCase()) ? 'application/octet-stream' : type;
      if (binary) {
        for (const name of ['content-disposition', 'content-length']) {
          const value = result.headers[name]; if (value !== undefined) responseHeaders[name] = value;
        }
        responseHeaders['Content-Security-Policy'] = "sandbox; default-src 'none'; frame-ancestors 'self'";
        responseHeaders['Cross-Origin-Resource-Policy'] = 'same-origin';
      }
      const counter = byteCounter(binary ? binaryLimit : metadataLimit, expected);
      responseCounter = counter;
      result.on('error', unavailable); result.on('aborted', unavailable); counter.on('error', unavailable);
      if (binary) { response.writeHead(status, responseHeaders); result.pipe(counter).pipe(response); }
      else {
        const chunks: Buffer[] = [];
        counter.on('data', chunk => chunks.push(chunk));
        counter.once('end', () => { if (!settled) { response.writeHead(status, responseHeaders); response.end(Buffer.concat(chunks)); } });
        result.pipe(counter);
      }
    });
    if (method === 'PUT') {
      uploadCounter = byteCounter(binaryLimit, length);
      uploadCounter.on('error', () => { if (!settled) { reject(400, 'INVALID_UPLOAD'); finish(); } });
      // Same size-based rule as the API plus its idle window, so the API decides first (F8).
      receiveTimer = setTimeout(unavailable, receiveWindow);
      uploadCounter.once('end', () => clearTimeout(receiveTimer));
      request.pipe(uploadCounter).pipe(upstream);
    } else upstream.end(metadata);
  });
}
