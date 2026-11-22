import { isAccountAvatarKey, type AccountAvatarKey } from '../../../../../../../src/core/domain/identity/account-avatar.ts';
import { validateBodyShape, validatePassword, validateName } from '../../domain/security/inputs.ts';
import { newSessionWindow, IDENTITY_POLICY } from '../../domain/session-policy.ts';
import { IdentityHttpError } from '../../domain/errors.ts';
import type { IdentityUserRecord as User, AuthenticatedContext } from '../../sessions/public.ts';
import type { IdentityApplicationConfiguration, IdentityStorePort, PasswordHasher, AdmissionBucket, IdentityApplicationDependencies } from './ports.ts';

export interface IdentityRuntimePorts {
  /** Trusted composition-only synchronization/observability seam; never populated from requests/environment. */
  readonly beforeCredentialCommit?: () => Promise<void>;
  /** After actual registration writes, inside caller-owned TX; throwing rolls everything back. */
  readonly beforeRegistrationCommit?: () => Promise<void>;
  /** After validation, before user lock; never replaces persisted authorization. */
  readonly beforeProfileCommit?: () => Promise<void>;
  /** Trusted post-hash/pre-transaction synchronization; no request/environment binding. */
  readonly beforeRecoveryCommit?: () => Promise<void>;
  /** Trusted post-hash synchronization; persisted authorization is rechecked under the user lock. */
  readonly beforePasswordChangeCommit?: () => Promise<void>;
}
export function publicUser(user: User) {
  return { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, avatarKey: user.avatar_key, emailVerified: user.email_verified_at !== null, accountRole: user.account_role as 'teacher' | 'student' };
}
export class IdentityRuntime {
  constructor(
    readonly configuration: IdentityApplicationConfiguration,
    readonly store: IdentityStorePort,
    readonly passwords: PasswordHasher,
    private readonly dependencies: IdentityApplicationDependencies,
    private readonly ports: IdentityRuntimePorts = {},
  ) {}
  async generalAdmission(ip: string, context: AuthenticatedContext | null): Promise<void> {
    const rule = this.configuration.security.rateLimits['general-identity'];
    const buckets: AdmissionBucket[] = [{ action: 'general-identity', namespace: 'ip', subject: ip, budget: rule.ip }];
    if (context && rule.session) buckets.push({ action: 'general-identity', namespace: 'session', subject: context.sessionId, budget: rule.session });
    await this.store.admit(this.configuration.security, buckets);
  }
  async login(body: unknown, ip: string, current: AuthenticatedContext | null) {
    const input = validateBodyShape(body, ['email', 'password'], ['email', 'password']);
    const deliveryEmail = this.dependencies.validateMailbox(input.email);
    const password = validatePassword(input.password);
    const canonical = await this.store.canonicalEmail(deliveryEmail);
    const rule = this.configuration.security.rateLimits.login;
    const buckets: AdmissionBucket[] = [{ action: 'login', namespace: 'ip', subject: ip, budget: rule.ip }];
    if (rule.identifier) buckets.push({ action: 'login', namespace: 'identifier', subject: canonical, budget: rule.identifier });
    await this.store.admit(this.configuration.security, buckets);
    const snapshot = await this.store.findUser(canonical);
    // Both paths do maintained, bounded Argon2 work outside any user transaction.
    const valid = snapshot ? await this.passwords.verify(password, snapshot.password_hash) : await this.passwords.dummyCheck(password);
    if (!snapshot || !valid) throw new IdentityHttpError('AUTHENTICATION_FAILED');
    await this.ports.beforeCredentialCommit?.();
    const verifier = this.dependencies.tokens.generateVerifier();
    return this.store.transaction(async tx => {
      await this.store.lockUsers(tx, [snapshot.id, ...(current ? [current.user.id] : [])]);
      const user = await tx.user.findUnique({ where: { id: snapshot.id } });
      if (!user || user.password_hash !== snapshot.password_hash || user.email_normalized !== canonical) {
        throw new IdentityHttpError('AUTHENTICATION_FAILED');
      }
      if (current && !await this.store.activeInTransaction(tx, current)) throw new IdentityHttpError('AUTHENTICATION_FAILED');
      const now = await this.store.now(tx);
      if (current) await tx.session.update({ where: { id: current.sessionId }, data: { revoked_at: now } });
      const expiresAt = new Date(newSessionWindow(now.getTime()).absoluteExpiresAt);
      // Never retarget an existing row. The verifier is digested before persistence.
      await tx.session.create({ data: { user_id: user.id, token_hash: this.dependencies.tokens.sessionTokenDigest(verifier), created_at: now, last_seen_at: now, expires_at: expiresAt } });
      // Ownership proven: release the targeted-lockout bucket so failures by others do not outlive a real login.
      await this.store.releaseIdentifierBuckets(tx, this.configuration.security, ['login'], canonical);
      return { state: { authenticated: true as const, user: publicUser(user) }, verifier, expiresAt, now };
    });
  }
  async register(body: unknown, ip: string): Promise<void> {
    const input = validateBodyShape(body, ['firstName', 'lastName', 'email', 'password', 'accountRole'], ['firstName', 'lastName', 'email', 'password', 'accountRole']);
    if (input.accountRole !== 'teacher' && input.accountRole !== 'student') throw new IdentityHttpError('VALIDATION_ERROR');
    const accountRole = input.accountRole;
    const firstName = validateName(input.firstName), lastName = validateName(input.lastName);
    const email = this.dependencies.validateMailbox(input.email), password = validatePassword(input.password);
    const canonical = await this.store.canonicalEmail(email);
    const rule = this.configuration.security.rateLimits.registration;
    const buckets: AdmissionBucket[] = [{ action: 'registration', namespace: 'ip', subject: ip, budget: rule.ip }];
    if (rule.identifier) buckets.push({ action: 'registration', namespace: 'identifier', subject: canonical, budget: rule.identifier });
    await this.store.admit(this.configuration.security, buckets);
    // Same maintained KDF work for new/existing input; never hold a transaction while hashing.
    const hash = await this.passwords.hash(password);
    await this.store.transaction(async tx => {
      const userId = this.dependencies.tokens.randomUUID();
      // Conflict is an ordinary duplicate, NOT an aborted Prisma transaction caught and reused.
      const inserted = await this.store.insertRegistration(tx, { userId, email, canonical, firstName, lastName, hash, accountRole });
      if (!inserted.length) return;
      await this.store.lockUsers(tx, [userId]);
      const now = await this.store.now(tx);
      const rawToken = this.dependencies.tokens.generateVerifier(), tokenId = this.dependencies.tokens.randomUUID();
      const expiresAt = new Date(now.getTime() + IDENTITY_POLICY.verificationTtlSeconds * 1000);
      // Token creation time is the successful-issuance cooldown anchor for T3 (duplicates never touch it).
      await tx.accountToken.create({ data: { id: tokenId, user_id: userId, purpose: 'EMAIL_VERIFICATION',
        token_hash: this.dependencies.tokens.accountTokenDigest('EMAIL_VERIFICATION', rawToken), created_at: now, expires_at: expiresAt } });
      await this.dependencies.mailOutbox.enqueue(tx, { jobId: this.dependencies.tokens.randomUUID(), tokenId, userId,
        purpose: 'EMAIL_VERIFICATION', expiresAt: expiresAt.toISOString(), rawToken });
      await this.ports.beforeRegistrationCommit?.();
    });
  }
  async confirmEmailVerification(body: unknown, ip: string, current: AuthenticatedContext | null) {
    const input = validateBodyShape(body, ['token'], ['token']);
    let digest: string;
    try { digest = this.dependencies.tokens.accountTokenDigest('EMAIL_VERIFICATION', input.token); }
    catch { throw new IdentityHttpError('VALIDATION_ERROR'); }
    const rule = this.configuration.security.rateLimits['token-redemption'];
    await this.store.admit(this.configuration.security, [{ action: 'token-redemption', namespace: 'ip', subject: ip, budget: rule.ip }]);
    return this.store.transaction(async tx => {
      // Lookup locates the mutation owner only. Nothing in this snapshot grants consumption.
      const snapshot = await tx.accountToken.findUnique({ where: { token_hash: digest } });
      if (!snapshot) throw new IdentityHttpError('LINK_INVALID');
      await this.store.lockUsers(tx, [snapshot.user_id, ...(current ? [current.user.id] : [])]);
      if (current && (current.user.id !== snapshot.user_id || !await this.store.activeInTransaction(tx, current))) {
        throw new IdentityHttpError('LINK_INVALID');
      }
      const now = await this.store.now(tx);
      // Conditional at the actual mutation instant, after lock waits; exactly one redemption wins.
      const consumed = await this.store.consumeToken(tx, snapshot, digest, 'EMAIL_VERIFICATION');
      if (consumed.length !== 1) throw new IdentityHttpError('LINK_INVALID');
      const user = await tx.user.findUnique({ where: { id: snapshot.user_id } });
      if (!user) throw new IdentityHttpError('LINK_INVALID');
      if (!user.email_verified_at) await tx.user.update({ where: { id: user.id }, data: { email_verified_at: now } });
      let rotation;
      if (current) {
        const session = await tx.session.findUniqueOrThrow({ where: { id: current.sessionId } });
        const verifier = this.dependencies.tokens.generateVerifier();
        await tx.session.update({ where: { id: session.id }, data: { revoked_at: now } });
        // Confirmation rotates the binding, but renews neither idle nor original absolute lifetime.
        await tx.session.create({ data: { user_id: user.id, token_hash: this.dependencies.tokens.sessionTokenDigest(verifier),
          created_at: session.created_at, last_seen_at: session.last_seen_at, expires_at: session.expires_at } });
        rotation = { verifier, expiresAt: session.expires_at, now };
      }
      await this.dependencies.mailOutbox.cancel(tx, snapshot.id);
      return rotation;
    });
  }
  async resendEmailVerification(body: unknown, ip: string, context: AuthenticatedContext | null): Promise<void> {
    validateBodyShape(body, []);
    if (!context) throw new IdentityHttpError('AUTH_REQUIRED');
    if (context.user.email_verified_at) throw new IdentityHttpError('EMAIL_ALREADY_VERIFIED');
    const rule = this.configuration.security.rateLimits['verification-resend'];
    const buckets: AdmissionBucket[] = [{ action: 'verification-resend', namespace: 'ip', subject: ip, budget: rule.ip }];
    if (rule.identifier) buckets.push({ action: 'verification-resend', namespace: 'identifier', subject: context.user.id, budget: rule.identifier });
    await this.store.admit(this.configuration.security, buckets);
    await this.store.transaction(async tx => {
      await this.store.lockUsers(tx, [context.user.id]);
      if (!await this.store.activeInTransaction(tx, context)) throw new IdentityHttpError('AUTH_REQUIRED');
      const user = await tx.user.findUnique({ where: { id: context.user.id } });
      if (!user) throw new IdentityHttpError('AUTH_REQUIRED');
      if (user.email_verified_at) throw new IdentityHttpError('EMAIL_ALREADY_VERIFIED');
      const now = await this.store.now(tx);
      // Keep all successful history, including consumed/invalidated proof. Attempt buckets are separate.
      const latest = await tx.accountToken.findFirst({ where: { user_id: user.id, purpose: 'EMAIL_VERIFICATION' }, orderBy: { created_at: 'desc' } });
      const cooldown = Math.max(IDENTITY_POLICY.resendMinimumSeconds, rule.cooldownSeconds ?? 60);
      const remaining = latest ? latest.created_at.getTime() + cooldown * 1000 - now.getTime() : 0;
      if (remaining > 0) throw new IdentityHttpError('RATE_LIMITED', Math.max(1, Math.ceil(remaining / 1000)));
      const previous = await tx.accountToken.findMany({ where: { user_id: user.id, purpose: 'EMAIL_VERIFICATION',
        consumed_at: null, invalidated_at: null }, orderBy: { id: 'asc' } });
      for (const token of previous) {
        await tx.accountToken.update({ where: { id: token.id }, data: { invalidated_at: now } });
      }
      const rawToken = this.dependencies.tokens.generateVerifier(), tokenId = this.dependencies.tokens.randomUUID();
      const expiresAt = new Date(now.getTime() + IDENTITY_POLICY.verificationTtlSeconds * 1000);
      await tx.accountToken.create({ data: { id: tokenId, user_id: user.id, purpose: 'EMAIL_VERIFICATION',
        token_hash: this.dependencies.tokens.accountTokenDigest('EMAIL_VERIFICATION', rawToken), created_at: now, expires_at: expiresAt } });
      await tx.session.update({ where: { id: context.sessionId }, data: { last_seen_at: now } });
      // User -> token/session -> job order, shared with consumption and the existing mail worker.
      for (const token of previous) await this.dependencies.mailOutbox.cancel(tx, token.id);
      await this.dependencies.mailOutbox.enqueue(tx, { jobId: this.dependencies.tokens.randomUUID(), tokenId, userId: user.id,
        purpose: 'EMAIL_VERIFICATION', expiresAt: expiresAt.toISOString(), rawToken });
    });
  }
  async requestPasswordRecovery(body: unknown, ip: string): Promise<void> {
    const input = validateBodyShape(body, ['email'], ['email']);
    const email = this.dependencies.validateMailbox(input.email), canonical = await this.store.canonicalEmail(email);
    const rule = this.configuration.security.rateLimits['recovery-request'];
    const buckets: AdmissionBucket[] = [{ action: 'recovery-request', namespace: 'ip', subject: ip, budget: rule.ip }];
    if (rule.identifier) buckets.push({ action: 'recovery-request', namespace: 'identifier', subject: canonical, budget: rule.identifier });
    await this.store.admit(this.configuration.security, buckets);
    // Comparable maintained work on BOTH paths, outside transactions and before account-dependent work.
    const rawToken = this.dependencies.tokens.generateVerifier();
    await this.passwords.dummyCheck(rawToken);
    const digest = this.dependencies.tokens.accountTokenDigest('PASSWORD_RESET', rawToken);
    const action = 'identity.v1:recovery-request:success';
    const key = this.configuration.security.abuseDigest('recovery-request', `success\0${canonical}`);
    await this.store.transaction(async tx => {
      // Private success history, NOT an admission bucket. Uniqueness also serializes unknown identifiers.
      const marker = await this.store.recoveryMarker(tx, this.dependencies.tokens.randomUUID(), action, key);
      // Marker -> sorted users -> tokens -> jobs. No consumption path takes this marker after users.
      const snapshot = await tx.user.findUnique({ where: { email_normalized: canonical } });
      if (snapshot) await this.store.lockUsers(tx, [snapshot.id]);
      const user = snapshot ? await tx.user.findUnique({ where: { id: snapshot.id } }) : null;
      const now = await this.store.now(tx);
      const cooldown = Math.max(IDENTITY_POLICY.resendMinimumSeconds, rule.cooldownSeconds ?? 60);
      const remaining = marker.request_count === 0 ? 0 : marker.last_requested_at.getTime() + cooldown * 1000 - now.getTime();
      if (remaining > 0) throw new IdentityHttpError('RATE_LIMITED', Math.max(1, Math.ceil(remaining / 1000)));
      const expiresAt = new Date(now.getTime() + IDENTITY_POLICY.recoveryTtlSeconds * 1000);
      if (user && user.email_normalized === canonical) {
        const previous = await tx.accountToken.findMany({ where: { user_id: user.id, purpose: 'PASSWORD_RESET',
          consumed_at: null, invalidated_at: null }, orderBy: { id: 'asc' } });
        for (const token of previous) await tx.accountToken.update({ where: { id: token.id }, data: { invalidated_at: now } });
        const tokenId = this.dependencies.tokens.randomUUID();
        await tx.accountToken.create({ data: { id: tokenId, user_id: user.id, purpose: 'PASSWORD_RESET',
          token_hash: digest, created_at: now, expires_at: expiresAt } });
        for (const token of previous) await this.dependencies.mailOutbox.cancel(tx, token.id);
        await this.dependencies.mailOutbox.enqueue(tx, { jobId: this.dependencies.tokens.randomUUID(), tokenId, userId: user.id,
          purpose: 'PASSWORD_RESET', expiresAt: expiresAt.toISOString(), rawToken });
      }
      // Unknown identifiers also commit successful acceptance; no user/token/mail is created for them.
      const changed = await this.store.acceptRecovery(tx, now, action, key);
      if (changed !== 1) throw new IdentityHttpError('SERVICE_UNAVAILABLE');
    });
  }
  async confirmPasswordRecovery(body: unknown, ip: string, current: AuthenticatedContext | null): Promise<void> {
    const input = validateBodyShape(body, ['token', 'newPassword'], ['token', 'newPassword']);
    const password = validatePassword(input.newPassword);
    let digest: string;
    try { digest = this.dependencies.tokens.accountTokenDigest('PASSWORD_RESET', input.token); }
    catch { throw new IdentityHttpError('VALIDATION_ERROR'); }
    const rule = this.configuration.security.rateLimits['token-redemption'];
    await this.store.admit(this.configuration.security, [{ action: 'token-redemption', namespace: 'ip', subject: ip, budget: rule.ip }]);
    // This snapshot locates the lock owner only; every consumption condition is checked again below.
    const snapshot = await this.store.transaction(tx => tx.accountToken.findUnique({ where: { token_hash: digest } }));
    if (!snapshot) throw new IdentityHttpError('LINK_INVALID');
    const hash = await this.passwords.hash(password);
    await this.ports.beforeRecoveryCommit?.();
    await this.store.transaction(async tx => {
      await this.store.lockUsers(tx, [snapshot.user_id, ...(current ? [current.user.id] : [])]);
      if (current && (current.user.id !== snapshot.user_id || !await this.store.activeInTransaction(tx, current))) {
        throw new IdentityHttpError('LINK_INVALID');
      }
      const consumed = await this.store.consumeToken(tx, snapshot, digest, 'PASSWORD_RESET');
      if (consumed.length !== 1) throw new IdentityHttpError('LINK_INVALID');
      const now = await this.store.now(tx);
      await tx.user.update({ where: { id: snapshot.user_id }, data: { password_hash: hash } });
      await tx.session.updateMany({ where: { user_id: snapshot.user_id, revoked_at: null }, data: { revoked_at: now } });
      const previous = await tx.accountToken.findMany({ where: { user_id: snapshot.user_id, purpose: 'PASSWORD_RESET',
        consumed_at: null, invalidated_at: null }, orderBy: { id: 'asc' } });
      for (const token of previous) await tx.accountToken.update({ where: { id: token.id }, data: { invalidated_at: now } });
      for (const tokenId of [snapshot.id, ...previous.map(token => token.id)].sort()) await this.dependencies.mailOutbox.cancel(tx, tokenId);
      // The reset proves mailbox ownership: release login/recovery identifier buckets that an outsider may have exhausted.
      const owner = await tx.user.findUnique({ where: { id: snapshot.user_id } });
      if (owner) await this.store.releaseIdentifierBuckets(tx, this.configuration.security, ['login', 'recovery-request'], owner.email_normalized);
      // The successful-request marker and verification-purpose state deliberately remain untouched.
    });
  }
  async changePassword(body: unknown, ip: string, context: AuthenticatedContext | null) {
    if (!context) throw new IdentityHttpError('AUTH_REQUIRED');
    if (!context.user.email_verified_at) throw new IdentityHttpError('EMAIL_VERIFICATION_REQUIRED');
    const input = validateBodyShape(body, ['currentPassword', 'newPassword'], ['currentPassword', 'newPassword']);
    const currentPassword = validatePassword(input.currentPassword), newPassword = validatePassword(input.newPassword);
    const rule = this.configuration.security.rateLimits['password-change'];
    const buckets: AdmissionBucket[] = [{ action: 'password-change', namespace: 'ip', subject: ip, budget: rule.ip }];
    if (rule.identifier) buckets.push({ action: 'password-change', namespace: 'identifier', subject: context.user.id, budget: rule.identifier });
    await this.store.admit(this.configuration.security, buckets);
    const snapshot = await this.store.transaction(tx => tx.user.findUnique({ where: { id: context.user.id } }));
    if (!snapshot || !await this.passwords.verify(currentPassword, snapshot.password_hash)) throw new IdentityHttpError('AUTHENTICATION_FAILED');
    const hash = await this.passwords.hash(newPassword);
    await this.ports.beforePasswordChangeCommit?.();
    const verifier = this.dependencies.tokens.generateVerifier();
    return this.store.transaction(async tx => {
      await this.store.lockUsers(tx, [context.user.id]);
      if (!await this.store.activeInTransaction(tx, context)) throw new IdentityHttpError('AUTH_REQUIRED');
      const user = await tx.user.findUnique({ where: { id: context.user.id } });
      if (!user || user.password_hash !== snapshot.password_hash) throw new IdentityHttpError('AUTHENTICATION_FAILED');
      if (!user.email_verified_at) throw new IdentityHttpError('EMAIL_VERIFICATION_REQUIRED');
      const session = await tx.session.findUniqueOrThrow({ where: { id: context.sessionId } });
      const now = await this.store.now(tx);
      await tx.user.update({ where: { id: user.id }, data: { password_hash: hash } });
      await tx.session.updateMany({ where: { user_id: user.id, revoked_at: null }, data: { revoked_at: now } });
      // Rotate all bearer/CSRF bindings without extending the original absolute lifetime.
      await tx.session.create({ data: { user_id: user.id, token_hash: this.dependencies.tokens.sessionTokenDigest(verifier),
        created_at: session.created_at, last_seen_at: now, expires_at: session.expires_at } });
      return { verifier, expiresAt: session.expires_at, now };
    });
  }
  async profile(context: AuthenticatedContext | null, ip: string, body?: unknown) {
    if (!context) throw new IdentityHttpError('AUTH_REQUIRED');
    if (!context.user.email_verified_at) throw new IdentityHttpError('EMAIL_VERIFICATION_REQUIRED');
    let firstName: string | undefined, lastName: string | undefined;
    let avatarKey: AccountAvatarKey | undefined;
    if (body !== undefined) {
      const input = validateBodyShape(body, ['firstName', 'lastName', 'avatarKey'], [], true);
      if (Object.hasOwn(input, 'firstName')) firstName = validateName(input.firstName);
      if (Object.hasOwn(input, 'lastName')) lastName = validateName(input.lastName);
      if (Object.hasOwn(input, 'avatarKey')) {
        if (!isAccountAvatarKey(input.avatarKey)) throw new IdentityHttpError('VALIDATION_ERROR');
        avatarKey = input.avatarKey;
      }
      const rule = this.configuration.security.rateLimits['profile-update'];
      const buckets: AdmissionBucket[] = [{ action: 'profile-update', namespace: 'ip', subject: ip, budget: rule.ip }];
      if (rule.identifier) buckets.push({ action: 'profile-update', namespace: 'identifier', subject: context.user.id, budget: rule.identifier });
      await this.store.admit(this.configuration.security, buckets);
    }
    await this.ports.beforeProfileCommit?.();
    return this.store.transaction(async tx => {
      await this.store.lockUsers(tx, [context.user.id]);
      if (!await this.store.activeInTransaction(tx, context)) throw new IdentityHttpError('AUTH_REQUIRED');
      let user = await tx.user.findUnique({ where: { id: context.user.id } });
      if (!user) throw new IdentityHttpError('AUTH_REQUIRED');
      if (!user.email_verified_at) throw new IdentityHttpError('EMAIL_VERIFICATION_REQUIRED');
      if (body !== undefined) user = await tx.user.update({ where: { id: user.id }, data: {
        ...(firstName === undefined ? {} : { first_name: firstName }), ...(lastName === undefined ? {} : { last_name: lastName }),
        ...(avatarKey === undefined ? {} : { avatar_key: avatarKey }),
      } });
      // Genuine authorized account activity only; absolute expires_at is deliberately untouched.
      await tx.session.update({ where: { id: context.sessionId }, data: { last_seen_at: await this.store.now(tx) } });
      return publicUser(user);
    });
  }
  async logout(context: AuthenticatedContext | null): Promise<void> {
    if (!context) return;
    await this.store.transaction(async tx => {
      await this.store.lockUsers(tx, [context.user.id]);
      if (await this.store.activeInTransaction(tx, context)) {
        await tx.session.update({ where: { id: context.sessionId }, data: { revoked_at: await this.store.now(tx) } });
      }
    });
  }
}
