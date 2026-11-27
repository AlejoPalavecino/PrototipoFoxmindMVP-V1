import { ClientError, errorCode } from '../../../../../src/core/contracts/client-error.ts';
import { sessionChangedEvent, type CsrfTokenSource } from '../../../../../src/core/contracts/csrf.ts';

/**
 * The API's CSRF token is derived from the session, so it stays valid until the session rotates.
 * A source keeps one token per client instance instead of asking for it before every mutation.
 * It drops the token when the API answers CSRF_INVALID or when an account mutation in this tab
 * announces a new session; the error reaches the person and mutations are never resent implicitly.
 */
export type CsrfSource = CsrfTokenSource;

let sessionEpoch = 0;
/** Drops every cached token on the next use; account mutations reach it through `sessionChangedEvent`. */
export function forgetSessionCsrfTokens() { sessionEpoch++; }
globalThis.addEventListener?.(sessionChangedEvent, forgetSessionCsrfTokens);

function abortable<T>(pending: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return pending;
  signal.throwIfAborted();
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    pending.then(
      value => { signal.removeEventListener('abort', abort); resolve(value); },
      error => { signal.removeEventListener('abort', abort); reject(error); },
    );
  });
}

export function createCsrfSource(read: () => Promise<string>): CsrfSource {
  let current: Promise<string> | null = null, epoch = sessionEpoch;
  return {
    token(signal) {
      signal?.throwIfAborted();
      if (epoch !== sessionEpoch) { current = null; epoch = sessionEpoch; }
      if (!current) {
        const pending: Promise<string> = read().catch(error => {
          if (current === pending) current = null;
          throw error;
        });
        // A read whose callers all left is still settled; its failure only clears the cache.
        pending.catch(() => {});
        current = pending;
      }
      return abortable(current, signal);
    },
    invalidate() { current = null; },
  };
}

/** A source that reads the token from the session endpoint; failures keep the API's error code. */
export function createSessionCsrfSource(fetcher: typeof fetch = fetch): CsrfSource {
  return createCsrfSource(async () => {
    let response: Response, body: unknown;
    try {
      response = await fetcher('/api/v1/auth/csrf', { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15_000) });
      body = await response.json();
    } catch { throw new ClientError('SERVICE_UNAVAILABLE', 503, 'SERVICE_UNAVAILABLE'); }
    const token = (body as { csrfToken?: unknown } | null)?.csrfToken;
    if (!response.ok || typeof token !== 'string' || !token) {
      const code = response.ok ? 'SERVICE_UNAVAILABLE' : errorCode(body);
      throw new ClientError(code, response.ok ? 503 : response.status, code);
    }
    return token;
  });
}

/** Sends a mutation with the shared token; a CSRF_INVALID answer drops it so the next attempt reads a new one. */
export async function withCsrf<T>(source: CsrfSource, send: (token: string) => Promise<T>, signal?: AbortSignal): Promise<T> {
  try {
    return await send(await source.token(signal));
  } catch (error) {
    if ((error as { code?: string }).code === 'CSRF_INVALID') source.invalidate();
    throw error;
  }
}
