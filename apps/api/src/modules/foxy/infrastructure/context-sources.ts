import type { FoxySourceKind, FoxySourceQuery } from '../../../../../../src/core/domain/index.ts';
import type { SqlTransaction } from '../../../../../../src/core/contracts/sql.ts';

type DocumentRow = { id: string; title: string; created_at: Date; extension: string | null; size_bytes: bigint | null; ready: boolean;
  unit_id: string | null; topic_id: string | null; plan_version: number | null; current_plan: boolean | null };
type ActivityRow = { id: string; title: string; created_at: Date; unit_id: string | null; topic_ids: string[]; published_at: Date | null;
  document_count: bigint; bad_file: boolean; unsupported: boolean; oversized: boolean; empty_content: boolean };
const custody = `(f.blob_deleted_at IS NULL AND c.phase='ready' AND u.status='COMPLETED' AND f.validation_status='APPROVED'
  AND f.scan_status='CLEAN' AND c.digest IS NOT NULL AND c.digest=c.validated_digest AND c.digest=c.scanned_digest)`;
const docReason = (row: DocumentRow) => !row.ready ? 'FILE_NOT_READY'
  : !['pdf', 'docx'].includes(row.extension ?? '') ? 'UNSUPPORTED_FORMAT'
    : row.size_bytes === null || BigInt(row.size_bytes) > 20000000n || BigInt(row.size_bytes) < 1n ? 'AI_INPUT_LIMIT' : null;
const pageFilter = (alias: string) => `AND ($2::timestamptz IS NULL OR
  (date_trunc('milliseconds',${alias}.created_at),${alias}.id)<($2::timestamptz,$3::uuid))
  ORDER BY date_trunc('milliseconds',${alias}.created_at) DESC,${alias}.id DESC LIMIT $4`;
function documentSql(kind: 'PLAN' | 'MATERIAL'): string {
  const from = kind === 'PLAN' ? `study_plan_versions s JOIN files f ON f.id=s.file_id AND f.classroom_id=s.classroom_id
    LEFT JOIN file_custodies c ON c.file_id=f.id AND c.purpose='plan' AND c.target_id IS NULL`
    : `materials s JOIN files f ON f.id=s.file_id AND f.classroom_id=s.classroom_id
    LEFT JOIN file_custodies c ON c.file_id=f.id AND c.purpose='material' AND c.target_id IS NULL`;
  const fields = kind === 'PLAN' ? `('Plan ' || s.version_number) AS title,NULL::uuid AS unit_id,NULL::uuid AS topic_id,
    s.version_number AS plan_version,(s.version_number=(SELECT max(p.version_number) FROM study_plan_versions p WHERE p.classroom_id=s.classroom_id)) AS current_plan`
    : `s.title,s.unit_id,s.topic_id,NULL::int AS plan_version,NULL::boolean AS current_plan`;
  return `SELECT s.id,s.created_at,${fields},f.extension,f.size_bytes,COALESCE(${custody},false) AS ready FROM ${from}
    LEFT JOIN uploads u ON u.file_id=f.id WHERE s.classroom_id=$1::uuid ${kind === 'MATERIAL' ? 'AND s.deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM material_revisions mr WHERE mr.previous_id=s.id)' : ''}
    ${pageFilter('s')}`;
}
const activitySql = `SELECT a.id,a.title,a.created_at,a.unit_id,a.published_at,
  COALESCE(NULLIF(ARRAY(SELECT t.topic_id FROM activity_topics t WHERE t.activity_id=a.id AND t.classroom_id=a.classroom_id ORDER BY t.position,t.topic_id),ARRAY[]::uuid[]),
    CASE WHEN a.topic_id IS NULL THEN ARRAY[]::uuid[] ELSE ARRAY[a.topic_id] END) AS topic_ids,
  COUNT(l.file_id) AS document_count,
  COALESCE(BOOL_OR(l.file_id IS NOT NULL AND NOT COALESCE(${custody} AND f.classroom_id=a.classroom_id AND c.purpose='instructions' AND c.target_id=a.id,false)),false) AS bad_file,
  COALESCE(BOOL_OR(f.extension NOT IN ('pdf','docx')),false) AS unsupported,
  COALESCE(BOOL_OR(f.size_bytes<1 OR f.size_bytes>20000000),false) AS oversized,
  (NULLIF(btrim(a.instructions_text),'') IS NULL AND COUNT(l.file_id)=0 AND NOT EXISTS
    (SELECT 1 FROM questions q WHERE q.activity_id=a.id)) AS empty_content
  FROM activities a LEFT JOIN activity_instruction_files l ON l.activity_id=a.id AND l.classroom_id=a.classroom_id
  LEFT JOIN files f ON f.id=l.file_id LEFT JOIN file_custodies c ON c.file_id=f.id LEFT JOIN uploads u ON u.file_id=f.id
  WHERE a.classroom_id=$1::uuid AND a.status='PUBLISHED' AND ($2::timestamptz IS NULL OR
    (date_trunc('milliseconds',a.created_at),a.id)<($2::timestamptz,$3::uuid))
  GROUP BY a.id ORDER BY date_trunc('milliseconds',a.created_at) DESC,a.id DESC LIMIT $4`;
function cursor(rows: { id: string; created_at: Date }[], limit: number) {
  if (rows.length <= limit) return null;
  const row = rows[limit - 1]!; return { id: row.id, createdAt: row.created_at.toISOString() };
}
function activityItems(rows: ActivityRow[]) {
  return rows.map(row => {
    const reason = row.bad_file ? 'FILE_NOT_READY' : row.unsupported ? 'UNSUPPORTED_FORMAT'
      : row.oversized ? 'AI_INPUT_LIMIT' : row.empty_content ? 'EMPTY_CONTENT' : null;
    return { kind: 'ACTIVITY' as const, sourceId: `activity:${row.id}`, title: row.title, unitId: row.unit_id,
      topicIds: row.topic_ids, createdAt: row.created_at.toISOString(), publishedAt: row.published_at?.toISOString() ?? null,
      documentCount: Number(row.document_count), extension: null, sizeBytes: null, planVersion: null, currentPlan: null,
      available: reason === null, reason };
  });
}
function documentItems(rows: DocumentRow[], kind: FoxySourceKind) {
  return rows.map(row => {
    const reason = docReason(row);
    return { kind, sourceId: `${kind.toLowerCase()}:${row.id}`, title: row.title, extension: row.extension,
      sizeBytes: row.size_bytes === null ? null : String(row.size_bytes), unitId: row.unit_id,
      topicIds: row.topic_id ? [row.topic_id] : [], planVersion: row.plan_version, currentPlan: row.current_plan,
      createdAt: row.created_at.toISOString(), publishedAt: null, documentCount: 1, available: reason === null, reason };
  });
}
export async function loadSources(tx: SqlTransaction, room: string, query: FoxySourceQuery) {
  const params = [room, query.after?.createdAt ?? null, query.after?.id ?? null, query.limit + 1] as const;
  if (query.kind === 'ACTIVITY') {
    const rows = await tx.query<ActivityRow>(activitySql, ...params);
    return { items: activityItems(rows.slice(0, query.limit)), next: cursor(rows, query.limit) };
  }
  const rows = await tx.query<DocumentRow>(documentSql(query.kind), ...params);
  return { items: documentItems(rows.slice(0, query.limit), query.kind), next: cursor(rows, query.limit) };
}
