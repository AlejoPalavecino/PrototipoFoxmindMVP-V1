import { displayReferences, studentSnapshot, type StudentProgress } from './student-ai/snapshot.ts';
import { GradeCorrectionService } from './grade-corrections.ts';
import { completion, gradeMean, meanScore, performance, taughtProgress } from './progress-calculation.ts';
import { roundHalfUp } from './scoring.ts';
import { fail, uuid } from './policy.ts';
import type { Transaction } from './contracts.ts';

interface ProgressStudent { studentId: string; firstName: string; lastName: string; currentMember: boolean }
interface ProgressActivity {
  studentId: string; id: string; title: string; type: string; expected: boolean;
  firstSubmission: { id: string; number: number; submittedAt: string; appliedDeadlineAt: string | null; late: boolean } | null;
  pendingResubmission: boolean; grade: string | null; confirmedAttempts: number;
}

/** Read persisted academic facts under the same classroom lock as their writers. GET never assigns work. */
export class ProgressService extends GradeCorrectionService {
  private async progressRows(tx: Transaction, classroomId: string, studentId: string | null) {
    return tx.query<ProgressActivity>(`SELECT e.student_id AS "studentId",a.id,a.title,a.type::text,sa.is_expected AS expected,
      CASE WHEN first.id IS NULL THEN NULL ELSE jsonb_build_object('id',first.id,'number',first.attempt_number,
        'submittedAt',first.submitted_at,'appliedDeadlineAt',first.applied_deadline_at,'late',first.submitted_late) END AS "firstSubmission",
      (SELECT count(*)::int FROM attempts attempt WHERE attempt.student_activity_id=sa.id AND attempt.activity_id=a.id
        AND attempt.status='SUBMITTED') AS "confirmedAttempts",
      EXISTS(SELECT 1 FROM attempts pending WHERE pending.student_activity_id=sa.id AND pending.activity_id=a.id
        AND pending.status='DRAFT' AND pending.attempt_number>1) AS "pendingResubmission",g.final_grade::text AS grade
      FROM student_activities sa JOIN enrollments e ON e.id=sa.enrollment_id AND e.classroom_id=sa.classroom_id
      JOIN activities a ON a.id=sa.activity_id AND a.classroom_id=sa.classroom_id AND a.status='PUBLISHED'
      LEFT JOIN LATERAL (SELECT attempt.* FROM attempts attempt WHERE attempt.student_activity_id=sa.id
        AND attempt.activity_id=a.id AND attempt.status='SUBMITTED' ORDER BY attempt.submitted_at,attempt.attempt_number,attempt.id LIMIT 1) first ON true
      LEFT JOIN attempt_grades g ON g.id=sa.effective_grade_id AND g.is_published AND g.final_grade IS NOT NULL
        AND g.published_at IS NOT NULL AND EXISTS(SELECT 1 FROM attempts graded WHERE graded.id=g.attempt_id
          AND graded.student_activity_id=sa.id AND graded.activity_id=a.id AND graded.status='SUBMITTED')
      WHERE sa.classroom_id=$1::uuid AND (($2::uuid IS NOT NULL AND e.student_id=$2::uuid)
        OR ($2::uuid IS NULL AND EXISTS(SELECT 1 FROM membership_periods m WHERE m.enrollment_id=e.id AND m.ended_at IS NULL)))
      ORDER BY a.published_at,a.id,e.student_id`, classroomId, studentId);
  }

  private studentProgress(student: ProgressStudent, activities: ProgressActivity[]) {
    const expected = activities.filter(row => row.expected), delivered = expected.filter(row => row.firstSubmission !== null);
    return { ...student,
      completion: completion(expected.length, delivered.length, delivered.filter(row => !row.firstSubmission!.late).length,
        delivered.filter(row => row.firstSubmission!.late).length, delivered.filter(row => row.pendingResubmission).length),
      performance: performance(activities.flatMap(row => row.grade === null ? [] : [row.grade])),
      activities: activities.map(({ studentId: _studentId, ...row }) => row) };
  }

