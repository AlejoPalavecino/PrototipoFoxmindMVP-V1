import type { TeacherSupportEvidence } from '../../../../../../../src/core/contracts/teacher-support.ts';
import type { TeacherWritingAnalysis } from '../../../../../../../src/core/contracts/teacher-writing.ts';
import { parseWritingReport } from '../../../../../../../src/core/domain/grading/teacher-writing.ts';
import { fail, uuid, type ClassroomAccess, type Transaction, type Actor } from '../../../classrooms/public.ts';
import type { TeacherWritingRepository, WritingJob, WritingSnapshot } from './teacher-writing-ports.ts';

function status(state: TeacherWritingAnalysis['state'], error: string | null = null): TeacherWritingAnalysis {
  return { state, report: null, error, generatedAt: null };
}

function reportStatus(job: WritingJob | null, snapshot: WritingSnapshot | null): TeacherWritingAnalysis {
  if (!snapshot) return status(job ? 'STALE' : 'INSUFFICIENT');
  if (!job) return status('AVAILABLE');
  if (job.evidence_hash !== snapshot.hash) return status('STALE');
  if (job.state === 'READY') {
    try {
      return { ...status('READY'), report: parseWritingReport(job.report, snapshot.references),
        generatedAt: new Date(Number(job.generatedEpoch)).toISOString() };
    } catch { return status('STALE'); }
  }
  if (job.state === 'QUEUED' || job.state === 'RUNNING') return status('RUNNING');
  return status(job.state, job.error_code);
}

export class TeacherWritingService {
  constructor(private readonly access: Pick<ClassroomAccess, 'run'>, private readonly enabled: boolean,
    private readonly repository: TeacherWritingRepository) {}

  private async member(tx: Transaction, actor: Actor, classroomId: string, studentId: string) {
    if (actor.account_role !== 'teacher' || !uuid(classroomId) || !uuid(studentId)) return fail('FORBIDDEN');
    return await this.repository.member(tx, actor.id, classroomId, studentId) ?? fail('FORBIDDEN');
  }

  getTeacherWriting(request: unknown, classroomId: string, studentId: string) {
    return this.analysis(request, classroomId, studentId, false);
  }

  startTeacherWriting(request: unknown, classroomId: string, studentId: string) {
    return this.analysis(request, classroomId, studentId, true);
  }

  private analysis(request: unknown, classroomId: string, studentId: string, start: boolean) {
    return this.access.run(request, start, async (tx, actor) => {
      const member = await this.member(tx, actor, classroomId, studentId);
      if (!this.enabled) return status('DISABLED');
      const snapshot = await this.repository.snapshot(tx, member);
      const job = start && snapshot ? await this.repository.enqueue(tx, member, snapshot)
        : await this.repository.current(tx, member, snapshot?.hash ?? null);
      return reportStatus(job, snapshot);
    });
  }

  getTeacherWritingEvidence(request: unknown, classroomId: string, studentId: string, attemptId: string): Promise<TeacherSupportEvidence> {
    return this.access.run(request, false, async (tx, actor) => {
      const member = await this.member(tx, actor, classroomId, studentId);
      if (!this.enabled || !uuid(attemptId)) return fail('FORBIDDEN');
      const snapshot = await this.repository.snapshot(tx, member);
      if (!snapshot) return fail('FORBIDDEN');
      const job = await this.repository.current(tx, member, snapshot.hash);
      const { report } = reportStatus(job, snapshot);
      if (!report) return fail('FORBIDDEN');
      const cited = [...report.strengths, ...report.improvements, ...(report.nextStep ? [report.nextStep] : [])]
        .some(finding => finding.sources.some(source => source.attemptId === attemptId));
      const source = cited && snapshot.sources.find(row => row.attemptId === attemptId);
      if (!source) return fail('FORBIDDEN');
      const { activityId, title, instructions, texts, submittedAt, grade, feedback } = source;
      return { activityId, attemptId, title, instructions, texts, submittedAt: submittedAt.toISOString(),
        grade, feedback, timeZone: member.timeZone };
    });
  }
}
