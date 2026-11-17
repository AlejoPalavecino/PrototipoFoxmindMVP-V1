import type { IdentitySecurityConfiguration as IdentityConfiguration } from '../application/ports.ts';
import { IdentitySecurityError } from '../../domain/security/errors.ts';
import { parseVerifier } from '../../domain/verifier-format.ts';

const timestamp = (value: number): boolean => Number.isSafeInteger(value) && value >= 0;
function cookieScope(config: Pick<IdentityConfiguration, 'secureCookies'>): string {
  return `Path=/; HttpOnly; SameSite=Lax${config.secureCookies ? '; Secure' : ''}`;
}
export function sessionCookie(
  config: Pick<IdentityConfiguration, 'secureCookies'>, raw: unknown, absoluteExpiresAt: number, now: number,
): string {
  const verifier = parseVerifier(raw);
  if (!timestamp(absoluteExpiresAt) || !timestamp(now) || absoluteExpiresAt <= now) {
    throw new IdentitySecurityError('SESSION_INVALID');
  }
  const seconds = Math.min(43200, Math.floor((absoluteExpiresAt - now) / 1000));
  return `foxmind_session=${verifier}; ${cookieScope(config)}; Max-Age=${seconds}`;
}
export function clearSessionCookie(config: Pick<IdentityConfiguration, 'secureCookies'>): string {
  return `foxmind_session=; ${cookieScope(config)}; Max-Age=0`;
}
