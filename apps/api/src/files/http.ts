import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { FileError, type FileErrorCode } from './errors.ts';
import { FilePolicyError, type UploadIntent } from './policy.ts';
import { FileService } from './service.ts';
import { uuid, FileIdentityError } from './store.ts';
import type { FileScope } from './contracts.ts';

type Next = () => void;
const httpStatus: Record<FileErrorCode | 'FILE_TYPE_NOT_ALLOWED', number> = {
  INVALID_UPLOAD: 400, FILE_TOO_LARGE: 413, FILE_TYPE_NOT_ALLOWED: 415, FILE_REJECTED: 422,
  FILE_NOT_READY: 409, FORBIDDEN: 403, NOT_FOUND: 404, UPLOAD_CONFLICT: 409,
  QUOTA_EXCEEDED: 409, SERVICE_UNAVAILABLE: 503,
};
function json(response: ServerResponse, status: number, value: unknown) {
  response.statusCode = status; response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(value, (_, value) => typeof value === 'bigint' ? value.toString() : value));
}
function shape(value: unknown, required: string[], optional: string[] = []): asserts value is Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || required.some(key => !Object.hasOwn(value, key))
    || Object.keys(value).some(key => !required.includes(key) && !optional.includes(key))) throw new FileError('INVALID_UPLOAD');
}
function scope(value: unknown): FileScope {
  shape(value, ['kind', 'id']);
  if (!['draft', 'classroom'].includes(value.kind) || !uuid(value.id)) throw new FileError('INVALID_UPLOAD');
  return { kind: value.kind, id: value.id };
}
function body(request: IncomingMessage, limit: number, expected?: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let total = 0, ended = false; const chunks: Buffer[] = [];
    const finish = (error?: FileError) => {
      if (ended) return; ended = true; clearTimeout(timer);
      request.off('data', data); request.off('end', end); request.off('aborted', abort); request.off('error', abort);
      if (error) { request.pause(); reject(error); } else resolve(Buffer.concat(chunks, total));
    };
    const data = (chunk: Buffer) => { total += chunk.length; if (total > limit) finish(new FileError('FILE_TOO_LARGE')); else chunks.push(chunk); };
    const end = () => finish(expected !== undefined && total !== expected ? new FileError('INVALID_UPLOAD') : undefined);
    const abort = () => finish(new FileError('INVALID_UPLOAD'));
    const timer = setTimeout(() => finish(new FileError('SERVICE_UNAVAILABLE')), 10000);
    request.on('data', data); request.once('end', end); request.once('aborted', abort); request.once('error', abort);
  });
}
function sendContent(response: ServerResponse, bytes: Buffer): Promise<void> {
  if (response.destroyed) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (error?: FileError) => {
      if (settled) return; settled = true; clearTimeout(timer);
      response.off('finish', finish); response.off('close', close); response.off('error', close);
      if (error) reject(error); else resolve();
    };
    const finish = () => done(), close = () => done(new FileError('SERVICE_UNAVAILABLE'));
    const timer = setTimeout(() => { response.destroy(); close(); }, 30000);
    response.once('finish', finish); response.once('close', close); response.once('error', close);
    try { response.end(bytes); } catch { close(); }
  });
}

