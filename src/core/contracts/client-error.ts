/**
 * Base for the browser clients' errors. Every client keeps its own class and messages, so `instanceof`
 * checks keep working, while screens can handle any of them through `ClientError`.
 */
export class ClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryAfter: number;
  constructor(code: string, status: number, message: string, retryAfter = 0) {
    super(message);
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

/** Error code of a FoxMind API error body, or SERVICE_UNAVAILABLE when it has none. */
export function errorCode(body: unknown): string {
  const code = (body as { error?: { code?: unknown } } | null | undefined)?.error?.code;
  return typeof code === 'string' && code ? code : 'SERVICE_UNAVAILABLE';
}

/** Seconds from a Retry-After header, or 0 when it is absent or invalid. */
export function retryAfterSeconds(response: Response): number {
  const value = Number(response.headers.get('retry-after'));
  return Number.isSafeInteger(value) && value > 0 ? value : 0;
}
