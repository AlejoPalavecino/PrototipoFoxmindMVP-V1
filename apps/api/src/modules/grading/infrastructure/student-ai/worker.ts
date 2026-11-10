import { activeAiOwnersSql, lockAiAdmission } from '../../../../platform/ai/admission.ts';
import { randomUUID } from 'node:crypto';
import { validateStudentAiReport, type StudentAiEvidence } from '../../../../../../../src/core/domain/index.ts';
import type { Transaction } from '../../../classrooms/public.ts';
import type { SqlDatabase } from '../../../../../../../src/core/contracts/sql.ts';
import type { DiagnosticSink } from '../../../../../../../src/core/contracts/diagnostics.ts';
import type { ProgressService } from '../../application/progress.ts';
import type { AiConfiguration as ClassroomAiConfiguration } from '../../../../platform/ai/configuration.ts';
import { reserveAiTextBudget as reserve, settleAiTextBudget as settle } from '../../../../platform/ai/text-budget.ts';
import { bounded } from '../../../../platform/ai/execution.ts';
import { studentSnapshot, sameReferences, type StudentProgress, type StudentSnapshot } from './snapshot.ts';

type ProviderInput = { evidence: StudentAiEvidence; signal: AbortSignal };
export interface StudentAiProvider {
  countStudentAiTokens(input: ProviderInput): Promise<number>;
  generateStudentAi(input: ProviderInput): Promise<{ json: unknown; inputTokens: number | null; outputTokens: number | null }>;
}
export type StudentAiAccess = { database: SqlDatabase; progressView: ProgressService['progressView'] };
type Options = StudentAiAccess & { configuration: ClassroomAiConfiguration; provider: StudentAiProvider };
type Member = { enrollment_id: string; classroom_id: string; student_id: string; owner_id: string };
type Job = Member & { id: string; evidence_hash: string; lease_nonce: string; dispatch_count: number };

