import { createHash } from 'node:crypto';
import { LibraryService as Application } from '../modules/materials/application/library.ts';
import { createLibraryRepository } from '../modules/materials/infrastructure/library-repository.ts';
import { createMaterialPublisher } from '../modules/materials/application/library-publication.ts';
import { createMaterialPublicationRepository } from '../modules/materials/infrastructure/publication-repository.ts';
import { createReadyClassroomFile } from '../modules/materials/infrastructure/classroom-file.ts';
import { advanceClassroomRevision } from '../modules/classrooms/infrastructure/revision.ts';
import type { ClassroomFileOperations } from '../modules/materials/public.ts';
import type { FileCustodyPort } from '../modules/files/public.ts';
import { randomUUID } from 'node:crypto';
export class LibraryService extends Application {
 constructor(context: ConstructorParameters<typeof Application>[0], dependencies: Omit<ConstructorParameters<typeof Application>[1], 'publisher'>) {
  super(context, { ...dependencies, publisher: createLibraryMaterialPublisher(dependencies) }, createLibraryRepository(), content => createHash('sha256').update(content).digest('hex'));
 }
}

export function createLibraryMaterialPublisher(deps: ClassroomFileOperations | { files: Pick<FileCustodyPort,'load'|'loadAuthorized'> }) {
 const operations = { readyClassroomFile: 'readyClassroomFile' in deps ? deps.readyClassroomFile.bind(deps) : createReadyClassroomFile(deps.files), advanceRevision: advanceClassroomRevision };
 return createMaterialPublisher(operations,createMaterialPublicationRepository(),randomUUID);
}
