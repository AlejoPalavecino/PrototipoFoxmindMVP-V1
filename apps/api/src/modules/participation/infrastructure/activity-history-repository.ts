import { randomUUID, randomBytes } from 'node:crypto';
import { activityEvent } from './activity-events.ts';
import { requireReady } from '../../files/public.ts';
import type { ActivityHistoryRepository } from '../application/activity-history.ts';
export const repository: Omit<ActivityHistoryRepository, 'readActivityTopics'> = {
 randomUUID,
 activityEvent,

 requireReady,
 history(tx,...values) {return tx.query<Awaited<ReturnType<ActivityHistoryRepository['history']>>[number]>(`SELECT a.id,a.attempt_number AS number,a.status::text,a.opened_at AS "openedAt",
      a.submitted_at AS "submittedAt",a.applied_deadline_at AS "appliedDeadlineAt",a.individual_deadline_at AS "individualDeadlineAt",
      a.submitted_late AS "submittedLate",COALESCE(g.is_published,false) AS "gradePublished",e.student_id AS "studentId",u.first_name AS "firstName",u.last_name AS "lastName",
      EXISTS(SELECT 1 FROM membership_periods m WHERE m.enrollment_id=e.id AND m.ended_at IS NULL) AS "currentMember"
      FROM attempts a JOIN student_activities sa ON sa.id=a.student_activity_id JOIN enrollments e ON e.id=sa.enrollment_id
      JOIN users u ON u.id=e.student_id LEFT JOIN attempt_grades g ON g.attempt_id=a.id WHERE sa.classroom_id=$1::uuid AND a.activity_id=$2::uuid
      AND ($3::uuid IS NULL OR e.student_id=$3::uuid) ORDER BY a.attempt_number DESC,a.opened_at DESC,a.id`,...values);},
 attempt(tx,...values) {return tx.query<Awaited<ReturnType<ActivityHistoryRepository['attempt']>>[number]>(`SELECT a.*,e.student_id FROM attempts a
        JOIN student_activities sa ON sa.id=a.student_activity_id JOIN enrollments e ON e.id=sa.enrollment_id
        WHERE a.id=$1::uuid AND sa.classroom_id=$2::uuid FOR SHARE OF a,sa,e`,...values);},
 obligation(tx,...values) {return tx.query<Awaited<ReturnType<ActivityHistoryRepository['obligation']>>[number]>('SELECT * FROM student_activities WHERE id=$1::uuid',...values);},
 viewClock(tx,...values) {return tx.query<Awaited<ReturnType<ActivityHistoryRepository['viewClock']>>[number]>('SELECT clock_timestamp() AS now',...values);},
 lockObligation(tx,...values) {return tx.query<Awaited<ReturnType<ActivityHistoryRepository['lockObligation']>>[number]>(`SELECT sa.* FROM student_activities sa JOIN enrollments e ON e.id=sa.enrollment_id
        WHERE sa.activity_id=$1::uuid AND sa.classroom_id=$2::uuid AND e.student_id=$3::uuid
          AND EXISTS(SELECT 1 FROM membership_periods m WHERE m.enrollment_id=e.id AND m.ended_at IS NULL) FOR UPDATE OF e,sa`,...values);},
 lockAttempts(tx,...values) {return tx.query<Awaited<ReturnType<ActivityHistoryRepository['lockAttempts']>>[number]>(`SELECT * FROM attempts WHERE student_activity_id=$1::uuid
        ORDER BY attempt_number DESC FOR UPDATE`,...values);},
 reopenClock(tx,...values) {return tx.query<Awaited<ReturnType<ActivityHistoryRepository['reopenClock']>>[number]>('SELECT clock_timestamp() AS now',...values);},
 attachments(tx,...values) {return tx.query<Awaited<ReturnType<ActivityHistoryRepository['attachments']>>[number]>(`SELECT file_id FROM attempt_attachments
        WHERE attempt_id=$1::uuid ORDER BY position,file_id FOR SHARE`,...values);},
 attachmentOrigin(tx,...values) {return tx.query<Awaited<ReturnType<ActivityHistoryRepository['attachmentOrigin']>>[number]>(`SELECT a.id FROM attempts a JOIN student_activities sa ON sa.id=a.student_activity_id
          JOIN enrollments e ON e.id=sa.enrollment_id WHERE a.id=$1::uuid AND a.activity_id=$2::uuid
          AND sa.classroom_id=$3::uuid AND e.student_id=$4::uuid AND a.status='SUBMITTED' FOR SHARE OF a,sa,e`,...values);},
 insertReopenedAttempt(tx,...values) {return tx.query<Awaited<ReturnType<ActivityHistoryRepository['insertReopenedAttempt']>>[number]>(`INSERT INTO attempts(id,updated_at,student_activity_id,activity_id,attempt_number,opened_at,enabled_by_id,individual_deadline_at)
        VALUES($1::uuid,$2,$3::uuid,$4::uuid,$5,$2,$6::uuid,$7) RETURNING id`,...values);},
 copyPractical(tx,...values) {return tx.query<Awaited<ReturnType<ActivityHistoryRepository['copyPractical']>>[number]>('UPDATE attempts SET practical_response=(SELECT practical_response FROM attempts WHERE id=$2::uuid) WHERE id=$1::uuid RETURNING id',...values);},
 copyAnswers(tx,...values) {return tx.query<Awaited<ReturnType<ActivityHistoryRepository['copyAnswers']>>[number]>(`INSERT INTO answers(id,updated_at,attempt_id,activity_id,question_id,development_text,saved_at)
        SELECT gen_random_uuid(),$3,$1::uuid,activity_id,question_id,development_text,$3 FROM answers WHERE attempt_id=$2::uuid RETURNING id`,...values);},
 copySelections(tx,...values) {return tx.query<Awaited<ReturnType<ActivityHistoryRepository['copySelections']>>[number]>(`INSERT INTO answer_selections(answer_id,question_id,option_id)
        SELECT fresh.id,s.question_id,s.option_id FROM answers old JOIN answer_selections s ON s.answer_id=old.id
        JOIN answers fresh ON fresh.question_id=old.question_id AND fresh.attempt_id=$1::uuid WHERE old.attempt_id=$2::uuid RETURNING answer_id`,...values);},
 copyAttachments(tx,...values) {return tx.query<Awaited<ReturnType<ActivityHistoryRepository['copyAttachments']>>[number]>(`INSERT INTO attempt_attachments(attempt_id,activity_id,classroom_id,file_id,position)
        SELECT $1::uuid,activity_id,classroom_id,file_id,position FROM attempt_attachments WHERE attempt_id=$2::uuid RETURNING file_id`,...values);},
};
