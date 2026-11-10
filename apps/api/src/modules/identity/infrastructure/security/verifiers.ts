import { parseVerifier } from '../../domain/verifier-format.ts';
export { parseVerifier } from '../../domain/verifier-format.ts';
import { createHash, randomBytes } from 'node:crypto';
import { ACCOUNT_TOKEN_DIGEST_DOMAIN, SESSION_TOKEN_DIGEST_DOMAIN } from '../../domain/digest-domains.ts';
import { IdentitySecurityError } from '../../domain/security/errors.ts';

export type AccountTokenPurpose = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';

export function generateVerifier(): string {
  return randomBytes(32).toString('base64url');
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
