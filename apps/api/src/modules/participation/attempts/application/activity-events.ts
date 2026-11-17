import type { Transaction } from '../../../classrooms/public.ts';

export type ActivityEvent = 'ACTIVITY_PUBLISHED' | 'ACTIVITY_DEADLINE_CHANGED' | 'FIRST_SUBMISSION_ENABLED' | 'ATTEMPT_REOPENED' | 'SUBMISSION_RECEIVED';

/** Call once inside the locked source transition, never from a subsequent read or retry. */
export async function activityEvent(repository: ActivityEventsRepository, tx: Transaction, classroomId: string, activityId: string,
  event: ActivityEvent, recipient: string | null = null, attemptId: string | null = null) {
  await repository.insertEvent(tx, { classroomId: classroomId, activityId: activityId, event: event, recipientId: recipient, attemptId: attemptId });
}

export function deadlineChanged(before: Date | null, after: Date | null, beforeLate: boolean, afterLate: boolean) {
  return before?.getTime() !== after?.getTime() || beforeLate !== afterLate;
}

export interface ActivityEventsRepository {

 insertEvent(tx: Transaction, input: { classroomId: string; activityId: string; event: string; recipientId: string | null; attemptId: string | null }): Promise<({ id: string })[]>;
}