/** One instance per ingress; the host owns admission and the Express mount prefix. */
export function createFilesHandler(service: FileService) {
  let transferring = false;
  return (request: IncomingMessage, response: ServerResponse, next: Next) => {
    const requestId = String(response.getHeader?.('X-Request-Id') ?? randomUUID());
    let url: URL;
    try { url = new URL(request.url ?? '/', 'http://files.invalid'); }
    catch { response.setHeader('X-Request-Id', requestId); response.setHeader('Cache-Control', 'no-store'); response.setHeader('X-Content-Type-Options', 'nosniff'); json(response, 400, { error: { code: 'INVALID_UPLOAD', requestId } }); return; }
    if (url.pathname !== '/files' && !url.pathname.startsWith('/files/')) { next(); return; }
    response.setHeader('X-Request-Id', requestId);
    response.setHeader('Cache-Control', 'no-store'); response.setHeader('X-Content-Type-Options', 'nosniff');
    let ownsTransfer = false;
    void (async () => {
      const method = request.method;
      if (method === 'GET' && (request.headers['transfer-encoding'] || Number(request.headers['content-length'] ?? '0') !== 0)) {
        throw new FileError('INVALID_UPLOAD');
      }
      const match = /^\/files\/([0-9a-f-]{36})(\/content)?$/i.exec(url.pathname);
      if (request.headers['content-encoding'] && request.headers['content-encoding'] !== 'identity') throw new FileError('INVALID_UPLOAD');
      if (method === 'POST' && url.pathname === '/files') {
        if (url.search || request.headers['content-type']?.split(';')[0].trim() !== 'application/json') throw new FileError('INVALID_UPLOAD');
        let value: unknown;
        try { value = JSON.parse((await body(request, 16384)).toString('utf8')); }
        catch (error) { if (error instanceof FileError) throw error; throw new FileError('INVALID_UPLOAD'); }
        shape(value, ['scope', 'purpose', 'name', 'bytes'], ['targetId']);
        const intent: UploadIntent = { purpose: value.purpose, name: value.name, bytes: value.bytes };
        json(response, 201, await service.begin(request, scope(value.scope), intent, value.targetId ?? null));
      } else if (method === 'GET' && url.pathname === '/files/usage') {
        if ([...url.searchParams.keys()].sort().join(',') !== 'id,kind') throw new FileError('INVALID_UPLOAD');
        json(response, 200, await service.usage(request, scope(Object.fromEntries(url.searchParams))));
      } else if (match && uuid(match[1])) {
        const id = match[1];
        if (method === 'PUT' && match[2]) {
          if (url.search || request.headers['content-type'] !== 'application/octet-stream') throw new FileError('INVALID_UPLOAD');
          if (transferring) throw new FileError('SERVICE_UNAVAILABLE');
          transferring = true; ownsTransfer = true;
          // Authorize before accepting a potentially large body; receive rechecks before every mutation.
          const current = await service.store.transaction(tx => service.store.loadAuthorized(tx, request, id, 'upload'));
          if (!/^\d+$/.test(request.headers['content-length'] ?? '') || Number(request.headers['content-length']) !== Number(current.size_bytes)) {
            throw new FileError('INVALID_UPLOAD');
          }
          const bytes = await body(request, Number(current.size_bytes), Number(current.size_bytes));
          json(response, 200, await service.receive(request, id, bytes));
        } else if (method === 'GET' && !match[2]) {
          if (url.search) throw new FileError('INVALID_UPLOAD');
          json(response, 200, await service.status(request, id));
        } else if (method === 'GET' && match[2]) {
          if ([...url.searchParams.keys()].some(key => key !== 'mode') || url.searchParams.getAll('mode').length > 1) throw new FileError('INVALID_UPLOAD');
          const mode = url.searchParams.get('mode') ?? 'download';
          if (mode !== 'download' && mode !== 'preview') throw new FileError('INVALID_UPLOAD');
          if (transferring) throw new FileError('SERVICE_UNAVAILABLE');
          transferring = true; ownsTransfer = true;
          const file = await service.read(request, id, mode);
          if (response.destroyed) return;
          for (const [name, value] of Object.entries(file.headers)) response.setHeader(name, value);
          response.statusCode = 200; await sendContent(response, file.bytes);
        } else throw new FileError('NOT_FOUND');
      } else throw new FileError('NOT_FOUND');
    })().catch(error => {
      if (response.destroyed || response.headersSent) { response.destroy(); return; }
      const identity = error instanceof FileIdentityError ? error : undefined;
      const fileCode = error instanceof FileError || error instanceof FilePolicyError ? error.code : 'SERVICE_UNAVAILABLE';
      const code = identity?.code ?? fileCode;
      const status = identity?.status ?? httpStatus[fileCode];
      if (identity?.retryAfter) response.setHeader('Retry-After', String(identity.retryAfter));
      else if (status === 503) response.setHeader('Retry-After', '3');
      // Do not drain an unbounded rejected body. Finish the sanitized response, then close that socket.
      if (!request.complete) { response.setHeader('Connection', 'close'); response.once('finish', () => request.destroy()); }
      json(response, status, { error: { code, requestId } });
    }).finally(() => { if (ownsTransfer) transferring = false; });
  };
}
