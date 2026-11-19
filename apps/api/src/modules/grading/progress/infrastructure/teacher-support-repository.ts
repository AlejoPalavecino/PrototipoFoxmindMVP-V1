import type { TeacherSupportEvidence } from '../../../../../../../src/core/contracts/teacher-support.ts';
import type { Transaction } from '../../../classrooms/public.ts';
import { isVerifiedRead } from '../../../classrooms/public.ts';
import type { SupportFacts, SupportGrade, TeacherSupportRepository } from '../application/teacher-support.ts';

// Epoch values cross the SQL adapter without interpreting a timestamp in the session's time zone.
async function evaluationTime(tx: Transaction) {
  const [{ milliseconds }] = await tx.query<{ milliseconds: bigint }>(
    'SELECT floor(extract(epoch FROM clock_timestamp())*1000)::bigint AS milliseconds');
  return new Date(Number(milliseconds));
}

// Match adapter-pg's Date projection used by Activities and Participation for saved deadlines.
const academicDeadline = (column: string) => `((${column} AT TIME ZONE current_setting('TimeZone')) AT TIME ZONE 'UTC')`;

function classrooms(tx: Transaction, teacherId: string) {
  return tx.query<Awaited<ReturnType<TeacherSupportRepository['classrooms']>>[number]>(`
    SELECT id, name, division, cover_key AS "coverKey"
    FROM classrooms WHERE teacher_id=$1::uuid AND archived_at IS NULL
    ORDER BY id FOR ${isVerifiedRead(tx) ? 'SHARE' : 'UPDATE'}`, teacherId);
}

function facts(tx: Transaction, teacherId: string, classroomIds: string[], studentId: string | null, now: Date) {
  return tx.query<SupportFacts>(`
    WITH members AS MATERIALIZED (
      SELECT e.id AS enrollment_id,c.id AS classroom_id,c.name AS classroom_name,e.student_id,
        u.first_name,u.last_name,c.timezone,($4::timestamptz AT TIME ZONE c.timezone)::date AS today
      FROM classrooms c JOIN enrollments e ON e.classroom_id=c.id JOIN users u ON u.id=e.student_id
      WHERE c.teacher_id=$1::uuid AND c.archived_at IS NULL
        AND c.id=ANY($2::uuid[]) AND ($3::uuid IS NULL OR e.student_id=$3::uuid)
        AND EXISTS (SELECT 1 FROM membership_periods p WHERE p.enrollment_id=e.id AND p.ended_at IS NULL)
    ), assignments AS MATERIALIZED (
      SELECT m.enrollment_id,m.today,m.timezone,a.id,a.title,${academicDeadline('a.deadline_at')} AS deadline_at,
        sa.id AS obligation_id,sa.first_submission_deadline_at
      FROM members m JOIN student_activities sa ON sa.enrollment_id=m.enrollment_id
        AND sa.classroom_id=m.classroom_id AND sa.is_expected
      JOIN activities a ON a.id=sa.activity_id AND a.classroom_id=m.classroom_id AND a.status='PUBLISHED'
      WHERE a.deadline_at IS NULL OR ${academicDeadline('a.deadline_at')} <= $4::timestamptz
    ), obligations AS MATERIALIZED (
      SELECT a.enrollment_id,a.id,a.title,d.deadline_at,a.today-(d.deadline_at AT TIME ZONE a.timezone)::date AS days,
        coalesce(f.received,false) AS received
      FROM assignments a CROSS JOIN LATERAL (
        SELECT bool_or(t.status='SUBMITTED') AS received,
          max(t.individual_deadline_at) FILTER (WHERE t.attempt_number=1 AND t.status='DRAFT') AS initial_deadline_at
        FROM attempts t WHERE t.student_activity_id=a.obligation_id
      ) f
      CROSS JOIN LATERAL (SELECT greatest(a.deadline_at,
        ${academicDeadline('coalesce(f.initial_deadline_at,a.first_submission_deadline_at)')}) AS deadline_at) d
      WHERE d.deadline_at <= $4::timestamptz
    ), stats AS MATERIALIZED (
      SELECT enrollment_id,count(*) FILTER (WHERE received AND days<30)::int AS delivered,
        count(*) FILTER (WHERE NOT received OR days<30)::int AS expected,
        coalesce(max(days) FILTER (WHERE NOT received),0)::int AS oldest,
        jsonb_agg(jsonb_build_object('activityId',id,'title',title,'deadlineAt',deadline_at)
          ORDER BY deadline_at,id) FILTER (WHERE NOT received) AS pending
      FROM obligations GROUP BY enrollment_id
    )
    SELECT m.classroom_id AS "classroomId",m.classroom_name AS "classroomName",m.timezone AS "timeZone",m.student_id AS "studentId",
      m.first_name AS "firstName",m.last_name AS "lastName",coalesce(s.oldest,0) AS "oldestDays",
      coalesce(s.expected,0) AS expected,coalesce(s.delivered,0) AS delivered,coalesce(s.pending,'[]'::jsonb) AS pending
    FROM members m LEFT JOIN stats s USING(enrollment_id)`, teacherId, classroomIds, studentId, now.toISOString());
}

