import type { Transaction } from '../../../classrooms/public.ts';
import type { ActivityTopicSelection, ResolvedActivityScope } from '../../domain/topic-selection.ts';
import type { ActivityPayload } from '../../domain/activity-policy.ts';
export interface AuthoringOperations {
 randomUUID(): string;
 replaceActivityContent(tx: Transaction, row: { id: string; classroom_id: string }, payload: ActivityPayload): Promise<void>;
 recordActivityEligibility(tx: Transaction, classroomId: string, event: { enrollment: string } | { publication: string }): Promise<void>;
 activityEvent(tx: Transaction, classroomId: string, activityId: string, event: 'ACTIVITY_PUBLISHED' | 'ACTIVITY_DEADLINE_CHANGED' | 'FIRST_SUBMISSION_ENABLED' | 'ATTEMPT_REOPENED' | 'SUBMISSION_RECEIVED', recipient?: string | null, attemptId?: string | null): Promise<void>;
 deadlineChanged(before: Date | null, after: Date | null, beforeLate: boolean, afterLate: boolean): boolean;
 resolveActivityTopics(tx: Transaction, classroomId: string, selection: ActivityTopicSelection, required: boolean): Promise<ResolvedActivityScope>;
 replaceActivityTopics(tx: Transaction, id: string, classroomId: string, topics: ResolvedActivityScope['topics']): Promise<void>;
 readActivityTopicScope(tx: Transaction, id: string, unitId: string | null, topicId: string | null): Promise<{ topicIds: string[]; unitIds: string[] }>;
}
