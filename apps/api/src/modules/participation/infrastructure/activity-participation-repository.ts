import { randomUUID, randomBytes } from 'node:crypto';
import { digest } from '../../../platform/crypto/digest.ts';
import { resolveAttemptContext, type AttemptRow, type Obligation } from './attempt-access.ts';
import { activityEvent } from './activity-events.ts';
import { isVerifiedRead } from '../../classrooms/public.ts';
import type { ActivityParticipationRepository } from '../application/activity-participation.ts';
export const repository: ActivityParticipationRepository = {
 randomUUID,
 editorToken: () => randomBytes(32).toString('base64url'),
 digest,
 resolveAttemptContext,
 activityEvent,
 obligation(tx,...values) {return tx.query<Awaited<ReturnType<ActivityParticipationRepository['obligation']>>[number]>(`SELECT sa.* FROM student_activities sa JOIN enrollments e ON e.id=sa.enrollment_id
      WHERE sa.classroom_id=$1::uuid AND sa.activity_id=$2::uuid AND e.student_id=$3::uuid FOR ${isVerifiedRead(tx) ? 'SHARE' : 'UPDATE'} OF e,sa`,...values);},
 latestAttempt(tx,...values) {return tx.query<Awaited<ReturnType<ActivityParticipationRepository['latestAttempt']>>[number]>(`SELECT * FROM attempts WHERE student_activity_id=$1::uuid
        ORDER BY attempt_number DESC LIMIT 1 FOR ${isVerifiedRead(tx) ? 'SHARE' : 'UPDATE'}`,...values);},
 sessionClock(tx,...values) {return tx.query<Awaited<ReturnType<ActivityParticipationRepository['sessionClock']>>[number]>('SELECT clock_timestamp() AS now',...values);},
 existingAttempt(tx,...values) {return tx.query<Awaited<ReturnType<ActivityParticipationRepository['existingAttempt']>>[number]>(`SELECT * FROM attempts WHERE student_activity_id=$1::uuid
        ORDER BY attempt_number DESC LIMIT 1 FOR UPDATE`,...values);},
 startClock(tx,...values) {return tx.query<Awaited<ReturnType<ActivityParticipationRepository['startClock']>>[number]>('SELECT clock_timestamp() AS now',...values);},
 insertAttempt(tx,...values) {return tx.query<Awaited<ReturnType<ActivityParticipationRepository['insertAttempt']>>[number]>(`INSERT INTO attempts(id,updated_at,student_activity_id,activity_id,attempt_number,
        opened_at,individual_deadline_at,editor_token_hash,editor_epoch,revision)
        VALUES($1::uuid,$2,$3::uuid,$4::uuid,1,$2,$5,$6,$7,0) RETURNING *`,...values);},
 markStarted(tx,...values) {return tx.query<Awaited<ReturnType<ActivityParticipationRepository['markStarted']>>[number]>(`UPDATE activities SET first_started_at=COALESCE(first_started_at,$2),updated_at=$2
        WHERE id=$1::uuid RETURNING id`,...values);},
 transferEditor(tx,...values) {return tx.query<Awaited<ReturnType<ActivityParticipationRepository['transferEditor']>>[number]>(`UPDATE attempts SET editor_token_hash=$2,editor_epoch=editor_epoch+1,
        revision=revision+1,updated_at=$3 WHERE id=$1::uuid RETURNING *`,...values);},
 eligibilityStudents(tx,...values) {return tx.query<Awaited<ReturnType<ActivityParticipationRepository['eligibilityStudents']>>[number]>(`SELECT e.student_id AS "studentId",u.first_name AS "firstName",u.last_name AS "lastName",
        COALESCE(sa.is_expected,false) AS expected,sa.eligibility_reason::text AS reason,sa.first_submission_deadline_at AS "individualDeadlineAt"
        FROM enrollments e JOIN users u ON u.id=e.student_id LEFT JOIN student_activities sa
        ON sa.enrollment_id=e.id AND sa.activity_id=$2::uuid WHERE e.classroom_id=$1::uuid
        AND EXISTS(SELECT 1 FROM membership_periods m WHERE m.enrollment_id=e.id AND m.ended_at IS NULL)
        ORDER BY u.last_name,u.first_name,e.id`,...values);},
 lockMember(tx,...values) {return tx.query<Awaited<ReturnType<ActivityParticipationRepository['lockMember']>>[number]>(`SELECT e.id FROM enrollments e JOIN membership_periods m ON m.enrollment_id=e.id
        WHERE e.classroom_id=$1::uuid AND e.student_id=$2::uuid AND m.ended_at IS NULL FOR UPDATE OF e FOR SHARE OF m`,...values);},
 priorAttempts(tx,...values) {return tx.query<Awaited<ReturnType<ActivityParticipationRepository['priorAttempts']>>[number]>('SELECT * FROM attempts WHERE student_activity_id=$1::uuid ORDER BY attempt_number FOR UPDATE',...values);},
 authorizationClock(tx,...values) {return tx.query<Awaited<ReturnType<ActivityParticipationRepository['authorizationClock']>>[number]>('SELECT clock_timestamp() AS now',...values);},
 authorizeObligation(tx,...values) {return tx.query<Awaited<ReturnType<ActivityParticipationRepository['authorizeObligation']>>[number]>(`UPDATE student_activities SET is_expected=true,eligibility_reason='TEACHER_AUTHORIZATION',eligible_at=$2,
        authorized_by_id=$3::uuid,first_submission_deadline_at=$4,updated_at=$2 WHERE id=$1::uuid RETURNING id`,...values);},
 authorizeAttempt(tx,...values) {return tx.query<Awaited<ReturnType<ActivityParticipationRepository['authorizeAttempt']>>[number]>(`UPDATE attempts SET individual_deadline_at=$2,updated_at=$3
        WHERE id=$1::uuid RETURNING id`,...values);},
};
