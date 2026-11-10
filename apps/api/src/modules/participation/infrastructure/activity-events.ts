import * as application from '../application/activity-events.ts';
import { repository } from './activity-events-repository.ts';
export type { ActivityEvent, ActivityEventsRepository } from '../application/activity-events.ts';
export const activityEvent = application.activityEvent.bind(null,repository);
export const deadlineChanged = application.deadlineChanged;
