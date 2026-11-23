/** Page CSP: inline scripts (Turbopack bootstrap, token capture) run only with the request's nonce. */
const NONCE = /^[A-Za-z0-9+/]{22}==$/;

export function createNonce(): string {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
}

export function readNonce(value: unknown): string | undefined {
  return typeof value === 'string' && NONCE.test(value) ? value : undefined;
}

export function pageContentSecurityPolicy(nonce: string, development = false): string {
  if (!readNonce(nonce)) throw new Error('INVALID_CSP_NONCE');
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${development ? " 'unsafe-eval'" : ''}`,
    "object-src 'none'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
  ].join('; ');
}
