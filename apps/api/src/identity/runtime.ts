import type { User } from '../../../../.generated/prisma/client.ts';
import { generateVerifier, sessionTokenDigest, newSessionWindow, validateBodyShape, validatePassword, type PasswordService } from '../identity-security/index.ts';
import { validateMailbox } from '../mail/index.ts';
import type { IdentityRuntimeConfiguration } from './configuration.ts';
import { IdentityHttpError } from './errors.ts';
import { IdentityStore, type AuthenticatedContext, type AdmissionBucket } from './persistence.ts';

export interface IdentityRuntimePorts {
  /** Trusted composition-only synchronization/observability seam; never populated from requests/environment. */
  readonly beforeCredentialCommit?: () => Promise<void>;
}
export function publicUser(user: User) {
  return { id: user.id, email: user.email, firstName: user.first_name, lastName: user.last_name, emailVerified: user.email_verified_at !== null };
}
export class IdentityRuntime {
  constructor(
    readonly configuration: IdentityRuntimeConfiguration,
    readonly store: IdentityStore,
    readonly passwords: PasswordService,
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