const publishedEvidence = `
  FROM enrollments e JOIN student_activities sa ON sa.enrollment_id=e.id AND sa.classroom_id=e.classroom_id
  JOIN activities a ON a.id=sa.activity_id AND a.classroom_id=sa.classroom_id AND a.status='PUBLISHED'
  JOIN attempt_grades g ON g.id=sa.effective_grade_id AND g.student_activity_id=sa.id AND g.activity_id=a.id
    AND g.is_published AND g.published_at IS NOT NULL AND g.final_grade IS NOT NULL
  JOIN attempts t ON t.id=g.attempt_id AND t.student_activity_id=sa.id AND t.activity_id=a.id AND t.status='SUBMITTED'
  WHERE e.classroom_id=$1::uuid AND e.student_id=$2::uuid
    AND EXISTS (SELECT 1 FROM membership_periods m WHERE m.enrollment_id=e.id AND m.ended_at IS NULL)`;

function grades(tx: Transaction, classroomId: string, studentId: string) {
  return tx.query<SupportGrade>(`
    SELECT a.id AS "activityId",t.id AS "attemptId",a.title,g.final_grade::text AS grade,
      g.overall_feedback AS feedback,g.rubric_snapshot AS rubric,g.rubric_marks AS marks
    ${publishedEvidence} ORDER BY a.published_at,a.id`, classroomId, studentId);
}

async function evidence(tx: Transaction, classroomId: string, studentId: string, attemptId: string) {
  const [row] = await tx.query<Omit<TeacherSupportEvidence, 'submittedAt' | 'texts' | 'timeZone'> & { submittedAt: Date; response: string }>(`
    SELECT a.id AS "activityId",t.id AS "attemptId",a.title,a.instructions_text AS instructions,
      g.final_grade::text AS grade,g.overall_feedback AS feedback,t.submitted_at AS "submittedAt",t.practical_response AS response
    ${publishedEvidence} AND t.id=$3::uuid`, classroomId, studentId, attemptId);
  if (!row) return null;
  const texts = await tx.query<TeacherSupportEvidence['texts'][number]>(`
    SELECT q.prompt,v.development_text AS text FROM answers v JOIN questions q ON q.id=v.question_id AND q.activity_id=v.activity_id
    WHERE v.attempt_id=$1::uuid AND v.activity_id=$2::uuid AND q.type='DEVELOPMENT'
      AND btrim(v.development_text)<>''
    ORDER BY q.position,q.id`, attemptId, row.activityId);
  const { response, submittedAt, ...metadata } = row;
  if (response.trim()) texts.unshift({ prompt: null, text: response });
  return { ...metadata, submittedAt: submittedAt.toISOString(), texts };
}

export const teacherSupportRepository: TeacherSupportRepository = { evaluationTime, classrooms, facts, grades, evidence };
