import { GradingService as GradingServiceApplication } from '../modules/grading/application/grading.ts';
import { gradingRepository as GradingServiceRepository } from '../modules/grading/infrastructure/grading-repository.ts';
export class GradingService extends GradingServiceApplication {
 constructor(...args: ConstructorParameters<typeof GradingServiceApplication> extends [...infer Args, unknown] ? Args : never) {super(...args,GradingServiceRepository);}
}
import { GradePublicationService as GradePublicationServiceApplication } from '../modules/grading/application/grade-publication.ts';
import { grade_publicationRepository as GradePublicationServiceRepository } from '../modules/grading/infrastructure/grade-publication-repository.ts';
export class GradePublicationService extends GradePublicationServiceApplication {
 constructor(...args: ConstructorParameters<typeof GradePublicationServiceApplication> extends [...infer Args, unknown] ? Args : never) {super(...args,GradePublicationServiceRepository);}
}
import { GradeCorrectionService as GradeCorrectionServiceApplication } from '../modules/grading/application/grade-corrections.ts';
import { grade_correctionsRepository as GradeCorrectionServiceRepository } from '../modules/grading/infrastructure/grade-corrections-repository.ts';
export class GradeCorrectionService extends GradeCorrectionServiceApplication {
 constructor(...args: ConstructorParameters<typeof GradeCorrectionServiceApplication> extends [...infer Args, unknown] ? Args : never) {super(...args,GradeCorrectionServiceRepository);}
}
import { ProgressService as ProgressServiceApplication } from '../modules/grading/application/progress.ts';
import { repository as ProgressServiceRepository } from '../modules/grading/infrastructure/progress-repository.ts';
export class ProgressService extends ProgressServiceApplication {
 constructor(...args: ConstructorParameters<typeof ProgressServiceApplication> extends [...infer Args, unknown] ? Args : never) {super(...args,ProgressServiceRepository);}
}
import { GradingAiService as GradingAiServiceApplication } from '../modules/grading/application/grading-ai/service.ts';
import { repository as GradingAiServiceRepository } from '../modules/grading/infrastructure/grading-ai/service-repository.ts';
export class GradingAiService extends GradingAiServiceApplication {
 constructor(...args: ConstructorParameters<typeof GradingAiServiceApplication> extends [...infer Args, unknown] ? Args : never) {super(...args,GradingAiServiceRepository);}
}
