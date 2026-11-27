import { randomUUID } from 'node:crypto';
import { request as httpRequest, type IncomingMessage, type ServerResponse } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { performance } from 'node:perf_hooks';
import { clientAddressHeaders } from '../client-address.ts';
import { discardRejectedBody } from '../rejected-request-body.ts';

/**
 * Shared server-side transport for every web proxy: destination check, header allow-lists, bounded
 * bodies, cookie policy and one error shape. Each proxy only declares its routes and limits.
 */

/** A request rejected before reaching the API, with its public status and code. */
export class ProxyRejection extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string) { super(code); this.status = status; this.code = code; }
}
export const reject = (status: number, code: string): never => { throw new ProxyRejection(status, code); };

/** Only https, or plain http to loopback, with no credentials and an exact origin. */
export function apiDestination(value: string | undefined): string {
  try {
    const url = new URL(value ?? '');
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.origin === value && !url.username && !url.password && (url.protocol === 'https:' || local && url.protocol === 'http:')) return url.origin;
  } catch { /* Falls through to the same public failure. */ }
  return reject(503, 'SERVICE_UNAVAILABLE');
}

/** Rejects encoded, escaped or traversal paths before URL normalization can hide them. */
export function strictPath(raw: string | undefined): URL {
  const value = raw ?? '';
  if (/[\\#]/.test(value) || /%|\.\./.test(value.split('?')[0]!)) reject(400, 'INVALID_INPUT');
  return new URL(value, 'http://web.invalid');
}

const SECURITY_HEADERS = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } as const;
/** One error shape for every proxy: `{ error: { code, requestId } }`, JSON utf-8, Retry-After on 503. */
export function sendError(response: ServerResponse, status: number, code: string, requestId: string = randomUUID()): void {
  if (response.destroyed || response.writableEnded) return;
  if (response.headersSent) { response.destroy(); return; }
  const headers: Record<string, string> = { ...SECURITY_HEADERS, 'Content-Type': 'application/json; charset=utf-8', 'X-Request-Id': requestId };
  if (status === 503 && !response.getHeader('Retry-After')) headers['Retry-After'] = '3';
  response.writeHead(status, headers);
  response.end(JSON.stringify({ error: { code, requestId } }));
}

/**
 * A rejected request whose body is still arriving: discard at most `budget` more bytes until
 * `deadline` without keeping them, then answer and close. A body beyond the budget or the deadline
 * aborts the connection instead, so an oversized or slow body never ties up the server; a JSON
 * error is not guaranteed for an arbitrarily large body.
 */
export async function rejectRequest(request: IncomingMessage, response: ServerResponse, error: unknown,
  options: { budget: number; deadline?: number; mode?: 'drain' | 'close' }): Promise<void> {
  const { status, code } = error instanceof ProxyRejection ? error : { status: 400, code: 'INVALID_INPUT' };
  // A body already known to be too large is never read: answer now, then close the socket.
  if (options.mode === 'close' && !request.readableEnded) {
    response.setHeader('Connection', 'close');
    response.once('finish', () => request.destroy());
    sendError(response, status, code);
    return;
  }
  if (!request.readableEnded) {
    response.setHeader('Connection', 'close');
    if (!await discardRejectedBody(request, response, options.budget, options.deadline ?? performance.now() + 10_000)) return;
  }
  sendError(response, status, code);
}

/** Request headers the API needs; everything else (authorization, forwarding claims) is dropped. */
export function upstreamHeaders(request: IncomingMessage, names: readonly string[]): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const name of names) { const value = request.headers[name]; if (typeof value === 'string') headers[name] = value; }
  return { ...headers, ...clientAddressHeaders(request) };
}

const SESSION_CLEAR = /^foxmind_session=; Path=\/; HttpOnly; SameSite=Lax(?:; Secure)?; Max-Age=0$/u;
/**
 * Identity may set any session cookie; every other proxy only relays the exact session clear, so an
 * API route outside identity can never plant a cookie in the browser.
 */
export type CookiePolicy = 'identity' | 'session-clear';
export function relayHeaders(result: IncomingMessage, cookies: CookiePolicy): Record<string, string | string[]> {
  const headers: Record<string, string | string[]> = {};
  for (const name of ['retry-after', 'x-request-id']) { const value = result.headers[name]; if (typeof value === 'string') headers[name] = value; }
  const received = result.headers['set-cookie'] ?? [];
  const allowed = cookies === 'identity' ? received : received.filter(value => SESSION_CLEAR.test(value)).slice(0, 1);
  if (allowed.length) headers['set-cookie'] = allowed;
  return headers;
}

