import type { Transaction } from '../../../classrooms/public.ts';

/** Transaction-only event hook. Caller holds the classroom lock; never call from a read or job. */
export async function recordActivityEligibility(repository: ActivityEligibilityRepository, tx: Transaction, classroomId: string,
  event: { publication: string } | { enrollment: string }) {
  const enrollments = await repository.enrollments(tx, { classroomId: classroomId, enrollmentId: 'enrollment' in event ? event.enrollment : null });
  const activities = await repository.activities(tx, { classroomId: classroomId, activityId: 'publication' in event ? event.publication : null });
  const [{ now }] = await repository.clock(tx);
  for (const enrollment of enrollments) for (const activity of activities) {
    const expected = 'publication' in event || activity.deadline_at === null || activity.deadline_at > now;
    await repository.insertObligation(tx, { id: repository.randomUUID(), now: now, classroomId: classroomId, enrollmentId: enrollment.id, activityId: activity.id, expected: expected, reason: enrollment.periods > 1 ? 'REENTRY' : 'INITIAL_ENROLLMENT', eligibleAt: expected ? now : null });
  }
}

export interface ActivityEligibilityRepository {
 randomUUID: () => string;
 enrollments(tx: Transaction, input: { classroomId: string; enrollmentId: string | null }): Promise<({ id: string; periods: number })[]>;
 activities(tx: Transaction, input: { classroomId: string; activityId: string | null }): Promise<({ id: string; deadline_at: Date | null })[]>;
 clock(tx: Transaction): Promise<({ now: Date })[]>;
 insertObligation(tx: Transaction, input: { id: string; now: Date; classroomId: string; enrollmentId: string; activityId: string; expected: boolean; reason: string; eligibleAt: Date | null }): Promise<({ id: string })[]>;
}
