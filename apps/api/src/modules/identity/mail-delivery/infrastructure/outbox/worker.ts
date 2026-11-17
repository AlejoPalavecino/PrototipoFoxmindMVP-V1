import { timingSafeEqual } from 'node:crypto';
import { accountTokenDigest, isObject, openAccountToken, OutboxError, validBinding,
  type AccountMailBinding, type AccountTokenEnvelope, type OutboxKeyring } from './crypto.ts';
import { ACCOUNT_MAIL_JOB_TYPE, claim, finish, type ClaimedJob, type OutboxDatabase } from './repository.ts';

import type { AccountMailSender } from '../../application/ports.ts';
export type { AccountMailSender } from '../../application/ports.ts';
export interface OutboxWorkerOptions { readonly leaseMs?: number; readonly retryBaseMs?: number }
export interface OutboxRunResult {
  readonly status: 'idle' | 'accepted' | 'discarded' | 'retry' | 'key-unavailable' | 'lease-lost';
  readonly jobId?: string;
}
const MAX_ATTEMPTS = 5;
function readPayload(job: ClaimedJob): { binding: AccountMailBinding; secret: AccountTokenEnvelope } {
  const payload = job.payload;
  if (!isObject(payload) || payload.v !== 1 ||
      Object.keys(payload).sort().join(',') !== 'expiresAt,purpose,secret,tokenId,userId,v') {
    throw new OutboxError('OUTBOX_ENVELOPE_INVALID');
  }
  const binding = { jobId: job.id, tokenId: payload.tokenId, userId: payload.userId,
    purpose: payload.purpose, expiresAt: payload.expiresAt } as AccountMailBinding;
  if (!validBinding(binding)) throw new OutboxError('OUTBOX_ENVELOPE_INVALID');
  return { binding, secret: payload.secret as AccountTokenEnvelope };
}
function sameDigest(left: string, right: string): boolean {
  return /^[a-f0-9]{64}$/.test(left) && /^[a-f0-9]{64}$/.test(right) &&
    timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
}
async function activeToken(db: OutboxDatabase, b: AccountMailBinding): Promise<{ email: string; token_hash: string } | undefined> {
  const records = await db.$queryRaw<{ email: string; token_hash: string }[]>`SELECT u.email, t.token_hash
    FROM account_tokens t JOIN users u ON u.id=t.user_id
    WHERE t.id=${b.tokenId}::uuid AND t.user_id=${b.userId}::uuid AND t.purpose::text=${b.purpose}
      AND t.expires_at=${b.expiresAt}::timestamptz AND t.expires_at>clock_timestamp()
      AND t.consumed_at IS NULL AND t.invalidated_at IS NULL`;
  return records[0];
}
async function beginAttempt(db: OutboxDatabase, job: ClaimedJob, b: AccountMailBinding, hash: string): Promise<boolean> {
  const changed = await db.$executeRaw`UPDATE background_jobs j SET attempt_count=attempt_count+1, updated_at=clock_timestamp()
    WHERE j.id=${job.id}::uuid AND j.type=${ACCOUNT_MAIL_JOB_TYPE} AND j.status='RUNNING'
      AND j.claim_token=${job.owner}::uuid AND j.claimed_until>clock_timestamp() AND j.attempt_count<${MAX_ATTEMPTS}
      AND EXISTS (SELECT 1 FROM account_tokens t WHERE t.id=${b.tokenId}::uuid
        AND t.user_id=${b.userId}::uuid AND t.purpose::text=${b.purpose} AND t.token_hash=${hash}
        AND t.expires_at=${b.expiresAt}::timestamptz AND t.expires_at>clock_timestamp()
        AND t.consumed_at IS NULL AND t.invalidated_at IS NULL)`;
  return changed === 1;
}
async function retry(db: OutboxDatabase, job: ClaimedJob, b: AccountMailBinding, delay: number,
  missingKey: boolean): Promise<OutboxRunResult['status']> {
  // A lost/expired lease cannot clear a successor's payload. Missing-key claims
  // do not increment attempts: restoring an old key can recover still-valid work.
  const rows = await db.$queryRaw<{ status: string }[]>`WITH retry_clock AS MATERIALIZED (
    SELECT clock_timestamp() AS at
  ), decision AS MATERIALIZED (
    SELECT j.id, retry_clock.at,
      ((j.attempt_count<${MAX_ATTEMPTS} OR ${missingKey})
        AND ${b.expiresAt}::timestamptz>retry_clock.at+${delay}*interval '1 millisecond'
        AND EXISTS (SELECT 1 FROM account_tokens t WHERE t.id=${b.tokenId}::uuid
          AND t.user_id=${b.userId}::uuid AND t.purpose::text=${b.purpose}
          AND t.expires_at=${b.expiresAt}::timestamptz AND t.expires_at>retry_clock.at
          AND t.consumed_at IS NULL AND t.invalidated_at IS NULL)) AS retryable
      FROM background_jobs j CROSS JOIN retry_clock
      WHERE j.id=${job.id}::uuid AND j.type=${ACCOUNT_MAIL_JOB_TYPE} AND j.status='RUNNING'
        AND j.claim_token=${job.owner}::uuid AND j.claimed_until>retry_clock.at FOR UPDATE OF j
  ) UPDATE background_jobs j SET
    status=CASE WHEN d.retryable THEN 'PENDING'::"JobStatus" ELSE 'FAILED'::"JobStatus" END,
    payload=CASE WHEN d.retryable THEN j.payload ELSE '{}'::jsonb END,
    available_at=d.at+${delay}*interval '1 millisecond',
    claimed_until=NULL, claim_token=NULL, completed_at=NULL,
    last_error_code=${missingKey ? 'KEY_UNAVAILABLE' : 'SMTP_UNAVAILABLE'}, updated_at=d.at
    FROM decision d WHERE j.id=d.id RETURNING j.status`;
  if (!rows[0]) return 'lease-lost';
  return rows[0].status === 'FAILED' ? 'discarded' : missingKey ? 'key-unavailable' : 'retry';
}

