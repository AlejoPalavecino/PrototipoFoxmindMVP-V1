import type { ActivitySourceSnapshot } from '../../../../../../src/core/domain/index.ts';
import type { FileTransaction } from '../application/contracts.ts';
import type { FileService } from './service.ts';
import { requireReady } from '../domain/readiness.ts';
import { FileError } from '../domain/errors.ts';
import { uuid } from './store.ts';
import { PlanDocumentError } from '../domain/plan-document-error.ts';

export async function activitySourceSnapshot(files: FileService, tx: FileTransaction, request: unknown, classroomId: string, sourceId: string): Promise<ActivitySourceSnapshot> {
  if (!uuid(classroomId) || typeof sourceId !== 'string') throw new FileError('FORBIDDEN');
  const [kind, id] = sourceId.split(':');
  if (!uuid(id) || (kind !== 'plan' && kind !== 'material')) throw new FileError('FORBIDDEN');
  const sql = kind === 'plan' ? `SELECT file_id FROM study_plan_versions WHERE id=$1::uuid AND classroom_id=$2::uuid
    AND version_number=(SELECT max(version_number) FROM study_plan_versions WHERE classroom_id=$2::uuid) FOR SHARE`
    : 'SELECT file_id FROM materials WHERE id=$1::uuid AND classroom_id=$2::uuid AND deleted_at IS NULL FOR SHARE';
  const [source] = await tx.query<{ file_id: string }>(sql, id, classroomId);
  if (!source) throw new FileError('FILE_NOT_READY');
  const row = await files.store.loadAuthorized(tx, request, source.file_id, 'read');
  requireReady(row);
  if (row.classroom_id !== classroomId || row.classroom_draft_id !== null || row.purpose !== kind || !row.digest || row.blob_deleted_at)
    throw new FileError('FILE_NOT_READY');
  if (!['pdf', 'docx'].includes(row.extension)) throw new FileError('FILE_NOT_READY');
  if (Number(row.size_bytes) > 20_000_000) throw new PlanDocumentError('AI_INPUT_LIMIT');
  return { sourceId, fileId: row.id, digest: row.digest, extension: row.extension as 'pdf' | 'docx', sizeBytes: Number(row.size_bytes) };
}
