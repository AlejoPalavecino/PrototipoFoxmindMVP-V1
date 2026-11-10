/** Session/account projection consumed by authorization, independent of the persistence driver. */
export interface IdentityUserRecord {
  id: string; email: string; email_normalized: string; account_role: string;
  first_name: string; last_name: string; avatar_key: string; password_hash: string;
  email_verified_at: Date | null; created_at: Date; updated_at: Date;
}
export interface AuthenticatedContext {
  readonly sessionId: string;
  readonly user: IdentityUserRecord;
  readonly verifier: string;
  readonly absoluteExpiresAt: Date;
}
/** Caller-owned transaction, reused when authenticating file/domain operations. */
export interface SessionQuery {
  query<T = Record<string, unknown>>(sql: string, ...values: unknown[]): Promise<T[]>;
}
