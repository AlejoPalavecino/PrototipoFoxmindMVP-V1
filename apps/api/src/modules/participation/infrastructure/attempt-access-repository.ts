import { matchesEditor } from './attempt-policy.ts';
import type { AttemptAccessRepository } from '../application/attempt-access.ts';
export const repository: AttemptAccessRepository = {
 matchesEditor,
 lockClassroom(tx,...values) {return tx.query<Awaited<ReturnType<AttemptAccessRepository['lockClassroom']>>[number]>('SELECT archived_at FROM classrooms WHERE id=$1::uuid FOR UPDATE',...values);},
 lockAttempt(tx,...values) {return tx.query<Awaited<ReturnType<AttemptAccessRepository['lockAttempt']>>[number]>(`SELECT a.*,e.student_id,sa.is_expected,
    activity.status::text AS activity_status,activity.deadline_at,activity.allow_late_submissions,
    activity.type::text AS activity_type,activity.attachments_required
    FROM attempts a JOIN student_activities sa ON sa.id=a.student_activity_id
    JOIN enrollments e ON e.id=sa.enrollment_id JOIN activities activity ON activity.id=a.activity_id
    WHERE a.id=$1::uuid AND sa.classroom_id=$2::uuid
    FOR UPDATE OF activity,e,sa,a`,...values);},
 membership(tx,...values) {return tx.query<Awaited<ReturnType<AttemptAccessRepository['membership']>>[number]>(`SELECT id FROM membership_periods WHERE enrollment_id=
    (SELECT enrollment_id FROM student_activities WHERE id=$1::uuid) AND ended_at IS NULL FOR SHARE`,...values);},
 clock(tx,...values) {return tx.query<Awaited<ReturnType<AttemptAccessRepository['clock']>>[number]>('SELECT clock_timestamp() AS now',...values);},
};
