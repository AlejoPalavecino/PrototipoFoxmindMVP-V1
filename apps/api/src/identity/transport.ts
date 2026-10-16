import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import { clearSessionCookie, parseVerifier, sessionCookie, validateBodyShape, IDENTITY_POLICY } from '../identity-security/index.ts';
import { IdentityHttpError, publicIdentityError } from './errors.ts';
import { IdentityRuntime, publicUser } from './runtime.ts';

const implemented = new Set(['GET /auth/session', 'GET /auth/csrf', 'POST /auth/login', 'POST /auth/logout']);
export function readSessionCookie(header: string | undefined): { present: boolean; verifier: string | null } {
  const values = (header ?? '').split(';').map(part => part.trim()).filter(part => part.startsWith('foxmind_session='));
  if (!values.length) return { present: false, verifier: null };
  if (values.length !== 1) return { present: true, verifier: null };
  try { return { present: true, verifier: parseVerifier(values[0].slice('foxmind_session='.length)) }; }
  catch { return { present: true, verifier: null }; }
}
/** Read actual bytes with a bounded buffer; do not trust Content-Length or destroy the response socket on overflow. */
export async function readIdentityJson(request: IncomingMessage): Promise<unknown> {
  const type = request.headers['content-type'];
  const hasBody = request.headers['transfer-encoding'] !== undefined || Number(request.headers['content-length'] ?? 0) > 0;
  if ((type !== undefined && !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(type))
    || (hasBody && type === undefined) || request.headers['content-encoding'] !== undefined) {
    request.resume(); throw new IdentityHttpError('MEDIA_TYPE_UNSUPPORTED');
  }
  const bytes = await new Promise<Buffer>((resolve, reject) => {
    let length = 0;
    const chunks: Buffer[] = [];
    const cleanup = () => { request.off('data', data); request.off('end', end); request.off('error', unavailable); request.off('aborted', unavailable); };
    const unavailable = () => { cleanup(); reject(new IdentityHttpError('SERVICE_UNAVAILABLE')); };
    const data = (chunk: Buffer) => {
      length += chunk.length;
      if (length > IDENTITY_POLICY.bodyLimitBytes) {
        cleanup(); request.resume(); reject(new IdentityHttpError('REQUEST_TOO_LARGE'));
      } else chunks.push(chunk);
    };
    const end = () => { cleanup(); resolve(Buffer.concat(chunks, length)); };
    request.on('data', data); request.once('end', end); request.once('error', unavailable); request.once('aborted', unavailable);
  });
  if (!bytes.length) return {};
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new IdentityHttpError('VALIDATION_ERROR'); }
}
function json(response: ServerResponse, status: number, body?: unknown): void {
  response.statusCode = status;
  if (status === 204) { response.end(); return; }
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body));
}
/** Registered before Nest's ordinary parser. Only implemented method/path pairs intercept traffic. */
export function installIdentityTransport(app: INestApplication, runtime: IdentityRuntime): void {
  app.use((request: IncomingMessage, response: ServerResponse, next: () => void) => {
    const path = request.url?.split('?')[0];
    if (!path?.startsWith('/api/v1')) { next(); return; }
    const route = `${request.method} ${path.slice('/api/v1'.length)}`;
    if (!implemented.has(route)) { next(); return; }
    const requestId = randomUUID();
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Request-Id', requestId);
    void (async () => {
      const config = runtime.configuration.security;
      const cookie = readSessionCookie(request.headers.cookie);
      const context = cookie.verifier ? await runtime.store.authenticate(cookie.verifier) : null;
      if (cookie.present && !context) response.setHeader('Set-Cookie', clearSessionCookie(config));
      const ip = request.socket.remoteAddress;
      if (!ip) throw new IdentityHttpError('SERVICE_UNAVAILABLE');
      await runtime.generalAdmission(ip, context);
      if (request.method === 'POST') {
        config.assertOrigin(request.headers.origin);
        // Authenticate persisted active state FIRST; HMAC alone must never grant authorization.
        if (context && !config.validateCsrf(context.verifier, request.headers['x-csrf-token'])) throw new IdentityHttpError('CSRF_INVALID');
        const body = await readIdentityJson(request);
        if (route === 'POST /auth/login') {
          const result = await runtime.login(body, ip, context);
          response.setHeader('Set-Cookie', sessionCookie(config, result.verifier, result.expiresAt.getTime(), Math.max(Date.now(), result.now.getTime())));
          json(response, 200, result.state);
        } else {
          validateBodyShape(body, []);
          await runtime.logout(context);
          response.setHeader('Set-Cookie', clearSessionCookie(config));
          json(response, 204);
        }
      } else if (route === 'GET /auth/session') {
        json(response, 200, context ? { authenticated: true, user: publicUser(context.user) } : { authenticated: false });
      } else {
        if (!context) throw new IdentityHttpError('AUTH_REQUIRED');
        json(response, 200, { csrfToken: config.csrfToken(context.verifier) });
      }
    })().catch(error => {
      request.resume();
      const safe = publicIdentityError(error);
      if (safe.retryAfter) response.setHeader('Retry-After', String(safe.retryAfter));
      json(response, safe.status, { error: { code: safe.code, requestId } });
    });
  });
}
