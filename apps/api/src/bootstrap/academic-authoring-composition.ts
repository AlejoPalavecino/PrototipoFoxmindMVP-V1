import { randomUUID } from 'node:crypto';
import { ActivityAuthoringService as Application } from '../modules/activities/authoring/application/activity-authoring.ts';
import { createAuthoringRepository } from '../modules/activities/authoring/infrastructure/authoring-repository.ts';
import { replaceActivityContent } from '../modules/activities/generation/infrastructure/activity-content.ts';
import { resolveActivityTopics, replaceActivityTopics, readActivityTopicScope } from '../modules/activities/generation/infrastructure/activity-topics.ts';
import { recordActivityEligibility } from '../modules/participation/attempts/infrastructure/activity-eligibility.ts';
import { activityEvent, deadlineChanged } from '../modules/participation/attempts/infrastructure/activity-events.ts';
export class ActivityAuthoringService extends Application {
 constructor(context: ConstructorParameters<typeof Application>[0], dependencies: ConstructorParameters<typeof Application>[1]) {
  super(context, dependencies, createAuthoringRepository(), { randomUUID, replaceActivityContent, resolveActivityTopics, replaceActivityTopics, readActivityTopicScope, recordActivityEligibility, activityEvent, deadlineChanged });
 }
}
