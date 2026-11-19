import { randomUUID } from 'node:crypto';
import type { SqlDatabase, SqlTransaction } from '../../../../../../../src/core/contracts/sql.ts';
import { isAiBudgetRejectionCode } from '../../../../../../../src/core/contracts/ai-quota.ts';
import { parseWritingReport } from '../../../../../../../src/core/domain/grading/teacher-writing.ts';
import { activeAiOwnersSql, lockAiAdmission } from '../../../../platform/ai/admission.ts';
import type { AiConfiguration } from '../../../../platform/ai/configuration.ts';
import { bounded, usageFromAiFailure } from '../../../../platform/ai/execution.ts';
import { configurationForJob } from '../../../../platform/ai/execution-snapshot.ts';
import { readAiMonthlyBudget } from '../../../../platform/ai/monthly-budget.ts';
import { recordObservedCost } from '../../../../platform/ai/observed-cost.ts';
import { reserveAiTextBudget, settleAiTextBudget, tokenCost } from '../../../../platform/ai/text-budget.ts';
import { createTeacherWritingProvider, type TeacherWritingProvider } from './teacher-writing-provider.ts';
import { writingMember, writingSnapshot } from './teacher-writing-repository.ts';
import type { WritingJob, WritingSnapshot } from '../application/teacher-writing-ports.ts';

const table = 'teacher_writing_reports';
const noCursor = '00000000-0000-0000-0000-000000000000';

export class TeacherWritingWorker {
  private stopped = false;
  private timer?: ReturnType<typeof setTimeout>;
  private active?: Promise<boolean>;
  private nextCleanup = 0;
  private cursor = noCursor;

  constructor(private readonly database: SqlDatabase, private readonly configuration: AiConfiguration | undefined,
    private readonly override?: TeacherWritingProvider) {}

  onModuleInit() { this.schedule(); }
  async onModuleDestroy() { this.stopped = true; clearTimeout(this.timer); await this.active; }

  private schedule() {
    if (this.stopped) return;
    this.timer = setTimeout(() => { void this.runOnce().catch(() => false).finally(() => this.schedule()); }, this.configuration ? 750 : 30_000);
    this.timer.unref();
  }

  runOnce() {
    if (this.stopped) return Promise.resolve(false);
    return this.active ??= this.run().finally(() => { this.active = undefined; });
  }

  private transaction<T>(operation: (tx: SqlTransaction) => Promise<T>) {
    return this.database.$transaction(raw => operation({ query: (sql, ...args) => raw.$queryRawUnsafe(sql, ...args) }),
      { maxWait: 2000, timeout: 6000 });
  }

  private async snapshot(tx: SqlTransaction, job: WritingJob) {
    const member = await writingMember(tx, job.owner_id, job.classroom_id, job.student_id);
    if (!member || member.membership_period_id !== job.membership_period_id || member.enrollment_id !== job.enrollment_id) return null;
    const snapshot = await writingSnapshot(tx, member);
    return snapshot?.hash === job.evidence_hash ? snapshot : null;
  }

