import { randomUUID } from 'node:crypto';
import { requireReady, type FileStore } from '../files/public/index.ts';
import { fail, text, uuid } from './policy.ts';
import type { Transaction } from './contracts.ts';
import type { PlanService } from './plan.ts';

type Input = { classroomId: string; revision: string; title: string; fileId: string; unitId: string | null; topicId: string | null };
function revision(value: unknown): string {
  if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]{0,18})$/u.test(value) || BigInt(value) > 9223372036854775807n) return fail('INVALID_INPUT');
  return value;
}
type Dependencies = { files: FileStore } | { readyClassroomFile: PlanService['readyClassroomFile']; advanceRevision: PlanService['advanceRevision'] };
async function association(tx: Transaction, value: Input): Promise<void> {
  if (value.unitId !== null && !uuid(value.unitId)) return fail('INVALID_INPUT');
  if (value.topicId !== null && (!uuid(value.topicId) || value.unitId === null)) return fail('INVALID_INPUT');
  if (value.unitId !== null && !(await tx.query('SELECT id FROM units WHERE id=$1::uuid AND classroom_id=$2::uuid FOR SHARE', value.unitId, value.classroomId)).length) fail('FORBIDDEN');
  if (value.topicId !== null && !(await tx.query('SELECT id FROM topics WHERE id=$1::uuid AND unit_id=$2::uuid AND classroom_id=$3::uuid FOR SHARE', value.topicId, value.unitId, value.classroomId)).length) fail('FORBIDDEN');
}
async function fileFor(deps: Dependencies, tx: Transaction, request: unknown, value: Input) {
  if ('readyClassroomFile' in deps) return deps.readyClassroomFile(tx, request, value.classroomId, value.fileId, 'material');
  const row = await deps.files.load(tx, value.fileId);
  if (row.classroom_id !== value.classroomId || row.classroom_draft_id !== null || row.purpose !== 'material' || row.target_id !== null) return fail('FORBIDDEN');
  const current = await deps.files.loadAuthorized(tx, request, value.fileId, 'read'); requireReady(current); return current;
}
export function createLibraryMaterialPublisher(deps: Dependencies) {
  return { async publish(tx: Transaction, request: unknown, actorId: string, input: Input) {
    if (!input) return fail('INVALID_INPUT');
    input = { classroomId: input.classroomId, revision: input.revision, title: input.title, fileId: input.fileId, unitId: input.unitId, topicId: input.topicId };
    if (!uuid(actorId) || !uuid(input.classroomId) || !uuid(input.fileId)) return fail('INVALID_INPUT');
    const expected = revision(input.revision), title = text(input.title, 200);
    const [classroom] = await tx.query<{ revision: bigint }>(`SELECT revision FROM classrooms
      WHERE id=$1::uuid AND teacher_id=$2::uuid AND archived_at IS NULL FOR UPDATE`, input.classroomId, actorId);
    if (!classroom) return fail('FORBIDDEN');
    if (String(classroom.revision) !== expected || BigInt(expected) === 9223372036854775807n) return fail('CONFLICT');
    await association(tx, input);
    const file = await fileFor(deps, tx, request, input);
    if (file.blob_deleted_at) return fail('CONFLICT');
    if ((await tx.query('SELECT id FROM materials WHERE file_id=$1::uuid', file.id)).length) return fail('CONFLICT');
    const materialId = randomUUID();
    await tx.query(`INSERT INTO materials(id,updated_at,classroom_id,title,file_id,unit_id,topic_id,created_by_id)
      VALUES($1::uuid,clock_timestamp(),$2::uuid,$3,$4::uuid,$5::uuid,$6::uuid,$7::uuid) RETURNING id`,
    materialId, input.classroomId, title, file.id, input.unitId, input.topicId, actorId);
    await tx.query('UPDATE classrooms SET revision=revision+1,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id', input.classroomId);
    return { materialId, classroomRevision: String(BigInt(classroom.revision) + 1n) };
  } };
}
