import { IdentitySecurityError } from './security/errors.ts';

export function parseVerifier(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value)
    || !/[AEIMQUYcgkosw048]$/.test(value)) {
    throw new IdentitySecurityError('VERIFIER_INVALID');
  }
  return value;
}
