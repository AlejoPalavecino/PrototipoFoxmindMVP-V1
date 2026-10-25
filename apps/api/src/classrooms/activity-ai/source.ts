import type { StartActivityGeneration, ActivitySourceSnapshot } from '../../../../../src/core/domain/index.ts';
import { fail } from '../policy.ts';
import type { Transaction } from '../contracts.ts';
import type { ActivityAiOptions, CurriculumSnapshot, JobRow } from './contracts.ts';
import { isDeepStrictEqual } from 'node:util';

export async function curriculum(tx: Transaction, classroomId: string, input: StartActivityGeneration): Promise<CurriculumSnapshot> {
  const [room] = await tx.query<{ teacher_id: string; archived_at: Date | null; email_verified_at: Date | null }>(`SELECT c.teacher_id,c.archived_at,u.email_verified_at
    FROM classrooms c JOIN users u ON u.id=c.teacher_id WHERE c.id=$1::uuid FOR UPDATE OF c`, classroomId);
  if (!room || !room.email_verified_at) return fail('FORBIDDEN');
  if (room.archived_at) return fail('CONFLICT');
  const [unit] = await tx.query<{ id: string; name: string }>('SELECT id,name FROM units WHERE id=$1::uuid AND classroom_id=$2::uuid FOR SHARE', input.unitId, classroomId);
  if (!unit) return fail('FORBIDDEN');
  const topics = await tx.query<{ id: string; name: string }>(`SELECT id,name FROM topics WHERE id=ANY($1::uuid[]) AND unit_id=$2::uuid AND classroom_id=$3::uuid ORDER BY id FOR SHARE`, input.topicIds, unit.id, classroomId);
  if (topics.length !== input.topicIds.length) return fail('FORBIDDEN');
  const [plan] = await tx.query<{ id: string }>('SELECT id FROM study_plan_versions WHERE classroom_id=$1::uuid ORDER BY version_number DESC LIMIT 1 FOR SHARE', classroomId);
  return { teacherId: room.teacher_id, unit, topics, latestPlanId: plan?.id ?? null };
}
export async function snapshots(options: Pick<ActivityAiOptions, 'reader'>, tx: Transaction, request: unknown, classroomId: string, input: StartActivityGeneration) {
  const selected: ActivitySourceSnapshot[] = [];
  for (const id of input.sourceIds) {
    const source = await options.reader.snapshot(tx, request, classroomId, id);
    if (source.sourceId !== id || !Number.isSafeInteger(source.sizeBytes) || source.sizeBytes < 1 || source.sizeBytes > 20_000_000
      || !['pdf', 'docx'].includes(source.extension)) throw Object.assign(new Error('AI_INPUT_LIMIT'), { code: 'AI_INPUT_LIMIT' });
    if (source.extension === 'docx' && !input.acknowledgedWarnings.includes('DOCX_IMAGES_OMITTED')) return fail('INVALID_INPUT');
    selected.push(source);
  }
  if (selected.reduce((sum, s) => sum + s.sizeBytes, 0) > 20_000_000) throw Object.assign(new Error('AI_INPUT_LIMIT'), { code: 'AI_INPUT_LIMIT' });
  return selected;
}
export async function revalidate(options: Pick<ActivityAiOptions, 'reader'>, tx: Transaction, request: unknown, row: JobRow): Promise<boolean> {
  try {
    const current = await curriculum(tx, row.classroom_id, row.input_payload);
    if (!isDeepStrictEqual(current, row.curriculum_snapshot) || current.teacherId !== row.owner_id) return false;
    const selected = await snapshots(options, tx, request, row.classroom_id, row.input_payload);
    return isDeepStrictEqual(selected, row.source_snapshot);
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (['FORBIDDEN', 'CONFLICT', 'FILE_NOT_READY', 'INVALID_INPUT', 'AI_INPUT_LIMIT'].includes(code ?? '')) return false;
    throw error;
  }
}
