import { studentSnapshot, displayReferences } from '../modules/grading/student-analysis/infrastructure/student-ai/snapshot.ts';
import { GradingService as GradingServiceApplication } from '../modules/grading/review/application/grading.ts';
import { gradingRepository as GradingServiceRepository } from '../modules/grading/review/infrastructure/grading-repository.ts';
export class GradingService extends GradingServiceApplication {
 constructor(...args: ConstructorParameters<typeof GradingServiceApplication> extends [...infer Args, unknown] ? Args : never) {super(...args,GradingServiceRepository);}
}
import { GradePublicationService as GradePublicationServiceApplication } from '../modules/grading/publication/application/grade-publication.ts';
import { grade_publicationRepository as GradePublicationServiceRepository } from '../modules/grading/publication/infrastructure/grade-publication-repository.ts';
export class GradePublicationService extends GradePublicationServiceApplication {
 constructor(...args: ConstructorParameters<typeof GradePublicationServiceApplication> extends [...infer Args, unknown] ? Args : never) {super(...args,GradePublicationServiceRepository);}
}
import { GradeCorrectionService as GradeCorrectionServiceApplication } from '../modules/grading/corrections/application/grade-corrections.ts';
import { grade_correctionsRepository as GradeCorrectionServiceRepository } from '../modules/grading/corrections/infrastructure/grade-corrections-repository.ts';
export class GradeCorrectionService extends GradeCorrectionServiceApplication {
 constructor(...args: ConstructorParameters<typeof GradeCorrectionServiceApplication> extends [...infer Args, unknown] ? Args : never) {super(...args,GradeCorrectionServiceRepository);}
}
import { ProgressService as ProgressServiceApplication } from '../modules/grading/progress/application/progress.ts';
import { repository as ProgressServiceRepository } from '../modules/grading/progress/infrastructure/progress-repository.ts';
export class ProgressService extends ProgressServiceApplication {
 constructor(...args: ConstructorParameters<typeof ProgressServiceApplication> extends [...infer Args, unknown] ? Args : never) {super(...args,{...ProgressServiceRepository,studentSnapshot,displayReferences});}
}
import { TeacherSupportService } from '../modules/grading/progress/application/teacher-support.ts';
import { teacherSupportRepository } from '../modules/grading/progress/infrastructure/teacher-support-repository.ts';
import { readSharedStudyStrategies } from './study-composition.ts';
export function createTeacherSupportService(access: ConstructorParameters<typeof TeacherSupportService>[0]) {
  return new TeacherSupportService(access, teacherSupportRepository, readSharedStudyStrategies);
}
import { GradingAiService as GradingAiServiceApplication } from '../modules/grading/assistance/application/grading-ai/service.ts';
import { repository as GradingAiServiceRepository } from '../modules/grading/assistance/infrastructure/grading-ai/service-repository.ts';
export class GradingAiService extends GradingAiServiceApplication {
 constructor(...args: ConstructorParameters<typeof GradingAiServiceApplication> extends [...infer Args, unknown] ? Args : never) {super(...args,GradingAiServiceRepository);}
}
