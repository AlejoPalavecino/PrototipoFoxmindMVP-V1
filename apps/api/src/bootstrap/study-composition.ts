import { randomUUID, createHash } from 'node:crypto';
import { createStudyService as createApplication } from '../modules/study/folders/application/service.ts';
import { createStudentUnitOfWork } from '../modules/study/folders/infrastructure/unit-of-work.ts';
import { createFolderRepository } from '../modules/study/folders/infrastructure/folder-repository.ts';
import { linkedClassrooms, verifyLink, folderSources, importClassroomPlan } from '../modules/study/sources/infrastructure/sources.ts';
import type { StudyOptions } from '../modules/study/folders/application/contracts.ts';
import { createAiChatTimings } from '../platform/ai/text-metrics.ts';
import { createSharedStudyStrategyService } from '../modules/study/strategies/public.ts';
import { sharedStudyStrategyRepository } from '../modules/study/strategies/infrastructure/repository.ts';
export { readSharedStudyStrategies } from '../modules/study/strategies/infrastructure/repository.ts';
export function createStudyService(options: StudyOptions) {
 const uow = createStudentUnitOfWork(options);
 const service = createApplication({ ...options, uow, folders: createFolderRepository(), linkedClassrooms, verifyLink, importPlan: importClassroomPlan,
  createTimings: flow => createAiChatTimings('study', flow),
  sources: (tx, row, ports) => folderSources(tx, row, { ...options, ...ports }), newId: randomUUID,
  digest: text => createHash('sha256').update(text).digest('hex') });
 return { ...service, sharedStrategy: createSharedStudyStrategyService(uow, sharedStudyStrategyRepository, randomUUID) };
}
