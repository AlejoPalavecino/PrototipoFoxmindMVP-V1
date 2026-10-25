import { isDeepStrictEqual } from 'node:util';
import type { ActivitySourceGrant } from '../../../../../src/core/domain/index.ts';
import type { Transaction } from '../contracts.ts';
import type { ActivityAiOptions, JobRow } from './contracts.ts';
import { curriculum } from './source.ts';
import { fenced } from './queue.ts';

export async function validSource(options: ActivityAiOptions, tx: Transaction, row: JobRow, signal: AbortSignal, grants?: ActivitySourceGrant[]) {
  try {
    const current = await curriculum(tx, row.classroom_id, row.input_payload);
    if (current.teacherId !== row.owner_id || !isDeepStrictEqual(current, row.curriculum_snapshot)) return false;
    for (const source of row.source_snapshot) {
      const grant = grants?.find(g => g.sourceId === source.sourceId) ?? { ownerId: row.owner_id, classroomId: row.classroom_id, ...source };
      const actual = options.reader.snapshotWorker ? await options.reader.snapshotWorker(tx, grant, signal)
        : await options.reader.snapshot(tx, grant, row.classroom_id, source.sourceId);
      if (!isDeepStrictEqual(actual, source)) return false;
    }
    return true;
  } catch (error) {
    if (['FORBIDDEN', 'CONFLICT', 'FILE_NOT_READY', 'AI_INPUT_LIMIT'].includes(String((error as {code?: string}).code))) return false;
    throw error;
  }
}
export async function requireGrant(options: ActivityAiOptions, tx: Transaction, row: JobRow | undefined,
  grant: ActivitySourceGrant, signal: AbortSignal) {
  if (signal.aborted || !row || !row.source_snapshot.some(s => s.sourceId === grant.sourceId && s.fileId === grant.fileId && s.digest === grant.digest))
    throw Object.assign(new Error('FILE_NOT_READY'), { code: 'FILE_NOT_READY' });
  const lease = await fenced(tx, row, options.configuration.maxJobAgeMs, false);
  if (!lease || lease.expired) throw Object.assign(new Error('FILE_NOT_READY'), { code: 'FILE_NOT_READY' });
  const current = await curriculum(tx, row.classroom_id, row.input_payload);
  if (current.teacherId !== row.owner_id || !isDeepStrictEqual(current, row.curriculum_snapshot))
    throw Object.assign(new Error('FILE_NOT_READY'), { code: 'FILE_NOT_READY' });
}
