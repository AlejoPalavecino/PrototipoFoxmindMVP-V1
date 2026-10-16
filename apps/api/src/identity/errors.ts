import { IdentitySecurityError } from '../identity-security/index.ts';
import { MailError } from '../mail/mail-error.ts';

export type IdentityErrorCode = 'AUTH_REQUIRED' | 'AUTHENTICATION_FAILED' | 'CSRF_INVALID'
  | 'ORIGIN_NOT_ALLOWED' | 'VALIDATION_ERROR' | 'REQUEST_TOO_LARGE' | 'MEDIA_TYPE_UNSUPPORTED'
  | 'RATE_LIMITED' | 'SERVICE_UNAVAILABLE' | 'INTERNAL_ERROR';
const statuses: Record<IdentityErrorCode, number> = {
  AUTH_REQUIRED: 401, AUTHENTICATION_FAILED: 401, CSRF_INVALID: 403, ORIGIN_NOT_ALLOWED: 403,
  VALIDATION_ERROR: 422, REQUEST_TOO_LARGE: 413, MEDIA_TYPE_UNSUPPORTED: 415,
  RATE_LIMITED: 429, SERVICE_UNAVAILABLE: 503, INTERNAL_ERROR: 500,
};
export class IdentityHttpError extends Error {
  readonly status: number;
  constructor(readonly code: IdentityErrorCode, readonly retryAfter?: number) {
    super('Identity request rejected.'); this.status = statuses[code];
  }
}
export function publicIdentityError(error: unknown): IdentityHttpError {
  if (error instanceof IdentityHttpError) return error;
  if (error instanceof IdentitySecurityError) {
    if (['VALIDATION_ERROR', 'REQUEST_TOO_LARGE', 'ORIGIN_NOT_ALLOWED'].includes(error.code)) {
      return new IdentityHttpError(error.code as IdentityErrorCode);
    }
    return new IdentityHttpError('SERVICE_UNAVAILABLE');
  }
  if (error instanceof MailError && error.code === 'MAIL_INPUT_INVALID') return new IdentityHttpError('VALIDATION_ERROR');
  return new IdentityHttpError('INTERNAL_ERROR');
}
