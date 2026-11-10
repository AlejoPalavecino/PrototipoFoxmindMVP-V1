export type SecurityErrorCode =
  | 'IDENTITY_CONFIG_INVALID' | 'VALIDATION_ERROR' | 'REQUEST_TOO_LARGE'
  | 'VERIFIER_INVALID' | 'ORIGIN_NOT_ALLOWED' | 'SESSION_INVALID'
  | 'PASSWORD_CAPACITY_EXCEEDED' | 'PASSWORD_OPERATION_FAILED';

/** Deliberately carries no submitted input, underlying cause or library error. */
export class IdentitySecurityError extends Error {
  constructor(readonly code: SecurityErrorCode) {
    super('Identity security operation rejected.');
    this.name = 'IdentitySecurityError';
  }
}
