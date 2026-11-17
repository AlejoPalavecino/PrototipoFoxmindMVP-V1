import { randomUUID, createHash } from 'node:crypto';
import { createStudyService as createApplication } from '../modules/study/folders/application/service.ts';
import { createStudentUnitOfWork } from '../modules/study/folders/infrastructure/unit-of-work.ts';
import { createFolderRepository } from '../modules/study/folders/infrastructure/folder-repository.ts';
import { linkedClassrooms, verifyLink, folderSources, importClassroomPlan } from '../modules/study/sources/infrastructure/sources.ts';
import type { StudyOptions } from '../modules/study/folders/application/contracts.ts';
export function createStudyService(options: StudyOptions) {
 return createApplication({ ...options, uow: createStudentUnitOfWork(options), folders: createFolderRepository(), linkedClassrooms, verifyLink, importPlan: importClassroomPlan,
  sources: (tx, row, ports) => folderSources(tx, row, { ...options, ...ports }), newId: randomUUID,
  digest: text => createHash('sha256').update(text).digest('hex') });
}
