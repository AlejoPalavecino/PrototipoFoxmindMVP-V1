import type { StudentActivityListRow } from '../../domain/activity-list-state.ts';
import type { ActivityRow, PendingReviewRow, ActivityIdentity, MaterialLinkRow, QuestionRow, OptionRow, InstructionFileRow, ActivityMaterialRow } from '../application/authoring-records.ts';
import type { AuthoringRepository } from '../application/authoring-repository.ts';
export function createAuthoringRepository(): AuthoringRepository { return {
async findActivity(tx, input) { return tx.query<ActivityRow>(`SELECT * FROM activities WHERE id=$1::uuid AND classroom_id=$2::uuid FOR ${input.lock === 'share' ? 'SHARE' : 'UPDATE'}`, input.activityId, input.classroomId); },
async listActivities(tx, input) { return tx.query<ActivityRow>(`SELECT * FROM activities WHERE classroom_id=$1::uuid
        AND ($2::boolean OR status='PUBLISHED') ORDER BY created_at DESC,id`, input.classroomId, input.includeDrafts); },
async listPendingReviews(tx, input) { return tx.query<PendingReviewRow>(`SELECT t.activity_id,count(*)::int AS count
        FROM attempts t JOIN activities a ON a.id=t.activity_id
        LEFT JOIN attempt_grades g ON g.attempt_id=t.id
        WHERE a.classroom_id=$1::uuid AND t.status='SUBMITTED' AND NOT COALESCE(g.is_published,false)
        GROUP BY t.activity_id`, input.classroomId); },
async listStudentActivityStates(tx, input) { return tx.query<StudentActivityListRow>(`SELECT sa.activity_id,sa.is_expected AS expected,t.status::text AS status,t.attempt_number AS number,
        COALESCE(g.is_published,false) AS published,t.individual_deadline_at AS individual_deadline,sa.first_submission_deadline_at AS first_deadline
        FROM student_activities sa JOIN enrollments e ON e.id=sa.enrollment_id
        LEFT JOIN LATERAL(SELECT a.* FROM attempts a WHERE a.student_activity_id=sa.id ORDER BY a.attempt_number DESC LIMIT 1)t ON true
        LEFT JOIN attempt_grades g ON g.attempt_id=t.id WHERE sa.classroom_id=$1::uuid AND e.student_id=$2::uuid`, input.classroomId, input.studentId); },
async createDraft(tx, input) { return tx.query<ActivityIdentity>(`INSERT INTO activities(id,updated_at,classroom_id,type) VALUES($1::uuid,$2,$3::uuid,$4::"ActivityType") RETURNING id`, input.activityId, input.now, input.classroomId, input.type); },
async updateMetadata(tx, input) { return tx.query<ActivityIdentity>(`UPDATE activities SET title=$2,unit_id=$3::uuid,topic_id=$4::uuid,updated_at=$5 WHERE id=$1::uuid RETURNING id`, input.activityId, input.title, input.unitId, input.topicId, input.now); },
async updateDeadline(tx, input) { return tx.query<ActivityIdentity>(`UPDATE activities SET deadline_at=$2,allow_late_submissions=$3,updated_at=$4 WHERE id=$1::uuid RETURNING id`, input.activityId, input.deadline, input.allowLate, input.now); },
async saveContent(tx, input) { return tx.query<ActivityIdentity>(`UPDATE activities SET title=$2,unit_id=$3::uuid,topic_id=$4::uuid,instructions_text=$5,
            attachments_required=$6,deadline_at=$7,allow_late_submissions=$8,updated_at=$9,
            ai_grading_rubric=COALESCE($10::text,ai_grading_rubric),evaluation_rubric=COALESCE($11::jsonb,evaluation_rubric),
            objective=CASE WHEN $12::boolean THEN $13::text ELSE objective END,
            teacher_comment=CASE WHEN $14::boolean THEN $15::text ELSE teacher_comment END,
            teacher_brief=CASE WHEN $16::boolean THEN $17::text ELSE teacher_brief END WHERE id=$1::uuid RETURNING id`, input.activityId, input.title, input.unitId, input.topicId, input.instructions, input.attachmentRequired, input.deadline, input.allowLate, input.now, input.aiGradingRubric, input.evaluationRubric, input.hasObjective, input.objective, input.hasTeacherComment, input.teacherComment, input.hasTeacherBrief, input.teacherBrief); },
async publishActivity(tx, input) { return tx.query<ActivityIdentity>(`UPDATE activities SET status='PUBLISHED',published_at=$2,updated_at=$2 WHERE id=$1::uuid RETURNING id`, input.activityId, input.now); },
async withdrawActivity(tx, input) { return tx.query<ActivityIdentity>(`UPDATE activities SET status='WITHDRAWN',updated_at=$2 WHERE id=$1::uuid RETURNING id`, input.activityId, input.now); },
async findMaterial(tx, input) { return tx.query<MaterialLinkRow>('SELECT file_id,deleted_at FROM materials WHERE id=$1::uuid AND classroom_id=$2::uuid FOR SHARE', input.materialId, input.classroomId); },
async listQuestions(tx, input) { return tx.query<QuestionRow>(`SELECT id,type,prompt,available_points::text AS points,scoring_rule AS "scoringRule"
      FROM questions WHERE activity_id=$1::uuid ORDER BY position,id`, input.activityId); },
async listQuestionOptions(tx, input) { return tx.query<OptionRow>(`SELECT o.id,o.question_id,o.text,o.is_correct AS correct FROM question_options o
      JOIN questions q ON q.id=o.question_id WHERE q.activity_id=$1::uuid ORDER BY o.position,o.id`, input.activityId); },
async listInstructionFiles(tx, input) { return tx.query<InstructionFileRow>(`SELECT f.id,f.original_name AS name,f.extension,
      (f.blob_deleted_at IS NULL AND c.phase='ready' AND u.status='COMPLETED' AND f.validation_status='APPROVED' AND f.scan_status='CLEAN'
       AND c.digest IS NOT NULL AND c.digest=c.validated_digest AND c.digest=c.scanned_digest) AS ready
      FROM activity_instruction_files a JOIN files f ON f.id=a.file_id JOIN file_custodies c ON c.file_id=f.id JOIN uploads u ON u.file_id=f.id
      WHERE a.activity_id=$1::uuid ORDER BY f.created_at,f.id`, input.activityId); },
async listMaterials(tx, input) { return tx.query<ActivityMaterialRow>(`SELECT m.id,m.title,m.file_id AS "fileId",f.extension
      FROM activity_materials a JOIN materials m ON m.id=a.material_id JOIN files f ON f.id=m.file_id WHERE a.activity_id=$1::uuid ORDER BY m.created_at,m.id`, input.activityId); }
}; }