/** Reads a stream fully, failing above `limit` bytes or after `timeoutMs`. */
export function readBounded(stream: IncomingMessage, limit: number, timeoutMs: number, tooLarge = 'REQUEST_TOO_LARGE'): Promise<Buffer> {
  return new Promise((resolve, rejectRead) => {
    const chunks: Buffer[] = []; let size = 0, done = false;
    const finish = (error?: Error) => {
      if (done) return; done = true; clearTimeout(timer);
      stream.off('data', data); stream.off('end', end); stream.off('error', abort); stream.off('aborted', abort);
      if (error) { stream.pause(); rejectRead(error); } else resolve(Buffer.concat(chunks, size));
    };
    const data = (chunk: Buffer) => { size += chunk.length; if (size > limit) finish(new ProxyRejection(413, tooLarge)); else chunks.push(chunk); };
    const end = () => finish(), abort = () => finish(new ProxyRejection(400, 'INVALID_INPUT'));
    const timer = setTimeout(abort, timeoutMs);
    stream.on('data', data); stream.once('end', end); stream.once('error', abort); stream.once('aborted', abort);
  });
}

/** A request that must not carry a body (GET and other read routes). */
export function requireNoBody(request: IncomingMessage): void {
  if (request.headers['transfer-encoding'] || Number(request.headers['content-length'] ?? 0) || request.headers['content-encoding']) reject(400, 'INVALID_INPUT');
}

/**
 * Sends one upstream request and hands the response to `handle`. Any upstream error, redirect,
 * timeout or handler failure becomes 503; a client that goes away cancels the upstream request.
 */
export function forward(request: IncomingMessage, response: ServerResponse, options: {
  origin: string; path: string; method: string; headers: Record<string, string>; body?: Buffer; timeoutMs: number;
  handle(result: IncomingMessage): Promise<void>;
}): Promise<void> {
  return new Promise(resolve => {
    const headers = { ...options.headers, ...(options.body ? { 'content-length': String(options.body.length) } : {}) };
    const transport = options.origin.startsWith('https:') ? httpsRequest : httpRequest;
    const upstream = transport(options.origin + options.path, { method: options.method, headers });
    let incoming: IncomingMessage | undefined, settled = false;
    const finish = () => {
      if (settled) return; settled = true; clearTimeout(timer);
      request.off('aborted', finish); response.off('close', finish);
      incoming?.destroy(); upstream.destroy(); resolve();
    };
    const unavailable = () => { if (!settled) sendError(response, 503, 'SERVICE_UNAVAILABLE'); finish(); };
    const timer = setTimeout(unavailable, options.timeoutMs);
    request.once('aborted', finish); response.once('close', finish);
    upstream.once('error', unavailable);
    upstream.once('response', result => {
      incoming = result;
      const status = result.statusCode ?? 503;
      if (status >= 300 && status < 400) { unavailable(); return; }
      void options.handle(result).then(finish, unavailable);
    });
    upstream.end(options.body);
  });
}

/** Relays a JSON response after checking type and size; the body is re-sent byte for byte. */
export async function relayJson(result: IncomingMessage, response: ServerResponse, options: {
  limit: number; timeoutMs: number; cookies: CookiePolicy; validate?(status: number, body: unknown): void;
}): Promise<void> {
  const status = result.statusCode ?? 503;
  const headers = { ...SECURITY_HEADERS, ...relayHeaders(result, options.cookies) };
  if (status === 204) { if (!response.destroyed && !response.writableEnded) { response.writeHead(204, headers); response.end(); } return; }
  if (result.headers['content-encoding'] || !/^application\/json(?:;|$)/i.test(result.headers['content-type'] ?? '')
    || Number(result.headers['content-length'] ?? 0) > options.limit) throw new Error('Unexpected upstream response');
  const content = await readBounded(result, options.limit, options.timeoutMs);
  const body: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(content));
  if (status < 200 || status > 599) throw new Error('Unexpected upstream status');
  options.validate?.(status, body);
  if (response.destroyed || response.writableEnded) return;
  response.writeHead(status, { ...headers, 'Content-Type': 'application/json; charset=utf-8' });
  response.end(content);
}
