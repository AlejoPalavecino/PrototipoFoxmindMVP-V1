import { PlanService as Application } from '../modules/curriculum/application/plan.ts';
import { createTopicProgressRepository } from '../modules/curriculum/infrastructure/topic-progress-repository.ts';
export class PlanService extends Application {
 constructor(context: ConstructorParameters<typeof Application>[0]) { super(context, createTopicProgressRepository()); }
}
