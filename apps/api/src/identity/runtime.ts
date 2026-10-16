import { randomUUID } from 'node:crypto';
import { enqueueAccountMail } from '../account-mail-outbox/index.ts';
import { IdentityMailLifecycle } from './mail-lifecycle.ts';
import type { User } from '../../../../.generated/prisma/client.ts';
import { generateVerifier, sessionTokenDigest, newSessionWindow, validateBodyShape, validatePassword, validateName, accountTokenDigest, IDENTITY_POLICY, type PasswordService } from '../identity-security/index.ts';
import { validateMailbox } from '../mail/index.ts';
import type { IdentityRuntimeConfiguration } from './configuration.ts';
import { IdentityHttpError } from './errors.ts';
import { IdentityStore, type AuthenticatedContext, type AdmissionBucket } from './persistence.ts';

export interface IdentityRuntimePorts {
  /** Trusted composition-only synchronization/observability seam; never populated from requests/environment. */
  readonly beforeCredentialCommit?: () => Promise<void>;
  /** After actual registration writes, inside caller-owned TX; throwing rolls everything back. */
  readonly beforeRegistrationCommit?: () => Promise<void>;
  /** After validation, before user lock; never replaces persisted authorization. */
  readonly beforeProfileCommit?: () => Promise<void>;
}
export function publicUser(user: User) {
  return { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, emailVerified: user.email_verified_at !== null };
}
export class IdentityRuntime {
  private readonly mail: IdentityMailLifecycle;
  constructor(
    readonly configuration: IdentityRuntimeConfiguration,
    readonly store: IdentityStore,
    readonly passwords: PasswordService,
    private readonly ports: IdentityRuntimePorts = {},
  ) { this.mail = new IdentityMailLifecycle(configuration, store); }
  onApplicationBootstrap(): void { this.mail.start(); }
  stopMail(): Promise<void> { return this.mail.stop(); }
  shutdownMail(): Promise<void> { return this.mail.close(); }
  onModuleDestroy(): Promise<void> { return this.shutdownMail(); }
  async generalAdmission(ip: string, context: AuthenticatedContext | null): Promise<void> {
    const rule = this.configuration.security.rateLimits['general-identity'];
    const buckets: AdmissionBucket[] = [{ action: 'general-identity', namespace: 'ip', subject: ip, budget: rule.ip }];
    if (context && rule.session) buckets.push({ action: 'general-identity', namespace: 'session', subject: context.sessionId, budget: rule.session });
    await this.store.admit(this.configuration.security, buckets);
  }
  async login(body: unknown, ip: string, current: AuthenticatedContext | null) {
    const input = validateBodyShape(body, ['email', 'password'], ['email', 'password']);
    const deliveryEmail = validateMailbox(input.email);
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
    const verifier = generateVerifier();
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
      await tx.session.create({ data: { user_id: user.id, token_hash: sessionTokenDigest(verifier), created_at: now, last_seen_at: now, expires_at: expiresAt } });
      return { state: { authenticated: true as const, user: publicUser(user) }, verifier, expiresAt, now };
    });
  }
  async register(body: unknown, ip: string): Promise<void> {
    const input = validateBodyShape(body, ['firstName', 'lastName', 'email', 'password'], ['firstName', 'lastName', 'email', 'password']);
    const firstName = validateName(input.firstName), lastName = validateName(input.lastName);
    const email = validateMailbox(input.email), password = validatePassword(input.password);
    const canonical = await this.store.canonicalEmail(email);
    const rule = this.configuration.security.rateLimits.registration;
    const buckets: AdmissionBucket[] = [{ action: 'registration', namespace: 'ip', subject: ip, budget: rule.ip }];
    if (rule.identifier) buckets.push({ action: 'registration', namespace: 'identifier', subject: canonical, budget: rule.identifier });
    await this.store.admit(this.configuration.security, buckets);
    // Same maintained KDF work for new/existing input; never hold a transaction while hashing.
    const hash = await this.passwords.hash(password);
    await this.store.transaction(async tx => {
      const userId = randomUUID();
      // Conflict is an ordinary duplicate, NOT an aborted Prisma transaction caught and reused.
      const inserted = await tx.$queryRaw<{ id: string }[]>`INSERT INTO users
        (id,email,email_normalized,first_name,last_name,password_hash)
        VALUES (${userId}::uuid,${email},${canonical},${firstName},${lastName},${hash})
        ON CONFLICT (email_normalized) DO NOTHING RETURNING id`;
      if (!inserted.length) return;
      await this.store.lockUsers(tx, [userId]);
      const now = await this.store.now(tx);
      const rawToken = generateVerifier(), tokenId = randomUUID();
      const expiresAt = new Date(now.getTime() + IDENTITY_POLICY.verificationTtlSeconds * 1000);
      // Token creation time is the successful-issuance cooldown anchor for T3 (duplicates never touch it).
      await tx.accountToken.create({ data: { id: tokenId, user_id: userId, purpose: 'EMAIL_VERIFICATION',
        token_hash: accountTokenDigest('EMAIL_VERIFICATION', rawToken), created_at: now, expires_at: expiresAt } });
      await enqueueAccountMail(tx, this.configuration.outbox, { jobId: randomUUID(), tokenId, userId,
        purpose: 'EMAIL_VERIFICATION', expiresAt: expiresAt.toISOString(), rawToken });
      await this.ports.beforeRegistrationCommit?.();
    });
  }
  async profile(context: AuthenticatedContext | null, ip: string, body?: unknown) {
    if (!context) throw new IdentityHttpError('AUTH_REQUIRED');
    if (!context.user.email_verified_at) throw new IdentityHttpError('EMAIL_VERIFICATION_REQUIRED');
    let firstName: string | undefined, lastName: string | undefined;
    if (body !== undefined) {
      const input = validateBodyShape(body, ['firstName', 'lastName'], [], true);
      if (Object.hasOwn(input, 'firstName')) firstName = validateName(input.firstName);
      if (Object.hasOwn(input, 'lastName')) lastName = validateName(input.lastName);
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
