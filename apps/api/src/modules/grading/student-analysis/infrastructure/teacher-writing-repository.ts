import { createHash, randomUUID } from 'node:crypto';
import type { SqlTransaction } from '../../../../../../../src/core/contracts/sql.ts';
import { makeWritingSnapshot, writingPromptVersion, type WritingSource } from '../../../../../../../src/core/domain/grading/teacher-writing.ts';
import { parseEvaluationRubric } from '../../../../../../../src/core/domain/grading/evaluation-rubric.ts';
import type { SourceAbout, TeacherWritingRepository, WritingJob, WritingMember, WritingSnapshot } from '../application/teacher-writing-ports.ts';

type SourceRow = Omit<WritingSource, 'criteria'> & SourceAbout & { rubric: unknown };
function writingCriteria(rubric: unknown) {
  try { return parseEvaluationRubric(rubric).map(({ name, description }) => ({ name, description })); }
  catch { return []; }
}

export async function writingMember(tx: SqlTransaction, ownerId: string, classroomId: string, studentId: string) {
  const [member] = await tx.query<WritingMember>(`
    SELECT c.teacher_id AS owner_id,c.id AS classroom_id,e.student_id,e.id AS enrollment_id,
      p.id AS membership_period_id,c.timezone AS "timeZone"
    FROM classrooms c JOIN users u ON u.id=c.teacher_id AND u.account_role='teacher' AND u.email_verified_at IS NOT NULL
    JOIN enrollments e ON e.classroom_id=c.id JOIN membership_periods p ON p.enrollment_id=e.id AND p.ended_at IS NULL
    WHERE c.id=$1::uuid AND c.teacher_id=$2::uuid AND e.student_id=$3::uuid AND c.archived_at IS NULL
    FOR SHARE OF c,e,p`, classroomId, ownerId, studentId);
  return member ?? null;
}

export async function writingSnapshot(tx: SqlTransaction, member: WritingMember): Promise<WritingSnapshot | null> {
  const rows = await tx.query<SourceRow>(`
    SELECT a.id AS "activityId", t.id AS "attemptId",a.title,a.instructions_text AS instructions,
      t.submitted_at AS "submittedAt",g.final_grade::text AS grade,g.overall_feedback AS feedback,
      coalesce(g.rubric_snapshot,a.evaluation_rubric) AS rubric,
      CASE WHEN btrim(t.practical_response)<>'' THEN jsonb_build_array(jsonb_build_object('prompt',null,'text',t.practical_response))
        ELSE '[]'::jsonb END || d.texts AS texts
    FROM student_activities sa JOIN activities a ON a.id=sa.activity_id AND a.classroom_id=sa.classroom_id AND a.status='PUBLISHED'
    JOIN LATERAL (SELECT t.id,t.submitted_at,t.practical_response FROM attempts t
      WHERE t.student_activity_id=sa.id AND t.activity_id=a.id AND t.status='SUBMITTED'
      ORDER BY t.attempt_number DESC LIMIT 1) t ON true
    LEFT JOIN attempt_grades g ON g.id=sa.effective_grade_id AND g.attempt_id=t.id AND g.activity_id=a.id
      AND g.is_published AND g.published_at IS NOT NULL
    CROSS JOIN LATERAL (
      SELECT coalesce(jsonb_agg(jsonb_build_object('prompt',q.prompt,'text',v.development_text)
        ORDER BY q.position,q.id),'[]'::jsonb) AS texts
      FROM answers v JOIN questions q ON q.id=v.question_id AND q.activity_id=v.activity_id
      WHERE v.attempt_id=t.id AND v.activity_id=a.id AND q.type='DEVELOPMENT' AND btrim(v.development_text)<>''
    ) d
    WHERE sa.enrollment_id=$1::uuid AND sa.classroom_id=$2::uuid
      AND (btrim(t.practical_response)<>'' OR d.texts<>'[]'::jsonb)
    ORDER BY t.submitted_at DESC,t.id LIMIT 3`, member.enrollment_id, member.classroom_id);
  const sources = rows.map(({ rubric, ...row }) => ({ ...row, criteria: writingCriteria(rubric) }));
  const snapshot = makeWritingSnapshot(sources);
  if (!snapshot) return null;
  const hashSources = sources.map(({ activityId, attemptId, title, instructions, criteria, texts }) =>
    ({ activityId, attemptId, title, instructions, criteria, texts }));
  const hash = createHash('sha256').update(JSON.stringify([writingPromptVersion, member.membership_period_id, hashSources])).digest('hex');
  return { ...snapshot, hash, sources };
}

const selected = `r.*,e.student_id,
  floor(extract(epoch FROM r.updated_at)*1000)::bigint AS "generatedEpoch"`;

export async function currentWritingJob(tx: SqlTransaction, member: WritingMember, hash: string | null) {
  const [row] = await tx.query<WritingJob>(`SELECT ${selected}
    FROM teacher_writing_reports r JOIN enrollments e ON e.id=r.enrollment_id
    WHERE r.owner_id=$1::uuid AND r.membership_period_id=$2::uuid
      AND r.created_at>clock_timestamp()-interval '30 days'
    ORDER BY (r.evidence_hash IS NOT DISTINCT FROM $3::text) DESC,r.created_at DESC,r.id LIMIT 1`,
  member.owner_id, member.membership_period_id, hash);
  return row ?? null;
}

export async function enqueueWriting(tx: SqlTransaction, member: WritingMember, snapshot: WritingSnapshot) {
  await tx.query(`DELETE FROM teacher_writing_reports WHERE owner_id=$1::uuid AND membership_period_id=$2::uuid
    AND evidence_hash=$3 AND state<>'RUNNING' AND created_at<=clock_timestamp()-interval '30 days' RETURNING id`,
  member.owner_id, member.membership_period_id, snapshot.hash);
  await tx.query(`
    INSERT INTO teacher_writing_reports(id,owner_id,classroom_id,enrollment_id,membership_period_id,evidence_hash,reference_map,execution_profile)
    VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6,$7::jsonb,
      (SELECT active_profiles->'analysis' FROM ai_execution_policy WHERE singleton))
    ON CONFLICT (owner_id,membership_period_id,evidence_hash) DO UPDATE
      SET state='QUEUED',error_code=NULL,reference_map=EXCLUDED.reference_map,updated_at=clock_timestamp()
    WHERE teacher_writing_reports.state IN ('STALE','FAILED') AND teacher_writing_reports.dispatch_count=0
      AND teacher_writing_reports.updated_at <= clock_timestamp()-interval '5 seconds'
    RETURNING id`, randomUUID(), member.owner_id, member.classroom_id, member.enrollment_id, member.membership_period_id,
  snapshot.hash, JSON.stringify(snapshot.references));
  return currentWritingJob(tx, member, snapshot.hash);
}

export const teacherWritingRepository: TeacherWritingRepository = {
  member: writingMember, snapshot: writingSnapshot, current: currentWritingJob, enqueue: enqueueWriting,
};
