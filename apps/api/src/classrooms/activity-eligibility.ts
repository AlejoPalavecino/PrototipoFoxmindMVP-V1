import { randomUUID } from 'node:crypto';
import type { Transaction } from './contracts.ts';

/** Transaction-only event hook. Caller holds the classroom lock; never call from a read or job. */
export async function recordActivityEligibility(tx: Transaction, classroomId: string,
  event: { publication: string } | { enrollment: string }) {
  const enrollments = await tx.query<{ id: string; periods: number }>(`SELECT e.id,
    (SELECT count(*)::int FROM membership_periods h WHERE h.enrollment_id=e.id) AS periods
    FROM enrollments e WHERE e.classroom_id=$1::uuid AND ($2::uuid IS NULL OR e.id=$2::uuid)
    AND EXISTS(SELECT 1 FROM membership_periods m WHERE m.enrollment_id=e.id AND m.ended_at IS NULL)
    ORDER BY e.id FOR UPDATE OF e`, classroomId, 'enrollment' in event ? event.enrollment : null);
  const activities = await tx.query<{ id: string; deadline_at: Date | null }>(`SELECT id,deadline_at FROM activities
    WHERE classroom_id=$1::uuid AND status='PUBLISHED' AND ($2::uuid IS NULL OR id=$2::uuid)
    ORDER BY id FOR UPDATE`, classroomId, 'publication' in event ? event.publication : null);
  const [{ now }] = await tx.query<{ now: Date }>('SELECT clock_timestamp() AS now');
  for (const enrollment of enrollments) for (const activity of activities) {
    const expected = 'publication' in event || activity.deadline_at === null || activity.deadline_at > now;
    await tx.query(`INSERT INTO student_activities(id,updated_at,classroom_id,enrollment_id,activity_id,
      is_expected,eligibility_reason,eligible_at) VALUES($1::uuid,$2,$3::uuid,$4::uuid,$5::uuid,$6,$7::"EligibilityReason",$8)
      ON CONFLICT(enrollment_id,activity_id) DO NOTHING RETURNING id`, randomUUID(), now, classroomId,
      enrollment.id, activity.id, expected, enrollment.periods > 1 ? 'REENTRY' : 'INITIAL_ENROLLMENT', expected ? now : null);
  }
}
