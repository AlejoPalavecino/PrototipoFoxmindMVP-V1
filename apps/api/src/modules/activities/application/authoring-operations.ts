import type { Transaction } from '../../classrooms/public.ts';
import type { ActivityPayload } from '../domain/activity-policy.ts';
export interface AuthoringOperations {
 randomUUID(): string;
 replaceActivityContent(tx: Transaction, row: { id: string; classroom_id: string }, payload: ActivityPayload): Promise<void>;
 recordActivityEligibility(tx: Transaction, classroomId: string, event: { enrollment: string } | { publication: string }): Promise<void>;
 activityEvent(tx: Transaction, classroomId: string, activityId: string, event: 'ACTIVITY_PUBLISHED' | 'ACTIVITY_DEADLINE_CHANGED' | 'FIRST_SUBMISSION_ENABLED' | 'ATTEMPT_REOPENED' | 'SUBMISSION_RECEIVED', recipient?: string | null, attemptId?: string | null): Promise<void>;
 deadlineChanged(before: Date | null, after: Date | null, beforeLate: boolean, afterLate: boolean): boolean;
 validateActivityTopics(tx: Transaction, classroomId: string, unitId: string | null, topicIds: string[]): Promise<void>;
 replaceActivityTopics(tx: Transaction, id: string, classroomId: string, unitId: string | null, topicIds: string[]): Promise<void>;
 readActivityTopics(tx: Transaction, id: string, legacy: string | null): Promise<string[]>;
}
