import type { ServerResponse } from 'node:http';

/**
 * Shared JSON transport of the API hosts (D3). Each host passes its own code → status table, because
 * `platform/` never imports the error classes of the modules.
 */
export type ErrorStatuses = Readonly<Record<string, number>>;

/** The `code` of an error-like value, or '' when it has none. */
export function errorCode(error: unknown): string {
  return error && typeof error === 'object' && 'code' in error ? String((error as { code: unknown }).code) : '';
}

/** Public code and status of an error: a code missing from the table is answered as `fallback` (503 by default). */
export function publicError(error: unknown, statuses: ErrorStatuses, fallback = 'SERVICE_UNAVAILABLE'): { code: string; status: number } {
  const raw = errorCode(error);
  const code = Object.hasOwn(statuses, raw) ? raw : fallback;
  return { code, status: statuses[code] ?? 503 };
}

/**
 * Writes `body` as JSON with `status` and any extra headers. Never writes twice or to a destroyed response;
 * a 204 ends without a body or Content-Type. BigInt values are sent as decimal strings.
 */
export function sendJson(response: ServerResponse, status: number, body: unknown, headers: Readonly<Record<string, string>> = {}): void {
  if (response.writableEnded || response.destroyed) return;
  response.statusCode = status;
  for (const [name, value] of Object.entries(headers)) response.setHeader(name, value);
  if (status === 204) { response.end(); return; }
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body, (_key, value) => (typeof value === 'bigint' ? value.toString() : value)));
}
