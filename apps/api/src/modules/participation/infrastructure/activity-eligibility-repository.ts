import { randomUUID, randomBytes } from 'node:crypto';
import type { ActivityEligibilityRepository } from '../application/activity-eligibility.ts';
export const repository: ActivityEligibilityRepository = {
 randomUUID,
 enrollments(tx,...values) {return tx.query<Awaited<ReturnType<ActivityEligibilityRepository['enrollments']>>[number]>(`SELECT e.id,
    (SELECT count(*)::int FROM membership_periods h WHERE h.enrollment_id=e.id) AS periods
    FROM enrollments e WHERE e.classroom_id=$1::uuid AND ($2::uuid IS NULL OR e.id=$2::uuid)
    AND EXISTS(SELECT 1 FROM membership_periods m WHERE m.enrollment_id=e.id AND m.ended_at IS NULL)
    ORDER BY e.id FOR UPDATE OF e`,...values);},
 activities(tx,...values) {return tx.query<Awaited<ReturnType<ActivityEligibilityRepository['activities']>>[number]>(`SELECT id,deadline_at FROM activities
    WHERE classroom_id=$1::uuid AND status='PUBLISHED' AND ($2::uuid IS NULL OR id=$2::uuid)
    ORDER BY id FOR UPDATE`,...values);},
 clock(tx,...values) {return tx.query<Awaited<ReturnType<ActivityEligibilityRepository['clock']>>[number]>('SELECT clock_timestamp() AS now',...values);},
 insertObligation(tx,...values) {return tx.query<Awaited<ReturnType<ActivityEligibilityRepository['insertObligation']>>[number]>(`INSERT INTO student_activities(id,updated_at,classroom_id,enrollment_id,activity_id,
      is_expected,eligibility_reason,eligible_at) VALUES($1::uuid,$2,$3::uuid,$4::uuid,$5::uuid,$6,$7::"EligibilityReason",$8)
      ON CONFLICT(enrollment_id,activity_id) DO NOTHING RETURNING id`,...values);},
};
