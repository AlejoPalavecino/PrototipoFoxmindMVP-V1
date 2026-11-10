import { fail, text, uuid } from '../../classrooms/public.ts';
import type { Transaction } from '../../classrooms/public.ts';
import type { ClassroomFileOperations, MaterialPublisherPort } from './ports.ts';
import type { MaterialPublicationRepository } from './publication-repository.ts';

import type { MaterialPublicationInput } from './ports.ts';
export type { MaterialPublicationInput } from './ports.ts';

function revision(value: unknown): string {
  if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]{0,18})$/u.test(value) || BigInt(value) > 9223372036854775807n) return fail('INVALID_INPUT');
  return value;
}
async function association(repository: MaterialPublicationRepository, tx: Transaction, value: MaterialPublicationInput): Promise<void> {
  if (value.unitId !== null && !uuid(value.unitId)) return fail('INVALID_INPUT');
  if (value.topicId !== null && (!uuid(value.topicId) || value.unitId === null)) return fail('INVALID_INPUT');
  if (value.unitId !== null && !await repository.unit(tx,value.unitId,value.classroomId)) fail('FORBIDDEN');
  if (value.topicId !== null && !await repository.topic(tx,value.topicId,value.unitId!,value.classroomId)) fail('FORBIDDEN');
}
export function createMaterialPublisher(deps: ClassroomFileOperations, repository: MaterialPublicationRepository, newId: () => string): MaterialPublisherPort {
  const readyFile = deps.readyClassroomFile.bind(deps);
  return { async publish(tx: Transaction, request: unknown, actorId: string, input: MaterialPublicationInput) {
    if (!input) return fail('INVALID_INPUT');
    input = { classroomId: input.classroomId, revision: input.revision, title: input.title, fileId: input.fileId, unitId: input.unitId, topicId: input.topicId };
    if (!uuid(actorId) || !uuid(input.classroomId) || !uuid(input.fileId)) return fail('INVALID_INPUT');
    const expected = revision(input.revision), title = text(input.title, 200);
    const classroom = await repository.classroom(tx,input.classroomId,actorId);
    if (!classroom) return fail('FORBIDDEN');
    if (String(classroom.revision) !== expected || BigInt(expected) === 9223372036854775807n) return fail('CONFLICT');
    await association(repository, tx, input);
    const file = await readyFile(tx, request, input.classroomId, input.fileId, 'material');
    if (file.blob_deleted_at) return fail('CONFLICT');
    if (await repository.linked(tx,file.id)) return fail('CONFLICT');
    const materialId = newId();
    await repository.insert(tx,materialId,input,title,file.id,actorId);
    const { revision: classroomRevision } = await deps.advanceRevision(tx, input.classroomId, BigInt(classroom.revision));
    return { materialId, classroomRevision };
  } };
}
