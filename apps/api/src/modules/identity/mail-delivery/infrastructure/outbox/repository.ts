import { randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient } from '../../../../../../../../.generated/prisma/client.ts';
import { accountTokenDigest, isUuid, OutboxError, sealAccountToken, validBinding,
  type AccountMailBinding, type OutboxKeyring } from './crypto.ts';

export const ACCOUNT_MAIL_JOB_TYPE = 'ACCOUNT_MAIL_V1';
export type OutboxDatabase = Pick<PrismaClient, '$queryRaw' | '$executeRaw'>;
export interface EnqueueAccountMailInput extends AccountMailBinding { readonly rawToken: string }

/** Caller owns commit/rollback, user/token/cooldown mutations and lock order.
 * Acquires the same user mutation lock (user before token/job); never starts or
 * commits an independent transaction. No recipient is copied into the payload.
 */
export async function enqueueAccountMail(tx: Prisma.TransactionClient, ring: OutboxKeyring,
  input: EnqueueAccountMailInput): Promise<{ readonly jobId: string }> {
  if (!validBinding(input)) throw new OutboxError('OUTBOX_TOKEN_INVALID');
  // Copy validated primitives before waiting on database locks. Caller mutation
  // must not change persisted metadata after the envelope has been authenticated.
  const binding: AccountMailBinding = { jobId: input.jobId, tokenId: input.tokenId,
    userId: input.userId, purpose: input.purpose, expiresAt: input.expiresAt };
  const hash = accountTokenDigest(input.rawToken, binding.purpose);
  const secret = sealAccountToken(ring, binding, input.rawToken);
  try {
    await tx.$queryRaw`SELECT id FROM users WHERE id=${binding.userId}::uuid FOR UPDATE`;
    const active = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM account_tokens
      WHERE id=${binding.tokenId}::uuid AND user_id=${binding.userId}::uuid
        AND purpose::text=${binding.purpose} AND token_hash=${hash}
        AND expires_at=${binding.expiresAt}::timestamptz AND expires_at>clock_timestamp()
        AND consumed_at IS NULL AND invalidated_at IS NULL`;
    if (active.length !== 1) throw new OutboxError('OUTBOX_TOKEN_INVALID');
    await tx.backgroundJob.create({ data: {
      id: binding.jobId, type: ACCOUNT_MAIL_JOB_TYPE, deduplication_key: `${ACCOUNT_MAIL_JOB_TYPE}:${binding.tokenId}`,
      payload: { v: 1, tokenId: binding.tokenId, userId: binding.userId, purpose: binding.purpose,
        expiresAt: binding.expiresAt, secret: { ...secret } },
    } });
    return { jobId: binding.jobId };
  } catch (error) {
    if (error instanceof OutboxError) throw error;
    throw new OutboxError('OUTBOX_STORAGE_UNAVAILABLE');
  }
}

/** Use in the SAME transaction as consumption/invalidation. In-flight SMTP may
 * already be accepted, but cancelling its lease prevents stale DB completion.
 */
export async function cancelAccountMailForToken(tx: Prisma.TransactionClient, tokenId: string): Promise<number> {
  if (!isUuid(tokenId)) throw new OutboxError('OUTBOX_TOKEN_INVALID');
  try {
    return await tx.$executeRaw`UPDATE background_jobs SET status='FAILED', payload='{}'::jsonb,
      claimed_until=NULL, claim_token=NULL, completed_at=NULL, last_error_code='TOKEN_CANCELLED', updated_at=clock_timestamp()
      WHERE type=${ACCOUNT_MAIL_JOB_TYPE} AND payload->>'tokenId'=${tokenId}
        AND status IN ('PENDING', 'RUNNING')`;
  } catch { throw new OutboxError('OUTBOX_STORAGE_UNAVAILABLE'); }
}

export interface ClaimedJob {
  readonly id: string;
  readonly payload: unknown;
  readonly attempt_count: number;
  readonly owner: string;
}
export async function claim(db: OutboxDatabase, leaseMs: number): Promise<ClaimedJob | undefined> {
  const owner = randomUUID();
  // One short parameterized statement. Row lock is released before any SMTP.
  const jobs = await db.$queryRaw<Omit<ClaimedJob, 'owner'>[]>`WITH candidate AS (
    SELECT id FROM background_jobs WHERE type=${ACCOUNT_MAIL_JOB_TYPE} AND (
      (status='PENDING' AND available_at<=clock_timestamp()) OR
      (status='RUNNING' AND claimed_until<=clock_timestamp()))
    ORDER BY available_at, created_at, id FOR UPDATE SKIP LOCKED LIMIT 1
  ) UPDATE background_jobs AS job SET status='RUNNING', claim_token=${owner}::uuid,
    claimed_until=clock_timestamp()+${leaseMs}*interval '1 millisecond', updated_at=clock_timestamp()
    FROM candidate WHERE job.id=candidate.id RETURNING job.id, job.payload, job.attempt_count`;
  return jobs[0] && { ...jobs[0], owner };
}
export async function finish(db: OutboxDatabase, job: ClaimedJob, accepted: boolean, code: string | null): Promise<boolean> {
  const changed = await db.$executeRaw`UPDATE background_jobs SET
    status=${accepted ? 'COMPLETED' : 'FAILED'}::"JobStatus", payload='{}'::jsonb,
    claimed_until=NULL, claim_token=NULL, completed_at=CASE WHEN ${accepted} THEN clock_timestamp() ELSE NULL END,
    last_error_code=${code}, updated_at=clock_timestamp()
    WHERE id=${job.id}::uuid AND type=${ACCOUNT_MAIL_JOB_TYPE} AND status='RUNNING'
      AND claim_token=${job.owner}::uuid AND claimed_until>clock_timestamp()`;
  return changed === 1;
}
