import type { IdentityHttpError, IdentityErrorCode } from '../../identity/public.ts';

/** Trusted host rejection, kept separate from driver errors and file policy failures. */
export class FileIdentityError extends Error {
  readonly code: IdentityErrorCode;
  readonly status: number;
  readonly retryAfter?: number;
  constructor(error: Pick<IdentityHttpError, 'code' | 'status' | 'retryAfter'>) {
    super('Identity request rejected.');
    this.code = error.code; this.status = error.status; this.retryAfter = error.retryAfter;
  }
}
