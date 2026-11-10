import type { AuthenticatedContext, IdentityUserRecord } from './session-contracts.ts';

export interface Budget { readonly limit: number; readonly windowSeconds: number }
export interface RateRule { readonly ip: Budget; readonly identifier?: Budget; readonly session?: Budget; readonly cooldownSeconds?: number }
export type RateAction = 'registration' | 'login' | 'recovery-request' | 'verification-resend' | 'token-redemption' | 'password-change' | 'profile-update' | 'general-identity';
export type RateLimits = Readonly<Record<RateAction, RateRule>>;
export interface IdentitySecurityConfiguration {
  readonly origin: string; readonly secureCookies: boolean; readonly trustedProxyCidrs: readonly string[];
  readonly rateLimits: RateLimits;
  assertOrigin(origin: unknown): void;
  csrfToken(sessionVerifier: unknown): string;
  validateCsrf(sessionVerifier: unknown, submitted: unknown): boolean;
  abuseDigest(action: RateAction, identifier: string): string;
}
export interface IdentityApplicationConfiguration { readonly security: IdentitySecurityConfiguration }
export interface AdmissionBucket { readonly action: RateAction; readonly namespace: 'ip' | 'identifier' | 'session'; readonly subject: string; readonly budget: Budget }
export interface PasswordHasher { hash(password: string): Promise<string>; verify(password: string, hash: string): Promise<boolean>; dummyCheck(password: string): Promise<boolean> }
export type AccountTokenPurpose = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';
export interface TokenCodec { generateVerifier(): string; randomUUID(): string; sessionTokenDigest(raw: unknown): string; accountTokenDigest(purpose: AccountTokenPurpose, raw: unknown): string }
export interface AccountTokenRecord { id: string; user_id: string; purpose: AccountTokenPurpose; token_hash: string; created_at: Date; expires_at: Date; consumed_at: Date | null; invalidated_at: Date | null }
export interface IdentitySessionRecord { id: string; user_id: string; token_hash: string; created_at: Date; last_seen_at: Date; expires_at: Date; revoked_at: Date | null }
type UserKey = { id: string } | { email_normalized: string };
type TokenKey = { id: string } | { token_hash: string };
type UserChange = Partial<Pick<IdentityUserRecord, 'first_name' | 'last_name' | 'avatar_key' | 'password_hash' | 'email_verified_at'>>;
/** Operations available inside the exact transaction admitted by the store. No driver or SQL capabilities escape. */
export interface IdentityTransactionPort {
  readonly user: {
    findUnique(input: { where: UserKey }): Promise<IdentityUserRecord | null>;
    update(input: { where: { id: string }; data: UserChange }): Promise<IdentityUserRecord>;
  };
  readonly session: {
    findUniqueOrThrow(input: { where: { id: string } }): Promise<IdentitySessionRecord>;
    update(input: { where: { id: string }; data: Partial<Pick<IdentitySessionRecord, 'revoked_at' | 'last_seen_at'>> }): Promise<unknown>;
    updateMany(input: { where: { user_id: string; revoked_at: null }; data: { revoked_at: Date } }): Promise<unknown>;
    create(input: { data: Pick<IdentitySessionRecord, 'user_id' | 'token_hash' | 'created_at' | 'last_seen_at' | 'expires_at'> }): Promise<unknown>;
  };
  readonly accountToken: {
    findUnique(input: { where: TokenKey }): Promise<AccountTokenRecord | null>;
    findFirst(input: { where: { user_id: string; purpose: AccountTokenPurpose }; orderBy: { created_at: 'desc' } }): Promise<AccountTokenRecord | null>;
    findMany(input: { where: { user_id: string; purpose: AccountTokenPurpose; consumed_at: null; invalidated_at: null }; orderBy: { id: 'asc' } }): Promise<AccountTokenRecord[]>;
    create(input: { data: Pick<AccountTokenRecord, 'id' | 'user_id' | 'purpose' | 'token_hash' | 'created_at' | 'expires_at'> }): Promise<unknown>;
    update(input: { where: { id: string }; data: { invalidated_at: Date } }): Promise<unknown>;
  };
}
export interface IdentityStorePort {
  transaction<T>(run: (tx: IdentityTransactionPort) => Promise<T>): Promise<T>;
  now(tx: IdentityTransactionPort): Promise<Date>;
  canonicalEmail(email: string): Promise<string>;
  findUser(canonical: string): Promise<IdentityUserRecord | null>;
  lockUsers(tx: IdentityTransactionPort, ids: readonly string[]): Promise<void>;
  authenticate(verifier: string): Promise<AuthenticatedContext | null>;
  activeInTransaction(tx: IdentityTransactionPort, context: AuthenticatedContext): Promise<boolean>;
  admit(config: IdentitySecurityConfiguration, buckets: readonly AdmissionBucket[]): Promise<void>;
  insertRegistration(tx: IdentityTransactionPort, input: { userId: string; email: string; canonical: string; firstName: string; lastName: string; hash: string; accountRole: 'teacher' | 'student' }): Promise<{ id: string }[]>;
  consumeToken(tx: IdentityTransactionPort, snapshot: AccountTokenRecord, digest: string, purpose: AccountTokenPurpose): Promise<{ id: string }[]>;
  recoveryMarker(tx: IdentityTransactionPort, id: string, action: string, key: string): Promise<{ last_requested_at: Date; request_count: number }>;
  acceptRecovery(tx: IdentityTransactionPort, now: Date, action: string, key: string): Promise<number>;
}
export interface AccountMailInput { jobId: string; tokenId: string; userId: string; purpose: AccountTokenPurpose; expiresAt: string; rawToken: string }
export interface AccountMailOutbox {
  enqueue(tx: IdentityTransactionPort, input: AccountMailInput): Promise<void>;
  cancel(tx: IdentityTransactionPort, tokenId: string): Promise<void>;
}
export interface IdentityMailLifecyclePort { start(): void; stop(): Promise<void>; close(): Promise<void> }
export type ValidateMailbox = (input: unknown) => string;
export interface IdentityApplicationDependencies {
  readonly tokens: TokenCodec;
  readonly mailOutbox: AccountMailOutbox;
  readonly validateMailbox: ValidateMailbox;
  readonly mail: IdentityMailLifecyclePort;
}
