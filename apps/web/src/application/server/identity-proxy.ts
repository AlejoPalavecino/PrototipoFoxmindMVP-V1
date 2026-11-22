/** Transport only: Nest remains the sole session, origin and permission authority. */
const paths: Record<string, readonly string[]> = {
  '/auth/session': ['GET'], '/auth/csrf': ['GET'],
  '/auth/register': ['POST'], '/auth/login': ['POST'], '/auth/logout': ['POST'],
  '/auth/email-verification/confirm': ['POST'], '/auth/email-verification/resend': ['POST'],
  '/auth/password-recovery/request': ['POST'], '/auth/password-recovery/confirm': ['POST'],
  '/account': ['GET', 'PATCH'], '/account/password': ['POST'],
};
const limit = 16_384;
const securityHeaders = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Type': 'application/json; charset=utf-8' };
function failure(status: number, code: string): Response {
  const requestId = crypto.randomUUID();
  return new Response(JSON.stringify({ error: { code, requestId } }), { status,
    headers: { ...securityHeaders, 'X-Request-Id': requestId } });
}
function backendOrigin(value: string | undefined): string {
  if (!value) throw new Error('Missing backend configuration.');
  const url = new URL(value);
  const local = ['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname);
  if (url.origin !== value || url.username || url.password || (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))) {
    throw new Error('Invalid backend configuration.');
  }
  return url.origin;
}
async function boundedBody(body: ReadableStream<Uint8Array> | null): Promise<Uint8Array | undefined> {
  if (!body) return undefined;
  const reader = body.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  // A failed stream can reject cancellation too. Preserve the original HTTP error.
  const cancelReader = () => { void reader.cancel().catch(() => {}); };
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; cancelReader(); }, 10_000);
  let ended = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) { ended = true; if (timedOut) throw new Error('Body deadline exceeded.'); break; }
      size += value.length;
      if (size > limit) { cancelReader(); throw new RangeError('Body too large.'); }
      chunks.push(value);
    }
    const result = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
    return result;
  } finally {
    clearTimeout(timer);
    if (!ended) cancelReader();
    reader.releaseLock();
  }
}
export async function proxyAccountRequest(request: Request, configuredOrigin: string | undefined, upstream: typeof fetch = fetch,
  clientHeaders: Readonly<Record<string, string>> = {}): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.slice('/api/v1'.length);
  const methods = paths[path];
  if (!methods) return failure(404, 'NOT_FOUND');
  if (url.search) return failure(400, 'VALIDATION_ERROR');
  if (!methods.includes(request.method)) return failure(405, 'METHOD_NOT_ALLOWED');
  try {
    const destination = backendOrigin(configuredOrigin);
    if (Number(request.headers.get('content-length')) > limit) return failure(413, 'REQUEST_TOO_LARGE');
    const headers = new Headers();
    for (const name of ['cookie', 'origin', 'x-csrf-token', 'content-type', 'content-encoding']) {
      const value = request.headers.get(name);
      if (value !== null) headers.set(name, value);
    }
    for (const name of ['x-foxmind-client-address', 'x-foxmind-client-proof']) {
      const value = clientHeaders[name]; if (value !== undefined) headers.set(name, value);
    }
    const body = await boundedBody(request.body);
    const result = await upstream(`${destination}/api/v1${path}`, {
      method: request.method, headers, body: body as BodyInit | undefined,
      cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(10_000),
    });
    if (result.status >= 300 && result.status < 400) return failure(503, 'SERVICE_UNAVAILABLE');
    const responseHeaders = new Headers(securityHeaders);
    for (const name of ['retry-after', 'x-request-id']) {
      const value = result.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    for (const cookie of result.headers.getSetCookie()) responseHeaders.append('set-cookie', cookie);
    let responseBody: Uint8Array | null | undefined = null;
    try { responseBody = result.status === 204 ? null : await boundedBody(result.body); }
    catch { return failure(503, 'SERVICE_UNAVAILABLE'); }
    return new Response(responseBody as BodyInit | null, { status: result.status, headers: responseHeaders });
  } catch (error) {
    return error instanceof RangeError ? failure(413, 'REQUEST_TOO_LARGE') : failure(503, 'SERVICE_UNAVAILABLE');
  }
}
