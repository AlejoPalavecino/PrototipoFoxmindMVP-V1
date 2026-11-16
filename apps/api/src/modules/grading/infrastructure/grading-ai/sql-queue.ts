import { activeAiOwnersSql, lockAiAdmission, noAiWorkForOwner } from '../../../../platform/ai/admission.ts';
import { randomUUID } from 'node:crypto';
import { reserveAiTextBudget as reserve, settleAiTextBudget as settle } from '../../../../platform/ai/text-budget.ts';
import type { AiConfiguration as ClassroomAiConfiguration } from '../../../../platform/ai/configuration.ts';
import type { Transaction } from '../../../classrooms/public.ts';
import type { SqlDatabase } from '../../../../../../../src/core/contracts/sql.ts';
import type { DiagnosticSink } from '../../../../../../../src/core/contracts/diagnostics.ts';
import type { GradingAiProposal } from '../../../../../../../src/core/domain/index.ts';
import type { AiExecutionSettings } from '../../../../../../../src/core/contracts/ai-execution.ts';
import { configurationForJob } from '../../../../platform/ai/execution-snapshot.ts';
type GradingAiProcessState = 'READY' | 'FAILED' | 'STALE' | 'PROVIDER_OUTCOME_UNKNOWN';

export type GradingAiConfiguration = Pick<ClassroomAiConfiguration, 'maxConcurrency' | 'deadlineMs' | 'dailyActorRequests' | 'dailyGlobalRequests'
  | 'maxOutputTokens' | 'inputUsdPerMillion' | 'outputUsdPerMillion' | 'dailyBudgetUsd'>
  & Partial<Pick<ClassroomAiConfiguration, 'model' | 'maxInputTokens' | 'apiKey' | 'backend' | 'anthropicApiKey'>> & AiExecutionSettings;

export function gradingConfigurationForJob(base: GradingAiConfiguration, snapshot: unknown): GradingAiConfiguration {
  return snapshot != null || base.executionProfiles || base.legacyExecutionProfiles
    ? configurationForJob(base, snapshot, 'grading') : base;
}
type Options = { database: SqlDatabase; configuration: GradingAiConfiguration };
export interface GradingAiLease { id: string; ownerId: string; classroomId: string; activityId: string; attemptId: string; leaseNonce: string; executionProfile?: unknown }
type Row = { id: string; owner_id: string; classroom_id: string; activity_id: string; attempt_id: string; lease_nonce: string; execution_profile?: unknown };

