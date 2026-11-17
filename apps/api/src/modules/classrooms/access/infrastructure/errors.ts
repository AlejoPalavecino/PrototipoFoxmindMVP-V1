import type { IdentityHttpError } from '../../../identity/public.ts';

/** Only the trusted P3 host creates this boundary error; driver failures never become public denials. */
export class ClassroomIdentityError extends Error {
  readonly code: IdentityHttpError['code'];
  readonly status: number;
  readonly retryAfter?: number;
  constructor(error: Pick<IdentityHttpError, 'code' | 'status' | 'retryAfter'>) {
    super('Identity request rejected.');
    this.code = error.code;
    this.status = error.status;
    this.retryAfter = error.retryAfter;
  }
}
