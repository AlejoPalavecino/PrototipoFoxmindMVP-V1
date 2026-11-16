import type { StudentProgress, StudentSnapshot } from './student-snapshot.ts';
import type { AcademicFeatureContext } from '../../classrooms/public.ts';
import { completion, gradeMean, meanScore, performance, taughtProgress } from '../domain/progress-calculation.ts';
import { roundHalfUp } from '../domain/scoring.ts';
import { fail, uuid } from '../../classrooms/public.ts';
import type { Transaction } from '../../classrooms/public.ts';

interface ProgressStudent { studentId: string; firstName: string; lastName: string; currentMember: boolean }
interface ProgressActivity {
  studentId: string; id: string; title: string; type: string; expected: boolean;
  firstSubmission: { id: string; number: number; submittedAt: string; appliedDeadlineAt: string | null; late: boolean } | null;
  pendingResubmission: boolean; grade: string | null; confirmedAttempts: number;
  publishedAttemptId?: string | null;
  review?: { attemptId: string; state: 'pending' | 'saved' | 'published' } | null;
}

/** Read persisted academic facts under the same classroom lock as their writers. GET never assigns work. */
export class ProgressService {
  private readonly run: AcademicFeatureContext['run'];
  private readonly classroom: AcademicFeatureContext['classroom'];
  private readonly ports: AcademicFeatureContext['ports'];
  constructor(context: Pick<AcademicFeatureContext, 'run' | 'classroom' | 'ports'>, private readonly repository: ProgressRepository) {
    this.run = context.run.bind(context); this.classroom = context.classroom.bind(context); this.ports = context.ports;
  }
  private async progressRows(tx: Transaction, classroomId: string, studentId: string | null) {
    return this.repository.progressRows(tx, classroomId, studentId);
  }

  private studentProgress(student: ProgressStudent, activities: ProgressActivity[], includeReview = false) {
    const expected = activities.filter(row => row.expected), delivered = expected.filter(row => row.firstSubmission !== null);
    return { ...student,
      completion: completion(expected.length, delivered.length, delivered.filter(row => !row.firstSubmission!.late).length,
        delivered.filter(row => row.firstSubmission!.late).length, delivered.filter(row => row.pendingResubmission).length),
      performance: performance(activities.flatMap(row => row.grade === null ? [] : [row.grade])),
      activities: activities.map(({ studentId: _studentId, review, ...row }) => includeReview ? { ...row, review: review ?? null } : row) };
  }

  async progressView(tx: Transaction, roomId: string, selected: string | null, includeReview = false) {
    const students = await this.repository.students(tx, roomId, selected);
    if (selected && students.length !== 1) return fail('FORBIDDEN');
    const rows = await this.progressRows(tx, roomId, selected);
    const byStudent = new Map<string, ProgressActivity[]>();
    for (const row of rows) {
      const activities = byStudent.get(row.studentId) ?? [];
      activities.push(row);
      byStudent.set(row.studentId, activities);
    }
    const topics = await this.repository.topics(tx, roomId);
    const units = await this.repository.units(tx, roomId);
    const plan = { ...taughtProgress(topics[0].total, topics[0].taught), units };
    const summaries = students.map(student => this.studentProgress(student, byStudent.get(student.studentId) ?? [], includeReview));
    if (selected) return { ...summaries[0], plan };
    const individualMeans = students.flatMap(student => {
      const mean = gradeMean((byStudent.get(student.studentId) ?? []).flatMap(row => row.grade === null ? [] : [row.grade]));
      return mean === null ? [] : [mean];
    });
    const average = meanScore(individualMeans), expected = summaries.reduce((sum, row) => sum + row.completion.expected, 0);
    const total = (field: 'delivered' | 'onTime' | 'late' | 'pendingResubmissions') => summaries.reduce((sum, row) => sum + row.completion[field], 0);
    return { studentCount: students.length, students: summaries,
      completion: completion(expected, total('delivered'), total('onTime'), total('late'), total('pendingResubmissions')),
      performance: { gradedStudents: individualMeans.length, average: average === null ? null : roundHalfUp(average) }, plan };
  }

  getProgress(request: unknown, classroomId: string) {
    return this.run(request, false, async (tx, actor) => {
      const room = await this.classroom(tx, actor, classroomId), teacher = room.teacher_id === actor.id;
      return { scope: teacher ? 'classroom' as const : 'self' as const, revision: room.revision.toString(), archived: !!room.archived_at,
        ...await this.progressView(tx, classroomId, teacher ? null : actor.id, teacher) };
    });
  }

  getStudentProgress(request: unknown, classroomId: string, studentId: string) {
    if (!uuid(studentId)) return fail('FORBIDDEN');
    return this.run(request, false, async (tx, actor) => {
      const room = await this.classroom(tx, actor, classroomId, false, true);
      return { scope: 'member' as const, revision: room.revision.toString(), archived: !!room.archived_at,
        ...await this.progressView(tx, classroomId, studentId, true) };
    });
  }
  getStudentAiReport(request: unknown, classroomId: string, studentId: string) {
    if (!uuid(studentId)) return fail('FORBIDDEN');
    return this.run(request, false, async (tx, actor) => {
      await this.classroom(tx, actor, classroomId, false, true);
      const [member] = await this.repository.member(tx, classroomId, studentId);
      if (!member) return fail('FORBIDDEN');
      const empty = (state: string) => ({ state, report: null, generatedAt: null, evidenceHash: null, error: null });
      if (this.ports.studentAiEnabled === false) return empty('DISABLED');
      const progress = await this.progressView(tx, classroomId, studentId) as StudentProgress;
      const snapshot = this.repository.studentSnapshot(progress);
      if (!snapshot) return empty('INSUFFICIENT_EVIDENCE');
      const digest = snapshot.hash;
      const [record] = await this.repository.report(tx, member.id, digest);
      if (record?.state === 'READY') {
        const evidenceReferences = this.repository.displayReferences(snapshot, record.reference_map, progress);
        if (!evidenceReferences) return { ...empty('STALE'), evidenceHash: digest };
        return { state: record.state, report: record.report, generatedAt: record.updated_at.toISOString(),
          evidenceHash: digest, error: null, evidenceReferences };
      }
      return record ? { state: record.state, report: record.state === 'READY' ? record.report : null,
        generatedAt: record.state === 'READY' ? record.updated_at.toISOString() : null, evidenceHash: digest,
        error: record.state === 'FAILED' ? record.error_code : null } : { ...empty('PENDING'), evidenceHash: digest };
    });
  }
}

export interface ProgressRepository {
 studentSnapshot: (progress: StudentProgress) => StudentSnapshot | null;
 displayReferences: (snapshot: StudentSnapshot, stored: unknown, progress: StudentProgress) => {ref: string; title: string | undefined}[] | null;
 progressRows(tx: Transaction, ...values: unknown[]): Promise<(ProgressActivity)[]>;
 students(tx: Transaction, ...values: unknown[]): Promise<(ProgressStudent)[]>;
 topics(tx: Transaction, ...values: unknown[]): Promise<({ total: number; taught: number })[]>;
 units(tx: Transaction, ...values: unknown[]): Promise<({ id: string; name: string; total: number; taught: number })[]>;
 member(tx: Transaction, ...values: unknown[]): Promise<({ id: string })[]>;
 report(tx: Transaction, ...values: unknown[]): Promise<({ state: string; report: unknown; updated_at: Date; error_code: string | null; reference_map: unknown })[]>;
}
