import { enqueueSubmittedAttemptGradingAi } from '../modules/grading/infrastructure/grading-ai/enqueue.ts';
import { readActivityTopics } from '../modules/activities/infrastructure/activity-topics.ts';
import { ActivityParticipationService as ActivityParticipationServiceApplication } from '../modules/participation/application/activity-participation.ts';
import { repository as ActivityParticipationServiceRepository } from '../modules/participation/infrastructure/activity-participation-repository.ts';
export class ActivityParticipationService extends ActivityParticipationServiceApplication {
 constructor(...args: ConstructorParameters<typeof ActivityParticipationServiceApplication> extends [...infer Args, unknown] ? Args : never){super(...args,ActivityParticipationServiceRepository);}
}
import { ActivityHistoryService as ActivityHistoryServiceApplication } from '../modules/participation/application/activity-history.ts';
import { repository as ActivityHistoryServiceRepository } from '../modules/participation/infrastructure/activity-history-repository.ts';
export class ActivityHistoryService extends ActivityHistoryServiceApplication {
 constructor(...args: ConstructorParameters<typeof ActivityHistoryServiceApplication> extends [...infer Args, unknown] ? Args : never){super(...args,{...ActivityHistoryServiceRepository,readActivityTopics});}
}
import { QuestionnaireAttemptService as QuestionnaireAttemptServiceApplication } from '../modules/participation/application/questionnaire-attempts.ts';
import { repository as QuestionnaireAttemptServiceRepository } from '../modules/participation/infrastructure/questionnaire-attempts-repository.ts';
export class QuestionnaireAttemptService extends QuestionnaireAttemptServiceApplication {
 constructor(...args: ConstructorParameters<typeof QuestionnaireAttemptServiceApplication> extends [...infer Args, unknown] ? Args : never){super(...args,{...QuestionnaireAttemptServiceRepository,enqueueSubmittedAttemptGradingAi});}
}
import { PracticalSubmissionService as PracticalSubmissionServiceApplication } from '../modules/participation/application/practical-submissions.ts';
import { repository as PracticalSubmissionServiceRepository } from '../modules/participation/infrastructure/practical-submissions-repository.ts';
export class PracticalSubmissionService extends PracticalSubmissionServiceApplication {
 constructor(...args: ConstructorParameters<typeof PracticalSubmissionServiceApplication> extends [...infer Args, unknown] ? Args : never){super(...args,{...PracticalSubmissionServiceRepository,enqueueSubmittedAttemptGradingAi});}
}
