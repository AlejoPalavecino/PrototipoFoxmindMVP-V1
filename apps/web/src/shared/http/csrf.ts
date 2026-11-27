/**
 * The API's CSRF token is derived from the session, so it stays valid until the session rotates.
 * A source keeps one token per client instance instead of asking for it before every mutation.
 * When the API answers CSRF_INVALID the token is dropped and the error reaches the person, who
 * retries with a fresh token: mutations are never resent implicitly.
 */
export interface CsrfSource {
  token(signal?: AbortSignal): Promise<string>;
  invalidate(): void;
}

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
  let current: Promise<string> | null = null;
  return {
    token(signal) {
      signal?.throwIfAborted();
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

/** Sends a mutation with the shared token; a CSRF_INVALID answer drops it so the next attempt reads a new one. */
export async function withCsrf<T>(source: CsrfSource, send: (token: string) => Promise<T>, signal?: AbortSignal): Promise<T> {
  try {
    return await send(await source.token(signal));
  } catch (error) {
    if ((error as { code?: string }).code === 'CSRF_INVALID') source.invalidate();
    throw error;
  }
}
