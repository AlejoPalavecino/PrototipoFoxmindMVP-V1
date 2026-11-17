import { isDocumentExtension } from '../../../../../../../src/core/domain/documents/document-formats.ts';
import type { SqlTransaction } from '../../../../../../../src/core/contracts/sql.ts';
import type { FoxyGroundingFile, FoxyGroundingSource } from '../../../../../../../src/core/domain/foxy/grounding.ts';

type FileRow = { file_id: string; digest: string | null; extension: string; size_bytes: bigint | string; purpose: string; target_id: string | null; ready: boolean };
const fileFields = `f.id AS file_id,c.digest,f.extension,f.size_bytes,c.purpose,c.target_id,
  COALESCE(f.blob_deleted_at IS NULL AND c.phase='ready' AND u.status='COMPLETED' AND f.validation_status='APPROVED'
    AND f.scan_status='CLEAN' AND c.digest IS NOT NULL AND c.digest=c.validated_digest AND c.digest=c.scanned_digest,false) AS ready`;
export function snapshotError(code: 'INVALID_INPUT' | 'FORBIDDEN' | 'FILE_NOT_READY' | 'AI_INPUT_LIMIT' | 'CONFLICT' | 'EMPTY_CONTENT'): never {
  throw Object.assign(new Error(code), { code });
}
function file(row: FileRow, purpose: string, target: string | null): FoxyGroundingFile {
  if (!row || !row.ready || row.purpose !== purpose || (row.target_id?.toLowerCase() ?? null) !== (target?.toLowerCase() ?? null) || !row.digest || !/^[a-f0-9]{64}$/u.test(row.digest)) return snapshotError('FILE_NOT_READY');
  if (!isDocumentExtension(row.extension) || BigInt(row.size_bytes) < 1n || BigInt(row.size_bytes) > 20000000n) return snapshotError('AI_INPUT_LIMIT');
  return { fileId: row.file_id, digest: row.digest, extension: row.extension,
    sizeBytes: Number(row.size_bytes), purpose, targetId: target };
}
async function document(tx: SqlTransaction, room: string, sourceId: string, kind: 'plan' | 'material'): Promise<FoxyGroundingSource> {
  const id = sourceId.slice(sourceId.indexOf(':') + 1);
  const table = kind === 'plan' ? 'study_plan_versions' : 'materials';
  const title = kind === 'plan' ? "('Plan ' || s.version_number)" : 's.title';
  const [row] = await tx.query<FileRow & { title: string }>(`SELECT ${fileFields},${title} AS title FROM ${table} s
    JOIN files f ON f.id=s.file_id AND f.classroom_id=s.classroom_id LEFT JOIN file_custodies c ON c.file_id=f.id
    LEFT JOIN uploads u ON u.file_id=f.id WHERE s.id=$1::uuid AND s.classroom_id=$2::uuid ${kind === 'material' ? 'AND s.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM material_revisions mr WHERE mr.previous_id=s.id)' : ''}`, id, room);
  if (!row) return snapshotError('FILE_NOT_READY');
  return { sourceId, title: row.title, kind: kind === 'plan' ? 'PLAN' : 'MATERIAL', text: '', files: [file(row, kind, null)] };
}
async function activityText(tx: SqlTransaction, id: string, instructions: string | null): Promise<{ text: string; hasQuestions: boolean }> {
  const questions = await tx.query<{ prompt: string; options: string[] }>(`SELECT q.prompt,
    ARRAY(SELECT o.text FROM question_options o WHERE o.question_id=q.id ORDER BY o.position,o.id) AS options
    FROM questions q WHERE q.activity_id=$1::uuid ORDER BY q.position,q.id`, id);
  return { text: [instructions ?? '', ...questions.flatMap(q => [q.prompt, ...q.options])].filter(Boolean).join('\n'), hasQuestions: questions.length > 0 };
}
async function activity(tx: SqlTransaction, room: string, sourceId: string): Promise<FoxyGroundingSource> {
  const id = sourceId.slice(sourceId.indexOf(':') + 1);
  const [row] = await tx.query<{ title: string; instructions_text: string | null }>(
    "SELECT title,instructions_text FROM activities WHERE id=$1::uuid AND classroom_id=$2::uuid AND status='PUBLISHED'", id, room);
  if (!row) return snapshotError('FILE_NOT_READY');
  const rows = await tx.query<FileRow>(`SELECT ${fileFields} FROM activity_instruction_files l
    JOIN files f ON f.id=l.file_id AND f.classroom_id=l.classroom_id LEFT JOIN file_custodies c ON c.file_id=f.id
    LEFT JOIN uploads u ON u.file_id=f.id WHERE l.activity_id=$1::uuid AND l.classroom_id=$2::uuid ORDER BY l.file_id`, id, room);
  const content = await activityText(tx, id, row.instructions_text);
  if (!content.text.trim() && !content.hasQuestions && !rows.length) return snapshotError('EMPTY_CONTENT');
  return { sourceId, title: row.title, kind: 'ACTIVITY', text: content.text,
    files: rows.map(item => file(item, 'instructions', id)) };
}
export async function snapshotSources(tx: SqlTransaction, room: string, sourceIds: string[]): Promise<FoxyGroundingSource[]> {
  const sources: FoxyGroundingSource[] = [];
  for (const id of sourceIds) {
    const kind = id.slice(0, id.indexOf(':'));
    sources.push(kind === 'activity' ? await activity(tx, room, id) : await document(tx, room, id, kind as 'plan' | 'material'));
  }
  const files = sources.flatMap(source => source.files);
  if (files.length > 6 || files.reduce((sum, item) => sum + item.sizeBytes, 0) > 20000000
    || sources.reduce((sum, source) => sum + [...source.text].length, 0) > 100000) return snapshotError('AI_INPUT_LIMIT');
  return sources;
}