  async progressView(tx: Transaction, roomId: string, selected: string | null) {
    const students = await tx.query<ProgressStudent>(`SELECT e.student_id AS "studentId",u.first_name AS "firstName",u.last_name AS "lastName",
      EXISTS(SELECT 1 FROM membership_periods m WHERE m.enrollment_id=e.id AND m.ended_at IS NULL) AS "currentMember"
      FROM enrollments e JOIN users u ON u.id=e.student_id WHERE e.classroom_id=$1::uuid
      AND (($2::uuid IS NOT NULL AND e.student_id=$2::uuid) OR ($2::uuid IS NULL
        AND EXISTS(SELECT 1 FROM membership_periods m WHERE m.enrollment_id=e.id AND m.ended_at IS NULL))) ORDER BY u.last_name,u.first_name,e.student_id`, roomId, selected);
    if (selected && students.length !== 1) return fail('FORBIDDEN');
    const rows = await this.progressRows(tx, roomId, selected);
    const topics = await tx.query<{ total: number; taught: number }>(`SELECT count(*)::int AS total,
      count(*) FILTER(WHERE status='TAUGHT')::int AS taught FROM topics WHERE classroom_id=$1::uuid`, roomId);
    const plan = taughtProgress(topics[0].total, topics[0].taught);
    const summaries = students.map(student => this.studentProgress(student, rows.filter(row => row.studentId === student.studentId)));
    if (selected) return { ...summaries[0], plan };
    const individualMeans = students.flatMap(student => {
      const mean = gradeMean(rows.filter(row => row.studentId === student.studentId).flatMap(row => row.grade === null ? [] : [row.grade]));
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
        ...await this.progressView(tx, classroomId, teacher ? null : actor.id) };
    });
  }

  getStudentProgress(request: unknown, classroomId: string, studentId: string) {
    if (!uuid(studentId)) return fail('FORBIDDEN');
    return this.run(request, false, async (tx, actor) => {
      const room = await this.classroom(tx, actor, classroomId, false, true);
      return { scope: 'member' as const, revision: room.revision.toString(), archived: !!room.archived_at,
        ...await this.progressView(tx, classroomId, studentId) };
    });
  }
  getStudentAiReport(request: unknown, classroomId: string, studentId: string) {
    if (!uuid(studentId)) return fail('FORBIDDEN');
    return this.run(request, false, async (tx, actor) => {
      await this.classroom(tx, actor, classroomId, false, true);
      const [member] = await tx.query<{ id: string }>(`SELECT e.id FROM enrollments e
        JOIN membership_periods m ON m.enrollment_id=e.id AND m.ended_at IS NULL
        WHERE e.classroom_id=$1::uuid AND e.student_id=$2::uuid FOR SHARE OF e,m`, classroomId, studentId);
      if (!member) return fail('FORBIDDEN');
      const empty = (state: string) => ({ state, report: null, generatedAt: null, evidenceHash: null, error: null });
      if (this.ports.studentAiEnabled === false) return empty('DISABLED');
      const progress = await this.progressView(tx, classroomId, studentId) as StudentProgress;
      const snapshot = studentSnapshot(progress);
      if (!snapshot) return empty('INSUFFICIENT_EVIDENCE');
      const digest = snapshot.hash;
      const [record] = await tx.query<{ state: string; report: unknown; updated_at: Date; error_code: string | null; reference_map: unknown }>(`SELECT state,report,updated_at,error_code,reference_map FROM student_ai_reports
        WHERE enrollment_id=$1::uuid AND evidence_hash=$2 ORDER BY created_at DESC,id DESC LIMIT 1`, member.id, digest);
      if (record?.state === 'READY') {
        const evidenceReferences = displayReferences(snapshot, record.reference_map, progress);
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
