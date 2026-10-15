import { IdentitySecurityError } from './errors.ts';

function scalarText(value: unknown, min: number, max: number): string {
  if (typeof value !== 'string' || /[\uD800-\uDFFF]/u.test(value)) {
    throw new IdentitySecurityError('VALIDATION_ERROR');
  }
  let size = 0;
  for (const _point of value) {
    if (++size > max) throw new IdentitySecurityError('VALIDATION_ERROR');
  }
  if (size < min) throw new IdentitySecurityError('VALIDATION_ERROR');
  return value;
}

export function validatePassword(value: unknown): string {
  return scalarText(value, 16, 128);
}

export function validateName(value: unknown): string {
  const text = scalarText(value, 1, 80);
  if (!/\S/u.test(text)) throw new IdentitySecurityError('VALIDATION_ERROR');
  return text;
}

/** Shape only: HTTP must then validate each value, using A's mailbox parser for email. */
export function validateBodyShape(
  value: unknown, allowed: readonly string[], required: readonly string[] = [], nonempty = false,
): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)
    || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new IdentitySecurityError('VALIDATION_ERROR');
  }
  const keys = Object.keys(value);
  if ((nonempty && keys.length === 0) || keys.some(key => !allowed.includes(key))
    || required.some(key => !Object.hasOwn(value, key))) {
    throw new IdentitySecurityError('VALIDATION_ERROR');
  }
  return value as Record<string, unknown>;
}

/** Apply to actual received bytes, not Content-Length or JS string length. */
export function assertBodySize(bytes: number): void {
  if (!Number.isSafeInteger(bytes) || bytes < 0 || bytes > 16384) {
    throw new IdentitySecurityError('REQUEST_TOO_LARGE');
  }
}
