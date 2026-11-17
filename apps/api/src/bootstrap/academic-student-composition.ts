import { assertAttemptWrite } from '../modules/participation/attempts/infrastructure/attempt-access.ts';
import { activityEvent } from '../modules/participation/attempts/infrastructure/activity-events.ts';
import { practicalAttachments, questionnaireUnanswered } from '../modules/participation/attempts/infrastructure/session-readers.ts';
import { submissionReceipt } from '../modules/participation/attempts/infrastructure/submission-receipt.ts';
import { enqueueSubmittedAttemptGradingAi } from '../modules/grading/assistance/infrastructure/grading-ai/enqueue.ts';
import { readActivityTopics } from '../modules/activities/generation/infrastructure/activity-topics.ts';
import { ActivityParticipationService as ActivityParticipationServiceApplication } from '../modules/participation/attempts/application/activity-participation.ts';
import { repository as ActivityParticipationServiceRepository } from '../modules/participation/attempts/infrastructure/activity-participation-repository.ts';
export class ActivityParticipationService extends ActivityParticipationServiceApplication {
 constructor(...args: ConstructorParameters<typeof ActivityParticipationServiceApplication> extends [...infer Args, unknown] ? Args : never){super(...args,ActivityParticipationServiceRepository);}
}
import { ActivityHistoryService as ActivityHistoryServiceApplication } from '../modules/participation/history/application/activity-history.ts';
import { repository as ActivityHistoryServiceRepository } from '../modules/participation/history/infrastructure/activity-history-repository.ts';
export class ActivityHistoryService extends ActivityHistoryServiceApplication {
 constructor(...args: ConstructorParameters<typeof ActivityHistoryServiceApplication> extends [...infer Args, unknown] ? Args : never){super(...args,{...ActivityHistoryServiceRepository,readActivityTopics,activityEvent});}
}
import { QuestionnaireAttemptService as QuestionnaireAttemptServiceApplication } from '../modules/participation/questionnaires/application/questionnaire-attempts.ts';
import { repository as QuestionnaireAttemptServiceRepository } from '../modules/participation/questionnaires/infrastructure/questionnaire-attempts-repository.ts';
export class QuestionnaireAttemptService extends QuestionnaireAttemptServiceApplication {
 constructor(...args: ConstructorParameters<typeof QuestionnaireAttemptServiceApplication> extends [...infer Args, unknown] ? Args : never){super(...args,{...QuestionnaireAttemptServiceRepository,enqueueSubmittedAttemptGradingAi,assertAttemptWrite,activityEvent,questionnaireUnanswered,submissionReceipt});}
}
import { PracticalSubmissionService as PracticalSubmissionServiceApplication } from '../modules/participation/practical-submissions/application/practical-submissions.ts';
import { repository as PracticalSubmissionServiceRepository } from '../modules/participation/practical-submissions/infrastructure/practical-submissions-repository.ts';
export class PracticalSubmissionService extends PracticalSubmissionServiceApplication {
 constructor(...args: ConstructorParameters<typeof PracticalSubmissionServiceApplication> extends [...infer Args, unknown] ? Args : never){super(...args,{...PracticalSubmissionServiceRepository,enqueueSubmittedAttemptGradingAi,assertAttemptWrite,activityEvent,practicalAttachments,submissionReceipt});}
}
