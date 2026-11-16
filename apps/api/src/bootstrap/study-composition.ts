import { randomUUID, createHash } from 'node:crypto';
import { createStudyService as createApplication } from '../modules/study/application/service.ts';
import { createStudentUnitOfWork } from '../modules/study/infrastructure/folders/unit-of-work.ts';
import { createFolderRepository } from '../modules/study/infrastructure/folders/folder-repository.ts';
import { linkedClassrooms, verifyLink, folderSources, importClassroomPlan } from '../modules/study/infrastructure/folders/sources.ts';
import type { StudyOptions } from '../modules/study/application/contracts.ts';
export function createStudyService(options: StudyOptions) {
 return createApplication({ ...options, uow: createStudentUnitOfWork(options), folders: createFolderRepository(), linkedClassrooms, verifyLink, importPlan: importClassroomPlan,
  sources: (tx, row, ports) => folderSources(tx, row, { ...options, ...ports }), newId: randomUUID,
  digest: text => createHash('sha256').update(text).digest('hex') });
}
