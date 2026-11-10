import type { ClassroomRuntimeAccess } from './access.ts';
import type { BrujulaSearchItem, BrujulaSearchPage } from '../../../../../../src/core/domain/classrooms/brujula-search.ts';
import { parseBrujulaSearchQuery, parseBrujulaSearchPage } from '../../../../../../src/core/domain/classrooms/brujula-search.ts';
import { signPageCursor, readPageCursor } from '../../../platform/pagination/signed-page-cursor.ts';
import { fail, uuid } from './policy.ts';

interface Cursor { v: 1; actor: string; q: string; rank: number; id: string }
interface SearchRow { id: string; rank: number; kind: BrujulaSearchItem['kind']; title: string; classroomId: string; classroomName: string; division: string }
const namespace = 'search-cursor-v1:';
function readCursor(key: Buffer, token: string, actor: string, q: string): Cursor {
  try {
    const value = readPageCursor(key, namespace, token, fail) as Cursor;
    if (value.v !== 1 || value.actor !== actor || value.q !== q || !Number.isInteger(value.rank) || value.rank < 0 || value.rank > 3 || !uuid(value.id)) return fail('INVALID_INPUT');
    return value;
  } catch { return fail('INVALID_INPUT'); }
}

/** Only authorized metadata crosses this boundary. Every page recomputes current membership. */
export function searchClassrooms(context: Pick<ClassroomRuntimeAccess, 'run' | 'ports'>, request: unknown, input: unknown): Promise<BrujulaSearchPage> {
  let query: ReturnType<typeof parseBrujulaSearchQuery>;
  try { query = parseBrujulaSearchQuery(input); } catch { return fail('INVALID_INPUT'); }
  return context.run(request, false, async (tx, actor) => {
    const cursor = query.cursor ? readCursor(context.ports.signingKey, query.cursor, actor.id, query.q) : null;
    // The SQL range spans combining marks U+0300–U+036F, matching the client normalizer.
    const rows = await tx.query<SearchRow>(`WITH rooms AS MATERIALIZED (
      SELECT c.id,c.name,c.division,c.subject FROM classrooms c WHERE
      ($2='teacher' AND c.teacher_id=$1::uuid) OR ($2='student' AND EXISTS (
        SELECT 1 FROM enrollments e JOIN membership_periods mp ON mp.enrollment_id=e.id
        WHERE e.classroom_id=c.id AND e.student_id=$1::uuid AND mp.ended_at IS NULL))
    ), candidates AS (
      SELECT c.id,0 AS rank,'classroom'::text AS kind,c.name AS title,c.id AS "classroomId",c.name AS "classroomName",c.division,c.subject FROM rooms c
      UNION ALL
      SELECT t.id,1,'topic',t.name,c.id,c.name,c.division,c.subject FROM topics t JOIN rooms c ON c.id=t.classroom_id
      UNION ALL
      SELECT m.id,2,'material',m.title,c.id,c.name,c.division,c.subject FROM materials m JOIN rooms c ON c.id=m.classroom_id
      JOIN files f ON f.id=m.file_id JOIN file_custodies fc ON fc.file_id=f.id JOIN uploads up ON up.file_id=f.id
      WHERE m.deleted_at IS NULL AND NOT EXISTS(SELECT 1 FROM material_revisions mr WHERE mr.previous_id=m.id) AND f.blob_deleted_at IS NULL AND fc.phase='ready'
        AND f.validation_status='APPROVED' AND f.scan_status='CLEAN' AND up.status='COMPLETED'
        AND fc.digest IS NOT NULL AND fc.digest=fc.validated_digest AND fc.digest=fc.scanned_digest
      UNION ALL
      SELECT a.id,3,'activity',COALESCE(NULLIF(btrim(a.title),''),'Borrador sin título'),c.id,c.name,c.division,c.subject FROM activities a JOIN rooms c ON c.id=a.classroom_id
      WHERE $2='teacher' OR a.status='PUBLISHED'
    ) SELECT id,rank,kind,title,"classroomId","classroomName",division FROM candidates
      WHERE strpos(lower(regexp_replace(normalize(concat_ws(' ',title,"classroomName",division,subject),NFD),'[̀-ͯ]','','g')),$3)>0
        AND ($4::int IS NULL OR rank>$4::int OR (rank=$4::int AND id>$5::uuid))
      ORDER BY rank,id LIMIT 13`, actor.id, actor.account_role, query.q, cursor?.rank ?? null, cursor?.id ?? null);
    const page = rows.slice(0,12), last = page.at(-1);
    const items: BrujulaSearchItem[] = page.map(({ rank: _rank, ...row }) => ({ ...row, target:
      row.kind === 'activity' ? { kind: 'activity', classroomId: row.classroomId, activityId: row.id }
      : row.kind === 'material' ? { kind: 'material', classroomId: row.classroomId, materialId: row.id }
      : { kind: 'classroom', classroomId: row.classroomId, section: 'plan', ...(row.kind === 'topic' ? { topicId: row.id } : {}) } }));
    return parseBrujulaSearchPage({ items, nextCursor: rows.length > 12 && last ? signPageCursor(context.ports.signingKey, namespace, { v: 1, actor: actor.id, q: query.q, rank: last.rank, id: last.id }) : null });
  });
}
