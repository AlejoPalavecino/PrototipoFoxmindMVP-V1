import type { AcademicDeadline } from '../../../../../../../src/core/domain/agenda/index.ts';

export interface AgendaTransaction {
  query<T>(sql: string, ...args: unknown[]): Promise<T[]>;
}

export interface AgendaAcademicRow {
  id: string;
  classroom_id: string;
  classroom_name: string;
  title: string;
  activity_type: AcademicDeadline['activityType'];
  timezone: string;
  role: AcademicDeadline['role'];
  general_deadline: Date | null;
  individual_deadline: Date | null;
  attempt_status: 'DRAFT' | 'SUBMITTED' | null;
  attempt_number: number | null;
}

// Teacher rows never join student records. Student rows read only the actor's obligation.
const academicQuery = `
  SELECT a.id, c.id AS classroom_id, c.name AS classroom_name, a.title,
    a.type::text AS activity_type, c.timezone, 'teacher' AS role,
    a.deadline_at AS general_deadline, NULL::timestamptz AS individual_deadline,
    NULL::text AS attempt_status, NULL::integer AS attempt_number
  FROM classrooms c JOIN activities a ON a.classroom_id=c.id
  WHERE c.teacher_id=$1::uuid AND c.archived_at IS NULL AND a.status='PUBLISHED'
  UNION ALL
  SELECT a.id, c.id AS classroom_id, c.name AS classroom_name, a.title,
    a.type::text AS activity_type, c.timezone, 'student' AS role,
    a.deadline_at AS general_deadline,
    COALESCE(latest.individual_deadline_at, sa.first_submission_deadline_at) AS individual_deadline,
    latest.status::text AS attempt_status, latest.attempt_number
  FROM enrollments e
  JOIN classrooms c ON c.id=e.classroom_id
  JOIN student_activities sa ON sa.enrollment_id=e.id AND sa.classroom_id=c.id
  JOIN activities a ON a.id=sa.activity_id AND a.classroom_id=c.id
  LEFT JOIN LATERAL (
    SELECT attempt_number, status, individual_deadline_at FROM attempts
    WHERE student_activity_id=sa.id AND activity_id=a.id
    ORDER BY attempt_number DESC LIMIT 1
  ) latest ON true
  WHERE e.student_id=$1::uuid AND c.teacher_id<>$1::uuid
    AND c.archived_at IS NULL AND sa.is_expected AND a.status='PUBLISHED'
    AND EXISTS (SELECT 1 FROM membership_periods m
      WHERE m.enrollment_id=e.id AND m.classroom_id=c.id AND m.ended_at IS NULL)`;

export function readAcademicAgenda(tx: AgendaTransaction, userId: string) {
  return tx.query<AgendaAcademicRow>(academicQuery, userId);
}

export async function hasAgendaTarget(tx: AgendaTransaction, userId: string,
  classroomId: string, activityId: string | null): Promise<boolean> {
  const rows = await tx.query<{ id: string }>(`
    SELECT c.id FROM classrooms c
    WHERE c.id=$2::uuid AND c.archived_at IS NULL
      AND ($3::uuid IS NULL OR EXISTS (SELECT 1 FROM activities a
        WHERE a.id=$3::uuid AND a.classroom_id=c.id AND a.status='PUBLISHED'))
      AND (c.teacher_id=$1::uuid OR EXISTS (
        SELECT 1 FROM enrollments e
        WHERE e.classroom_id=c.id AND e.student_id=$1::uuid
          AND EXISTS (SELECT 1 FROM membership_periods m
            WHERE m.enrollment_id=e.id AND m.classroom_id=c.id AND m.ended_at IS NULL)
          AND ($3::uuid IS NULL OR EXISTS (SELECT 1 FROM student_activities sa
            WHERE sa.enrollment_id=e.id AND sa.classroom_id=c.id
              AND sa.activity_id=$3::uuid AND sa.is_expected))))`,
  userId, classroomId, activityId);
  return rows.length > 0;
}
