import type { Transaction } from '../../classrooms/public.ts';

/** Transaction-only event hook. Caller holds the classroom lock; never call from a read or job. */
export async function recordActivityEligibility(repository: ActivityEligibilityRepository, tx: Transaction, classroomId: string,
  event: { publication: string } | { enrollment: string }) {
  const enrollments = await repository.enrollments(tx, classroomId, 'enrollment' in event ? event.enrollment : null);
  const activities = await repository.activities(tx, classroomId, 'publication' in event ? event.publication : null);
  const [{ now }] = await repository.clock(tx);
  for (const enrollment of enrollments) for (const activity of activities) {
    const expected = 'publication' in event || activity.deadline_at === null || activity.deadline_at > now;
    await repository.insertObligation(tx, repository.randomUUID(), now, classroomId, enrollment.id, activity.id, expected, enrollment.periods > 1 ? 'REENTRY' : 'INITIAL_ENROLLMENT', expected ? now : null);
  }
}

export interface ActivityEligibilityRepository {
 randomUUID: () => string;
 enrollments(tx: Transaction, ...values: unknown[]): Promise<({ id: string; periods: number })[]>;
 activities(tx: Transaction, ...values: unknown[]): Promise<({ id: string; deadline_at: Date | null })[]>;
 clock(tx: Transaction, ...values: unknown[]): Promise<({ now: Date })[]>;
 insertObligation(tx: Transaction, ...values: unknown[]): Promise<(Record<string, unknown>)[]>;
}