/** Serializes claims with the other AI capabilities; each completion is fenced by room and lease. */
export function createGradingAiSqlQueue(options: Options) {
  const transact = <T>(f: (tx: Transaction) => Promise<T>): Promise<T> => options.database.$transaction(
    raw => f({ query: (sql, ...args) => raw.$queryRawUnsafe(sql, ...args) }), { maxWait: 2000, timeout: 6000 });
  async function lockRoom(tx: Transaction, job: GradingAiLease): Promise<void> {
    await tx.query('SELECT id FROM classrooms WHERE id=$1::uuid FOR UPDATE', job.classroomId);
  }
  async function current(tx: Transaction, job: GradingAiLease, lock = true): Promise<boolean> {
    const rows = await tx.query(`SELECT j.id FROM grading_ai_jobs j JOIN classrooms c ON c.id=j.classroom_id
      JOIN users u ON u.id=j.owner_id JOIN attempts a ON a.id=j.attempt_id
      LEFT JOIN attempt_grades g ON g.attempt_id=a.id AND g.is_published=true
      WHERE j.id=$1::uuid AND j.lease_nonce=$2::uuid AND j.state='RUNNING' AND j.lease_until>clock_timestamp()
      AND c.id=$3::uuid AND c.teacher_id=j.owner_id AND c.ai_grading_enabled AND c.archived_at IS NULL
      AND c.ai_grading_epoch=j.epoch AND u.email_verified_at IS NOT NULL AND a.status='SUBMITTED' AND g.id IS NULL
      ${lock ? 'FOR UPDATE OF j' : ''}`, job.id, job.leaseNonce, job.classroomId);
    return rows.length === 1;
  }
  async function claim(): Promise<GradingAiLease | null> {
    return transact(async tx => {
      await lockAiAdmission(tx);
      const [active] = await tx.query<{ count: number }>(`SELECT count(*)::int AS count FROM (${activeAiOwnersSql}) jobs`);
      if (active!.count >= options.configuration.maxConcurrency) return null;
      const [next] = await tx.query<Row>(`SELECT j.* FROM grading_ai_jobs j JOIN classrooms c ON c.id=j.classroom_id
        JOIN users u ON u.id=j.owner_id JOIN attempts a ON a.id=j.attempt_id
        WHERE j.state='QUEUED' AND c.teacher_id=j.owner_id AND c.ai_grading_enabled AND c.archived_at IS NULL
        AND c.ai_grading_epoch=j.epoch AND u.email_verified_at IS NOT NULL AND a.status='SUBMITTED'
        AND NOT EXISTS(SELECT 1 FROM attempt_grades g WHERE g.attempt_id=j.attempt_id AND g.is_published)
        AND ${noAiWorkForOwner('j')}
        ORDER BY j.created_at,j.id LIMIT 1`);
      if (!next) return null;
      const lease = randomUUID();
      const job = { id: next.id, ownerId: next.owner_id, classroomId: next.classroom_id, activityId: next.activity_id, attemptId: next.attempt_id, leaseNonce: lease, executionProfile: next.execution_profile };
      const configuration = gradingConfigurationForJob(options.configuration, next.execution_profile);
      await lockRoom(tx, job);
      const [claimed] = await tx.query<Row>(`UPDATE grading_ai_jobs j SET state='RUNNING',lease_nonce=$2::uuid,
        lease_until=clock_timestamp()+$3::bigint*interval '1 millisecond',updated_at=clock_timestamp()
        WHERE id=$1::uuid AND state='QUEUED' AND EXISTS (SELECT 1 FROM classrooms c JOIN users u ON u.id=c.teacher_id
          WHERE c.id=j.classroom_id AND c.teacher_id=j.owner_id AND c.ai_grading_enabled AND c.archived_at IS NULL
          AND c.ai_grading_epoch=j.epoch AND u.email_verified_at IS NOT NULL) RETURNING j.*`, next.id, lease, configuration.deadlineMs + 10000);
      return claimed ? job : null;
    });
  }
  async function isCurrent(job: GradingAiLease, fence?: (tx: Transaction) => Promise<boolean>): Promise<boolean> {
    return transact(async tx => {
      await lockRoom(tx, job);
      if (!await current(tx, job)) return false;
      if (!fence) return true;
      try { return await fence(tx); } catch { return false; }
    });
  }
  async function reserveJob(job: GradingAiLease, count: number, fence?: (tx: Transaction) => Promise<boolean>): Promise<boolean> {
    if (!Number.isSafeInteger(count) || count < 1) return false;
    return transact(async tx => {
      await lockRoom(tx, job);
      if (!await current(tx, job) || (fence && !await fence(tx))) return false;
      return reserve(tx, { id: job.id, owner_id: job.ownerId }, count, gradingConfigurationForJob(options.configuration, job.executionProfile) as ClassroomAiConfiguration, 'grading_ai_jobs');
    });
  }
  async function settleJob(job: GradingAiLease): Promise<void> {
    await transact(async tx => {
      await lockRoom(tx, job);
      const [locked] = await tx.query('SELECT id FROM grading_ai_jobs WHERE id=$1::uuid AND lease_nonce=$2::uuid AND state=\'RUNNING\' FOR UPDATE', job.id, job.leaseNonce);
      if (locked) await settle(tx, { id: job.id, owner_id: job.ownerId }, gradingConfigurationForJob(options.configuration, job.executionProfile) as ClassroomAiConfiguration, undefined, 'grading_ai_jobs');
    });
  }
  async function finish(job: GradingAiLease, state: GradingAiProcessState, proposal?: GradingAiProposal,
    fence?: (tx: Transaction) => Promise<boolean>, snapshotHash?: string,
    usage?: { inputTokens: number | null; outputTokens: number | null }): Promise<void> {
    await transact(async tx => {
      await lockRoom(tx, job);
      const [locked] = await tx.query('SELECT id FROM grading_ai_jobs WHERE id=$1::uuid AND lease_nonce=$2::uuid AND state=\'RUNNING\' FOR UPDATE', job.id, job.leaseNonce);
      if (!locked) return;
      let valid = await current(tx, job, false);
      if (valid && state === 'READY' && fence) {
        try { valid = await fence(tx); } catch { valid = false; }
      }
      await settle(tx, { id: job.id, owner_id: job.ownerId }, gradingConfigurationForJob(options.configuration, job.executionProfile) as ClassroomAiConfiguration, usage, 'grading_ai_jobs');
      const status = !valid ? 'STALE' : state === 'PROVIDER_OUTCOME_UNKNOWN' || (state === 'READY' && !proposal) ? 'FAILED' : state;
      await tx.query(`UPDATE grading_ai_jobs SET state=$3,error_code=$4,proposal=$5::jsonb,lease_nonce=NULL,lease_until=NULL,
        snapshot_hash=CASE WHEN $3='READY' THEN $6 ELSE NULL END, updated_at=clock_timestamp()
        WHERE id=$1::uuid AND lease_nonce=$2::uuid RETURNING id`, job.id, job.leaseNonce, status,
      state === 'PROVIDER_OUTCOME_UNKNOWN' && valid ? state : null, status === 'READY' && proposal ? JSON.stringify(proposal) : null, snapshotHash ?? null);
    });
  }
  async function recover(): Promise<void> {
    await transact(async tx => {
      const expired = await tx.query<{ id: string; owner_id: string; dispatch_started_at: Date | null; execution_profile?: unknown }>(`SELECT id,owner_id,dispatch_started_at,execution_profile
        FROM grading_ai_jobs WHERE state='RUNNING' AND lease_until<=clock_timestamp() ORDER BY lease_until LIMIT 50 FOR UPDATE SKIP LOCKED`);
      for (const job of expired) {
        await settle(tx, job, gradingConfigurationForJob(options.configuration, job.execution_profile) as ClassroomAiConfiguration, undefined, 'grading_ai_jobs');
        await tx.query(`UPDATE grading_ai_jobs SET state='FAILED',error_code=$2,lease_nonce=NULL,lease_until=NULL,updated_at=clock_timestamp()
          WHERE id=$1::uuid RETURNING id`, job.id, job.dispatch_started_at ? 'PROVIDER_OUTCOME_UNKNOWN' : 'AI_TIMEOUT');
      }
    });
  }
  return { claim, isCurrent, reserve: reserveJob, settle: settleJob, finish, recover };
}