  private async cleanup() {
    if (Date.now() < this.nextCleanup) return;
    this.nextCleanup = Date.now() + 30_000;
    const configuration = this.configuration;
    await this.transaction(async tx => {
      const expired = configuration ? await tx.query<WritingJob>(`SELECT * FROM teacher_writing_reports
        WHERE state='RUNNING' AND lease_until<=clock_timestamp() ORDER BY lease_until LIMIT 10 FOR UPDATE SKIP LOCKED`) : [];
      for (const row of expired) {
        await settleAiTextBudget(tx, row, configurationForJob(configuration!, row.execution_profile, 'analysis'), undefined, table);
        await tx.query(`UPDATE teacher_writing_reports SET state='FAILED', lease_nonce=NULL,lease_until=NULL,
          error_code=CASE WHEN dispatch_count>0 THEN 'PROVIDER_OUTCOME_UNKNOWN' ELSE 'AI_TIMEOUT' END, updated_at=clock_timestamp()
          WHERE id=$1::uuid RETURNING id`, row.id);
      }
      if (!configuration) await tx.query(`WITH due AS (SELECT id FROM teacher_writing_reports
        WHERE state='RUNNING' AND lease_until<=clock_timestamp() AND reference_map<>'[]'::jsonb
        ORDER BY lease_until LIMIT 40 FOR UPDATE SKIP LOCKED)
        UPDATE teacher_writing_reports r SET reference_map='[]'::jsonb FROM due WHERE r.id=due.id RETURNING r.id`);
      await tx.query(`WITH due AS (SELECT id FROM teacher_writing_reports WHERE (state<>'RUNNING' OR lease_until<=clock_timestamp())
        AND created_at<=clock_timestamp()-interval '30 days' ORDER BY created_at LIMIT 40 FOR UPDATE SKIP LOCKED)
        DELETE FROM teacher_writing_reports r USING due WHERE r.id=due.id RETURNING r.id`);
      const candidates = await tx.query<WritingJob>(`SELECT r.*,e.student_id FROM teacher_writing_reports r
        JOIN enrollments e ON e.id=r.enrollment_id WHERE r.state='READY' AND r.id>$1::uuid ORDER BY r.id LIMIT 8`, this.cursor);
      for (const candidate of candidates) {
        if (!await this.snapshot(tx, candidate)) await this.stale(tx, candidate.id, 'READY');
      }
      this.cursor = candidates.length === 8 ? candidates.at(-1)!.id : noCursor;
    });
  }

  private stale(tx: SqlTransaction, id: string, state: 'QUEUED' | 'READY') {
    return tx.query(`UPDATE teacher_writing_reports SET state='STALE',report=NULL,reference_map='[]'::jsonb,updated_at=clock_timestamp()
      WHERE id=$1::uuid AND state=$2 RETURNING id`, id, state);
  }

  private async claim(tx: SqlTransaction, base: AiConfiguration) {
    const [queued] = await tx.query(`SELECT 1 FROM teacher_writing_reports WHERE state='QUEUED' LIMIT 1`);
    if (!queued) return null;
    await lockAiAdmission(tx);
    const [active] = await tx.query<{ count: number }>(`SELECT count(*)::int AS count FROM (${activeAiOwnersSql}) active`);
    if (active.count >= base.maxConcurrency) return null;
    const [candidate] = await tx.query<WritingJob>(`SELECT r.*,e.student_id FROM teacher_writing_reports r
      JOIN enrollments e ON e.id=r.enrollment_id WHERE r.state='QUEUED'
        AND NOT EXISTS(SELECT 1 FROM (${activeAiOwnersSql}) active WHERE active.owner_id=r.owner_id)
      ORDER BY r.created_at,r.id LIMIT 1`);
    if (!candidate) return null;
    const snapshot = await this.snapshot(tx, candidate);
    if (!snapshot) { await this.stale(tx, candidate.id, 'QUEUED'); return null; }
    const configuration = configurationForJob(base, candidate.execution_profile, 'analysis');
    const [job] = await tx.query<WritingJob>(`UPDATE teacher_writing_reports SET state='RUNNING',lease_nonce=$2::uuid,
        lease_until=clock_timestamp()+$3::bigint*interval '1 millisecond',updated_at=clock_timestamp()
      WHERE id=$1::uuid AND state='QUEUED' RETURNING *, $4::uuid AS student_id`, candidate.id, randomUUID(),
    configuration.deadlineMs + 10_000, candidate.student_id);
    return job ? { job, snapshot, configuration } : null;
  }

  private async current(tx: SqlTransaction, job: WritingJob) {
    if (!await this.snapshot(tx, job)) return false;
    const [lease] = await tx.query(`SELECT id FROM teacher_writing_reports WHERE id=$1::uuid AND lease_nonce=$2::uuid
      AND state='RUNNING' AND lease_until>clock_timestamp() FOR UPDATE`, job.id, job.lease_nonce);
    return !!lease;
  }

