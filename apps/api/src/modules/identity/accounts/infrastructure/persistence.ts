import { randomUUID } from 'node:crypto';
import type { Prisma } from '../../../../../../../.generated/prisma/client.ts';
import type { IdentityUserRecord as User, AuthenticatedContext } from '../../sessions/public.ts';
import type { PrismaService } from '../../../../platform/database/prisma.service.ts';
import { sessionTokenDigest } from './security/verifiers.ts';
import { IDENTITY_POLICY } from './security/sessions.ts';
import { type Budget, type IdentityConfiguration, type RateAction } from './security/configuration.ts';
import { IdentityHttpError } from '../../domain/errors.ts';
import { authenticateSession } from './session-query.ts';

export type IdentityTransaction = Prisma.TransactionClient;
export type { AuthenticatedContext } from '../../sessions/public.ts';
import type { AdmissionBucket } from '../application/ports.ts';
export type { AdmissionBucket } from '../application/ports.ts';

/** All SQL failures stop authorization; never expose driver errors or use local counters. */
export class IdentityStore {
  constructor(readonly database: PrismaService) {}
  async transaction<T>(operation: (tx: IdentityTransaction) => Promise<T>): Promise<T> {
    try { return await this.database.$transaction(operation, { maxWait: 1500, timeout: 2500 }); }
    catch (error) { if (error instanceof IdentityHttpError) throw error; throw new IdentityHttpError('SERVICE_UNAVAILABLE'); }
  }
  async now(tx: IdentityTransaction): Promise<Date> {
    const [row] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp() AS now`;
    return row.now;
  }
  /** Delivery spelling is already validated/trimmed. This exact PG rule owns future writes too. */
  async canonicalEmail(email: string, tx?: IdentityTransaction): Promise<string> {
    const run = async (client: IdentityTransaction) => {
      const [row] = await client.$queryRaw<{ canonical: string }[]>`SELECT lower(${email}::text) AS canonical`;
      return row.canonical;
    };
    return tx ? run(tx) : this.transaction(run);
  }
  async findUser(canonical: string): Promise<User | null> {
    return this.transaction(tx => tx.user.findUnique({ where: { email_normalized: canonical } }));
  }
  /** Consistent order: user UUIDs ascending, then session/token/job rows. Never hash or send under this lock. */
  async lockUsers(tx: IdentityTransaction, ids: readonly string[]): Promise<void> {
    for (const id of [...new Set(ids)].sort()) await tx.$queryRaw`SELECT id FROM users WHERE id = ${id}::uuid FOR UPDATE`;
  }
  async authenticate(verifier: string): Promise<AuthenticatedContext | null> {
    return this.transaction(tx => authenticateSession({ query: (sql, ...values) => tx.$queryRawUnsafe(sql, ...values) }, verifier));
  }
  /** Revalidate under the user mutation lock, after any wait; stateless CSRF is not authorization. */
  async activeInTransaction(tx: IdentityTransaction, context: AuthenticatedContext): Promise<boolean> {
    const now = await this.now(tx);
    const session = await tx.session.findUnique({ where: { id: context.sessionId } });
    return Boolean(session && session.user_id === context.user.id && !session.revoked_at
      && session.token_hash === sessionTokenDigest(context.verifier) && now < session.expires_at
      && now.getTime() < session.last_seen_at.getTime() + IDENTITY_POLICY.sessionIdleSeconds * 1000);
  }
  /** One short transaction, deterministic bucket lock order, saturating counters, fixed DB-time windows.
   * A denied request still consumes the other applicable attempt buckets (declared security delta).
   */
  async admit(config: IdentityConfiguration, buckets: readonly AdmissionBucket[]): Promise<void> {
    const retry = await this.transaction(async tx => {
      let wait = 0;
      const ordered = buckets.map(bucket => ({ ...bucket,
        key: config.abuseDigest(bucket.action, `${bucket.namespace}\0${bucket.subject}`),
        actionKey: `identity.v1:${bucket.action}:${bucket.namespace}`,
      })).sort((a, b) => `${a.actionKey}:${a.key}`.localeCompare(`${b.actionKey}:${b.key}`));
      for (const bucket of ordered) {
        const { limit, windowSeconds } = bucket.budget;
        // ON CONFLICT serializes across processes. SQL time is evaluated after obtaining the row lock.
        await tx.$executeRaw`INSERT INTO account_action_controls
          (id, action, subject_key, last_requested_at, window_started_at, request_count)
          VALUES (${randomUUID()}::uuid, ${bucket.actionKey}, ${bucket.key}, clock_timestamp(), clock_timestamp(), 0)
          ON CONFLICT (action, subject_key) DO NOTHING`;
        const [row] = await tx.$queryRaw<{ window_started_at: Date; request_count: number }[]>`
          SELECT window_started_at, request_count FROM account_action_controls
          WHERE action=${bucket.actionKey} AND subject_key=${bucket.key} FOR UPDATE`;
        const now = await this.now(tx);
        const expired = now.getTime() >= row.window_started_at.getTime() + windowSeconds * 1000;
        const count = expired ? 0 : row.request_count;
        const start = expired ? now : row.window_started_at;
        if (count >= limit) wait = Math.max(wait, Math.max(1, Math.ceil((start.getTime() + windowSeconds * 1000 - now.getTime()) / 1000)));
        await tx.$executeRaw`UPDATE account_action_controls SET
          request_count=${Math.min(limit, count + 1)}, window_started_at=${start}, last_requested_at=${now}, updated_at=${now}
          WHERE action=${bucket.actionKey} AND subject_key=${bucket.key}`;
      }
      return wait;
    });
    if (retry) throw new IdentityHttpError('RATE_LIMITED', retry);
  }
  async insertRegistration(tx: IdentityTransaction, input: { userId: string; email: string; canonical: string; firstName: string; lastName: string; hash: string; accountRole: 'teacher' | 'student' }) {
    const { userId, email, canonical, firstName, lastName, hash, accountRole } = input;
    return await tx.$queryRaw<{ id: string }[]>`INSERT INTO users
        (id,email,email_normalized,first_name,last_name,password_hash,account_role)
        VALUES (${userId}::uuid,${email},${canonical},${firstName},${lastName},${hash},${accountRole})
        ON CONFLICT (email_normalized) DO NOTHING RETURNING id`;
  }
  async recoveryMarker(tx: IdentityTransaction, id: string, action: string, key: string) {
    await tx.$executeRaw`INSERT INTO account_action_controls
        (id,action,subject_key,last_requested_at,window_started_at,request_count)
        VALUES (${id}::uuid,${action},${key},clock_timestamp(),clock_timestamp(),0)
        ON CONFLICT (action,subject_key) DO NOTHING`;
      const [marker] = await tx.$queryRaw<{ last_requested_at: Date; request_count: number }[]>`
        SELECT last_requested_at,request_count FROM account_action_controls
        WHERE action=${action} AND subject_key=${key} FOR UPDATE`;
      return marker;
  }
  async acceptRecovery(tx: IdentityTransaction, now: Date, action: string, key: string) {
    return await tx.$executeRaw`UPDATE account_action_controls SET last_requested_at=${now},
        window_started_at=${now},request_count=1,updated_at=${now} WHERE action=${action} AND subject_key=${key}`;
  }
  async consumeToken(tx: IdentityTransaction, snapshot: { id: string; user_id: string }, digest: string, purpose: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET') {
    if (purpose === 'EMAIL_VERIFICATION') { return await tx.$queryRaw<{ id: string }[]>`UPDATE account_tokens SET consumed_at=clock_timestamp()
        WHERE id=${snapshot.id}::uuid AND user_id=${snapshot.user_id}::uuid
          AND purpose='EMAIL_VERIFICATION' AND token_hash=${digest}
          AND expires_at>clock_timestamp() AND consumed_at IS NULL AND invalidated_at IS NULL RETURNING id`; }
    return await tx.$queryRaw<{ id: string }[]>`UPDATE account_tokens SET consumed_at=clock_timestamp()
        WHERE id=${snapshot.id}::uuid AND user_id=${snapshot.user_id}::uuid
          AND purpose='PASSWORD_RESET' AND token_hash=${digest} AND expires_at>clock_timestamp()
          AND consumed_at IS NULL AND invalidated_at IS NULL RETURNING id`;
  }
}
