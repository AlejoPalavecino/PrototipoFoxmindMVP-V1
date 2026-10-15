import { createHash, randomBytes } from 'node:crypto';
import { ACCOUNT_TOKEN_DIGEST_DOMAIN, SESSION_TOKEN_DIGEST_DOMAIN } from '../identity-protocol.ts';
import { IdentitySecurityError } from './errors.ts';

export type AccountTokenPurpose = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';

export function generateVerifier(): string {
  return randomBytes(32).toString('base64url');
}

export function parseVerifier(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(value)
    || Buffer.from(value, 'base64url').toString('base64url') !== value) {
    throw new IdentitySecurityError('VERIFIER_INVALID');
  }
  return value;
}

export function accountTokenDigest(purpose: AccountTokenPurpose, raw: unknown): string {
  if (purpose !== 'EMAIL_VERIFICATION' && purpose !== 'PASSWORD_RESET') {
    throw new IdentitySecurityError('VERIFIER_INVALID');
  }
  return createHash('sha256').update(`${ACCOUNT_TOKEN_DIGEST_DOMAIN}\0${purpose}\0${parseVerifier(raw)}`).digest('hex');
}

export function sessionTokenDigest(raw: unknown): string {
  return createHash('sha256').update(`${SESSION_TOKEN_DIGEST_DOMAIN}\0${parseVerifier(raw)}`).digest('hex');
}
