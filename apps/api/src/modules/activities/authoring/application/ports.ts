import type { ActivityAuthoringService } from './activity-authoring.ts';
/** Transaction-scoped authoring reads; callers keep their existing unit of work. */
export type ActivityReadPort = Pick<ActivityAuthoringService, 'activity' | 'activityView' | 'activitySummary'>;

export interface ActivityDraftWriterPort { (tx: import('../../../classrooms/public.ts').Transaction, input: { classroomId: string; type: import('../../domain/activity-policy.ts').ActivityType; payload: import('../../domain/activity-policy.ts').ActivityPayload; now: Date }): Promise<string> }