/** One bounded job, no timer/daemon. Future AuthModule owns scheduling and stop.
 * Call with a non-transactional client. SMTP occurs after every statement ends.
 * SMTP acceptance is neither user delivery nor verification, nor exactly-once.
 */
export async function runOnce(db: OutboxDatabase, ring: OutboxKeyring, sender: AccountMailSender,
  options: OutboxWorkerOptions = {}): Promise<OutboxRunResult> {
  const leaseMs = options.leaseMs ?? 30000;
  const retryBaseMs = options.retryBaseMs ?? 1000;
  if (!Number.isInteger(leaseMs) || leaseMs < 50 || leaseMs > 300000 ||
      !Number.isInteger(retryBaseMs) || retryBaseMs < 10 || retryBaseMs > 60000) {
    throw new OutboxError('OUTBOX_CONFIG_INVALID');
  }
  try {
    const job = await claim(db, leaseMs);
    if (!job) return { status: 'idle' };
    const result = (status: OutboxRunResult['status']): OutboxRunResult => ({ status, jobId: job.id });
    const discard = async (code: string): Promise<OutboxRunResult> =>
      result(await finish(db, job, false, code) ? 'discarded' : 'lease-lost');
    let b: AccountMailBinding, secret: AccountTokenEnvelope;
    try { ({ binding: b, secret } = readPayload(job)); }
    catch { return await discard('ENVELOPE_INVALID'); }
    const token = await activeToken(db, b);
    if (!token) return await discard('TOKEN_STALE');
    if (job.attempt_count >= MAX_ATTEMPTS) return await discard('ATTEMPTS_EXHAUSTED');
    let rawToken: string;
    try { rawToken = openAccountToken(ring, b, secret); }
    catch (error) {
      if (error instanceof OutboxError && error.code === 'OUTBOX_KEY_UNAVAILABLE') {
        return result(await retry(db, job, b, retryBaseMs, true));
      }
      if (error instanceof OutboxError && error.code === 'OUTBOX_CONFIG_INVALID') throw error;
      return await discard('ENVELOPE_INVALID');
    }
    try {
      const hash = accountTokenDigest(rawToken, b.purpose);
      if (!sameDigest(hash, token.token_hash)) return await discard('TOKEN_MISMATCH');
      if (!await beginAttempt(db, job, b, hash)) return await discard('TOKEN_STALE');
      let accepted = false;
      try {
        const response = b.purpose === 'EMAIL_VERIFICATION'
          ? await sender.sendVerification({ to: token.email, token: rawToken })
          : await sender.sendRecovery({ to: token.email, token: rawToken });
        accepted = response?.status === 'accepted';
      } catch { /* Do not retain sender errors or rejected inputs. */ }
      if (accepted) return result(await finish(db, job, true, null) ? 'accepted' : 'lease-lost');
      const delay = Math.min(60000, retryBaseMs * 2 ** job.attempt_count);
      return result(await retry(db, job, b, delay, false));
    } finally {
      // Strings cannot be securely zeroized in JS; release references promptly.
      rawToken = '';
    }
  } catch (error) {
    if (error instanceof OutboxError) throw error;
    throw new OutboxError('OUTBOX_STORAGE_UNAVAILABLE');
  }
}