export class StudentAiWorker {
  private stopped = false;
  private cursor = '00000000-0000-0000-0000-000000000000';
  private timer?: ReturnType<typeof setTimeout>;
  private active?: Promise<boolean>;
  private readonly options: Options;
  constructor(options: Options) { this.options = options; }
  onModuleInit(): void { this.poll(); }
  private poll(): void {
    if (this.stopped) return;
    this.timer = setTimeout(() => { void this.runOnce().catch(() => false).finally(() => this.poll()); }, 30000);
    this.timer.unref();
  }
  async onModuleDestroy(): Promise<void> { this.stopped = true; clearTimeout(this.timer); await this.active; }
  runOnce(): Promise<boolean> {
    if (this.stopped) return Promise.resolve(false);
    if (this.active) return this.active;
    this.active = this.run().finally(() => { this.active = undefined; });
    return this.active;
  }
  private transaction<T>(fn: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.options.database.$transaction(raw => fn({ query: (sql, ...args) => raw.$queryRawUnsafe(sql, ...args) }),
      { maxWait: 2000, timeout: 6000 });
  }
  private async snapshot(tx: Transaction, member: Member): Promise<StudentSnapshot | null> {
    const progress = await this.options.progressView(tx, member.classroom_id, member.student_id);
    return studentSnapshot(progress as StudentProgress);
  }
  private async recover(): Promise<void> {
    await this.transaction(async tx => {
      const expired = await tx.query<Job>(`SELECT * FROM student_ai_reports WHERE state='RUNNING'
        AND lease_until<=clock_timestamp() ORDER BY lease_until LIMIT 50 FOR UPDATE SKIP LOCKED`);
      for (const job of expired) {
        await settle(tx, job, this.options.configuration, undefined, 'student_ai_reports');
        await tx.query(`UPDATE student_ai_reports SET state='FAILED',error_code=CASE WHEN dispatch_started_at IS NULL
          THEN 'AI_TIMEOUT' ELSE 'PROVIDER_OUTCOME_UNKNOWN' END,lease_nonce=NULL,lease_until=NULL,
          updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id`, job.id);
      }
    });
  }
  private async run(): Promise<boolean> {
    await this.recover();
    const fetchMembers = () => this.transaction(tx => tx.query<Member>(`SELECT e.id AS enrollment_id,e.classroom_id,e.student_id,c.teacher_id AS owner_id
      FROM enrollments e JOIN classrooms c ON c.id=e.classroom_id
      JOIN users teacher ON teacher.id=c.teacher_id AND teacher.email_verified_at IS NOT NULL
      JOIN membership_periods m ON m.enrollment_id=e.id AND m.ended_at IS NULL
      WHERE c.archived_at IS NULL AND e.id>$1::uuid ORDER BY e.id LIMIT 50`, this.cursor));
    let members = await fetchMembers();
    if (!members.length) { this.cursor = '00000000-0000-0000-0000-000000000000'; members = await fetchMembers(); }
    for (const member of members) {
      this.cursor = member.enrollment_id;
      const selected = await this.transaction(tx => this.claim(tx, member));
      if (selected) { await this.execute(selected.job, selected.evidence); return true; }
    }
    return false;
  }
  private async claim(tx: Transaction, member: Member): Promise<{job: Job; evidence: StudentAiEvidence} | null> {
    await lockAiAdmission(tx);
    const [active] = await tx.query<{ count: number; owner_busy: boolean }>(`SELECT count(*)::int AS count,
      COALESCE(bool_or(owner_id=$1::uuid),false) AS owner_busy FROM (${activeAiOwnersSql}) jobs`, member.owner_id);
    if (active!.count >= this.options.configuration.maxConcurrency || active!.owner_busy) return null;
    const [locked] = await tx.query(`SELECT c.id FROM classrooms c JOIN users teacher ON teacher.id=c.teacher_id
      AND teacher.email_verified_at IS NOT NULL JOIN enrollments e ON e.classroom_id=c.id
      JOIN membership_periods m ON m.enrollment_id=e.id AND m.ended_at IS NULL
      WHERE c.id=$1::uuid AND e.id=$2::uuid AND c.teacher_id=$3::uuid AND c.archived_at IS NULL FOR UPDATE OF c`,
    member.classroom_id, member.enrollment_id, member.owner_id);
    if (!locked) return null;
    const snapshot = await this.snapshot(tx, member);
    if (!snapshot) return null;
    const digest = snapshot.hash, id = randomUUID(), nonce = randomUUID();
    const [job] = await tx.query<Job>(`INSERT INTO student_ai_reports(id,enrollment_id,classroom_id,owner_id,evidence_hash,state,lease_nonce,lease_until,reference_map)
      VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,'RUNNING',$6::uuid,clock_timestamp()+$7::bigint*interval '1 millisecond',$9::jsonb)
      ON CONFLICT(enrollment_id,evidence_hash) DO UPDATE SET state='RUNNING',lease_nonce=EXCLUDED.lease_nonce,
      lease_until=EXCLUDED.lease_until,attempt_count=student_ai_reports.attempt_count+
        CASE WHEN student_ai_reports.error_code='AI_BUDGET_EXCEEDED' THEN 0 ELSE 1 END,error_code=NULL,updated_at=clock_timestamp()
      WHERE student_ai_reports.state='FAILED' AND student_ai_reports.dispatch_count=0
      AND (student_ai_reports.error_code='AI_BUDGET_EXCEEDED' OR student_ai_reports.attempt_count<3)
      AND student_ai_reports.updated_at + CASE WHEN student_ai_reports.error_code='AI_BUDGET_EXCEEDED'
        THEN interval '24 hours' ELSE interval '1 minute' END <= clock_timestamp()
      RETURNING *, $8::uuid AS student_id`, id, member.enrollment_id,
    member.classroom_id, member.owner_id, digest, nonce, this.options.configuration.deadlineMs + 10000, member.student_id,
    JSON.stringify(snapshot.references));
    return job ? { job, evidence: snapshot.evidence } : null;
  }
  private async current(tx: Transaction, job: Job, evidence: StudentAiEvidence): Promise<boolean> {
    const [member] = await tx.query(`SELECT c.id FROM classrooms c JOIN users teacher ON teacher.id=c.teacher_id
      AND teacher.email_verified_at IS NOT NULL JOIN enrollments e ON e.classroom_id=c.id
      JOIN membership_periods m ON m.enrollment_id=e.id AND m.ended_at IS NULL
      WHERE c.id=$1::uuid AND c.teacher_id=$2::uuid AND c.archived_at IS NULL AND e.id=$3::uuid
      AND e.student_id=$4::uuid FOR UPDATE OF c`, job.classroom_id, job.owner_id, job.enrollment_id, job.student_id);
    if (!member) return false;
    const [lease] = await tx.query<{ reference_map: unknown }>(`SELECT reference_map FROM student_ai_reports WHERE id=$1::uuid AND lease_nonce=$2::uuid
      AND state='RUNNING' AND lease_until>clock_timestamp() FOR UPDATE`, job.id, job.lease_nonce);
    if (!lease) return false;
    const current = await this.snapshot(tx, job);
    return !!current && current.hash === job.evidence_hash && sameReferences(current, lease.reference_map)
      && JSON.stringify(current.evidence) === JSON.stringify(evidence);
  }
  private async execute(job: Job, evidence: StudentAiEvidence): Promise<void> {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), this.options.configuration.deadlineMs);
    let result: Awaited<ReturnType<StudentAiProvider['generateStudentAi']>> | undefined;
    let error = 'AI_UNAVAILABLE', dispatched = false;
    try {
      const input = { evidence, signal: controller.signal };
      if (!await this.transaction(tx => this.current(tx, job, evidence))) { error = 'STALE'; return; }
      const count = await bounded(() => this.options.provider.countStudentAiTokens(input), controller.signal);
      if (!Number.isSafeInteger(count) || count < 1 || count > this.options.configuration.maxInputTokens) throw new Error('AI_INPUT_LIMIT');
      const approved = await this.transaction(async tx => await this.current(tx, job, evidence)
        && await reserve(tx, job, count, this.options.configuration, 'student_ai_reports'));
      if (!approved) { error = 'AI_BUDGET_EXCEEDED'; return; }
      dispatched = true;
      result = await bounded(() => this.options.provider.generateStudentAi(input), controller.signal);
      validateStudentAiReport(result.json, evidence);
      error = '';
    } catch { error = dispatched ? 'PROVIDER_OUTCOME_UNKNOWN' : controller.signal.aborted ? 'AI_TIMEOUT' : 'AI_UNAVAILABLE'; }
    finally {
      clearTimeout(timer);
      await this.transaction(async tx => {
        const valid = await this.current(tx, job, evidence);
        const [lease] = await tx.query(`SELECT id FROM student_ai_reports WHERE id=$1::uuid AND lease_nonce=$2::uuid
          AND state='RUNNING' FOR UPDATE`, job.id, job.lease_nonce);
        if (!lease) return;
        await settle(tx, job, this.options.configuration, result, 'student_ai_reports');
        await tx.query(`UPDATE student_ai_reports SET state=$3,report=$4::jsonb,error_code=$5,lease_nonce=NULL,lease_until=NULL,
          updated_at=clock_timestamp() WHERE id=$1::uuid AND lease_nonce=$2::uuid RETURNING id`, job.id, job.lease_nonce,
        !valid ? 'STALE' : error ? 'FAILED' : 'READY', valid && !error ? JSON.stringify(result!.json) : null, error || null);
      });
    }
  }
}