  private async execute(job: WritingJob, snapshot: WritingSnapshot, configuration: AiConfiguration) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), configuration.deadlineMs);
    let result: Awaited<ReturnType<TeacherWritingProvider['generateWriting']>> | undefined;
    let failure: ReturnType<typeof usageFromAiFailure>;
    let error: string | null = 'AI_UNAVAILABLE', dispatched = false;
    try {
      const provider = this.override ?? createTeacherWritingProvider(configuration);
      const input = { evidence: snapshot.evidence, signal: controller.signal };
      const allowed = await this.transaction(async tx => {
        if (!await this.current(tx, job)) return false;
        const quota = await readAiMonthlyBudget(tx, job.owner_id);
        const minimum = tokenCost(1, configuration.inputUsdPerMillion) +
          tokenCost(configuration.maxOutputTokens, configuration.outputUsdPerMillion);
        if (BigInt(quota.remainingMicrousd) < minimum) {
          throw Object.assign(new Error('AI_MONTHLY_BUDGET_EXCEEDED'), { code: 'AI_MONTHLY_BUDGET_EXCEEDED' });
        }
        return true;
      });
      if (!allowed) { error = 'STALE'; return; }
      const count = await bounded(() => provider.countWritingTokens(input), controller.signal);
      if (!Number.isSafeInteger(count) || count < 1 || count > configuration.maxInputTokens) throw new Error('AI_INPUT_LIMIT');
      const approved = await this.transaction(async tx => await this.current(tx, job)
        && await reserveAiTextBudget(tx, job, count, configuration, table, { capability: 'writing-analysis' }));
      if (!approved) { error = 'STALE'; return; }
      dispatched = true;
      result = await bounded(() => provider.generateWriting(input), controller.signal);
      parseWritingReport(result.json, snapshot.references);
      error = null;
    } catch (cause) {
      failure = usageFromAiFailure(cause);
      const code = (cause as { code?: unknown })?.code;
      const message = cause instanceof Error ? cause.message : null;
      error = isAiBudgetRejectionCode(code) ? code : message === 'AI_INPUT_LIMIT' || message === 'INVALID_AI_OUTPUT' ? message :
        dispatched ? 'PROVIDER_OUTCOME_UNKNOWN' : controller.signal.aborted ? 'AI_TIMEOUT' : 'AI_UNAVAILABLE';
    } finally {
      clearTimeout(timer);
      await this.transaction(async tx => {
        const valid = await this.current(tx, job);
        const [lease] = await tx.query(`SELECT id FROM teacher_writing_reports WHERE id=$1::uuid AND lease_nonce=$2::uuid
          AND state='RUNNING' FOR UPDATE`, job.id, job.lease_nonce);
        if (!lease) return recordObservedCost(tx, { namespace: table, jobId: job.id, ownerId: job.owner_id }, result ?? failure);
        await settleAiTextBudget(tx, job, configuration, result ?? failure, table);
        const state = !valid || error === 'STALE' ? 'STALE' : error ? 'FAILED' : 'READY';
        await tx.query(`UPDATE teacher_writing_reports SET state=$3,report=$4::jsonb,error_code=$5,lease_nonce=NULL,
          lease_until=NULL,updated_at=clock_timestamp(),reference_map=CASE WHEN $3='STALE' THEN '[]'::jsonb ELSE reference_map END
          WHERE id=$1::uuid AND lease_nonce=$2::uuid RETURNING id`, job.id, job.lease_nonce, state,
        state === 'READY' ? JSON.stringify(result!.json) : null, error);
      });
    }
  }

  private async run() {
    await this.cleanup().catch(() => undefined);
    const configuration = this.configuration;
    if (!configuration) return false;
    const work = await this.transaction(tx => this.claim(tx, configuration));
    if (!work) return false;
    await this.execute(work.job, work.snapshot, work.configuration);
    return true;
  }
}
