import { createHash, randomUUID } from 'node:crypto';
import { agendaId, parsePrepareFoxyPublication, type FoxyPublicationState, type FoxyVisualPublicationSummary } from '../../../../../../src/core/domain/index.ts';
import type { SqlTransaction } from '../../../../../../src/core/contracts/sql.ts';

type Row = { id: string; resource_id: string; resource_revision: bigint; classroom_id: string; unit_id: string | null;
  topic_id: string | null; title: string; state: FoxyPublicationState; revision: bigint; input_hash: string };
function fail(code: 'NOT_FOUND' | 'CONFLICT'): never { throw Object.assign(new Error(code), { code }); }
function view(row: Row) {
  return { id: row.id, resourceId: row.resource_id, resourceRevision: String(row.resource_revision), classroomId: row.classroom_id,
    unitId: row.unit_id, topicId: row.topic_id, title: row.title, state: row.state, revision: String(row.revision) };
}
async function lockOwner(tx: SqlTransaction, owner: string): Promise<void> {
  if (!(await tx.query("SELECT id FROM users WHERE id=$1::uuid AND account_role='teacher' FOR UPDATE", owner)).length) fail('NOT_FOUND');
}
async function destination(tx: SqlTransaction, owner: string, value: ReturnType<typeof parsePrepareFoxyPublication>): Promise<void> {
  const [row] = await tx.query(`SELECT c.id FROM classrooms c WHERE c.id=$1::uuid AND c.teacher_id=$2::uuid AND c.archived_at IS NULL
    AND ($3::uuid IS NULL OR EXISTS (SELECT 1 FROM units u WHERE u.id=$3::uuid AND u.classroom_id=c.id))
    AND ($4::uuid IS NULL OR EXISTS (SELECT 1 FROM topics t WHERE t.id=$4::uuid AND t.unit_id=$3::uuid AND t.classroom_id=c.id))
    FOR SHARE OF c`, value.classroomId, owner, value.unitId, value.topicId);
  if (!row) fail('NOT_FOUND');
}
export function createFoxyPublicationRepository() {
  return {
    async get(tx: SqlTransaction, owner: string, publicationId: string) {
      agendaId(owner); agendaId(publicationId);
      const [row] = await tx.query<Row>('SELECT * FROM foxy_publications WHERE id=$1::uuid AND owner_id=$2::uuid', publicationId, owner);
      return row ? view(row) : null;
    },
    async list(tx: SqlTransaction, owner: string, resourceId: string, page: { limit: number; afterId: string | null }) {
      agendaId(owner); agendaId(resourceId);
      if (!page || !Number.isSafeInteger(page.limit) || page.limit < 1 || page.limit > 50) throw Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' });
      if (page.afterId !== null) agendaId(page.afterId);
      page = { limit: page.limit, afterId: page.afterId };
      const [scope] = await tx.query(`SELECT r.id FROM foxy_resources r JOIN users u ON u.id=r.owner_id
        JOIN foxy_conversations c ON c.id=r.conversation_id AND c.owner_id=r.owner_id
        WHERE r.id=$1::uuid AND r.owner_id=$2::uuid AND u.account_role='teacher' AND u.email_verified_at IS NOT NULL AND c.deleted_at IS NULL
        AND (c.context_kind='GENERAL' OR EXISTS (SELECT 1 FROM classrooms origin WHERE origin.id=c.classroom_id AND origin.teacher_id=r.owner_id))`, resourceId, owner);
      if (!scope) return fail('NOT_FOUND');
      if (page.afterId !== null) {
        const [cursor] = await tx.query(`SELECT p.id FROM foxy_publications p JOIN classrooms a ON a.id=p.classroom_id AND a.teacher_id=p.owner_id
          JOIN foxy_resources r ON r.id=p.resource_id AND r.owner_id=p.owner_id JOIN foxy_conversations c ON c.id=r.conversation_id AND c.owner_id=r.owner_id
          WHERE p.id=$1::uuid AND p.owner_id=$2::uuid AND p.resource_id=$3::uuid AND c.deleted_at IS NULL
          AND (c.context_kind='GENERAL' OR EXISTS (SELECT 1 FROM classrooms origin WHERE origin.id=c.classroom_id AND origin.teacher_id=p.owner_id))`, page.afterId, owner, resourceId);
        if (!cursor) return fail('NOT_FOUND');
      }
      const rows = await tx.query<Row>(`SELECT p.id,p.resource_id,p.resource_revision,p.classroom_id,p.unit_id,p.topic_id,p.title,p.state,p.revision
        FROM foxy_publications p JOIN classrooms a ON a.id=p.classroom_id AND a.teacher_id=p.owner_id
        JOIN foxy_resources r ON r.id=p.resource_id AND r.owner_id=p.owner_id JOIN foxy_conversations c ON c.id=r.conversation_id AND c.owner_id=r.owner_id
        WHERE p.owner_id=$1::uuid AND p.resource_id=$2::uuid AND c.deleted_at IS NULL
        AND (c.context_kind='GENERAL' OR EXISTS (SELECT 1 FROM classrooms origin WHERE origin.id=c.classroom_id AND origin.teacher_id=p.owner_id))
        AND ($3::uuid IS NULL OR (p.created_at,p.id)<(
          SELECT cursor.created_at,cursor.id FROM foxy_publications cursor JOIN classrooms dest ON dest.id=cursor.classroom_id AND dest.teacher_id=cursor.owner_id
          WHERE cursor.id=$3::uuid AND cursor.owner_id=$1::uuid AND cursor.resource_id=$2::uuid))
        ORDER BY p.created_at DESC,p.id DESC LIMIT $4`, owner, resourceId, page.afterId, page.limit + 1);
      const items = rows.slice(0, page.limit).map(view);
      return { items, nextAfterId: rows.length > page.limit ? items[items.length - 1]!.id : null };
    },
    async inspect(tx: SqlTransaction, owner: string, publicationId: string) {
      agendaId(owner); agendaId(publicationId);
      const [row] = await tx.query<Row & { classroom_revision: bigint; classroom_archived: boolean; error_code: string | null }>(`SELECT
        p.id,p.resource_id,p.resource_revision,p.classroom_id,p.unit_id,p.topic_id,p.title,p.state,p.revision,
        a.revision AS classroom_revision,(a.archived_at IS NOT NULL) AS classroom_archived,p.error_code
        FROM foxy_publications p JOIN users u ON u.id=p.owner_id AND u.account_role='teacher' AND u.email_verified_at IS NOT NULL
        JOIN classrooms a ON a.id=p.classroom_id AND a.teacher_id=p.owner_id
        JOIN foxy_resources r ON r.id=p.resource_id AND r.owner_id=p.owner_id
        JOIN foxy_conversations c ON c.id=r.conversation_id AND c.owner_id=r.owner_id AND c.deleted_at IS NULL
        WHERE p.id=$1::uuid AND p.owner_id=$2::uuid
        AND (c.context_kind='GENERAL' OR EXISTS (SELECT 1 FROM classrooms origin WHERE origin.id=c.classroom_id AND origin.teacher_id=p.owner_id))`, publicationId, owner);
      if (!row) {
        const [visual] = await tx.query<{ id: string; source_asset_id: string; source_asset_revision: bigint; classroom_id: string; unit_id: string|null; topic_id: string|null; title: string; state: FoxyPublicationState; revision: bigint; classroom_revision: bigint; classroom_archived: boolean; error_code: string|null }>(`SELECT p.*,a.revision AS classroom_revision,(a.archived_at IS NOT NULL) AS classroom_archived
          FROM foxy_publications p JOIN users u ON u.id=p.owner_id AND u.account_role='teacher' AND u.email_verified_at IS NOT NULL
          JOIN classrooms a ON a.id=p.classroom_id AND a.teacher_id=p.owner_id
          JOIN foxy_visual_assets v ON v.id=p.source_asset_id AND v.owner_id=p.owner_id
          JOIN foxy_conversations c ON c.id=v.conversation_id AND c.owner_id=v.owner_id AND c.deleted_at IS NULL
          WHERE p.id=$1::uuid AND p.owner_id=$2::uuid AND p.source_kind='VISUAL'
          AND (c.context_kind='GENERAL' OR EXISTS (SELECT 1 FROM classrooms origin WHERE origin.id=c.classroom_id AND origin.teacher_id=p.owner_id))`,publicationId,owner);
        if (!visual) return fail('NOT_FOUND');
        const publication: FoxyVisualPublicationSummary = { id:visual.id,sourceKind:'VISUAL',assetId:visual.source_asset_id,assetRevision:String(visual.source_asset_revision),classroomId:visual.classroom_id,unitId:visual.unit_id,topicId:visual.topic_id,title:visual.title,state:visual.state,revision:String(visual.revision) };
        return { publication, classroomRevision:String(visual.classroom_revision),classroomArchived:visual.classroom_archived,errorCode:visual.error_code };
      }
      return { publication: view(row), classroomRevision: String(row.classroom_revision), classroomArchived: row.classroom_archived,
        errorCode: row.error_code };
    },
    async prepare(tx: SqlTransaction, owner: string, resourceId: string, input: unknown) {
      agendaId(owner); agendaId(resourceId); const v = parsePrepareFoxyPublication(input); await lockOwner(tx, owner);
      const hash = createHash('sha256').update(JSON.stringify({ resourceId: resourceId.toLowerCase(), resourceRevision: v.resourceRevision,
        classroomId: v.classroomId.toLowerCase(), title: v.title, unitId: v.unitId?.toLowerCase() ?? null, topicId: v.topicId?.toLowerCase() ?? null })).digest('hex');
      const [resource] = await tx.query<{ title: string; markdown: string; revision: bigint }>(`SELECT r.title,r.markdown,r.revision FROM foxy_resources r
        JOIN foxy_conversations c ON c.id=r.conversation_id AND c.owner_id=r.owner_id
        WHERE r.id=$1::uuid AND r.owner_id=$2::uuid AND c.deleted_at IS NULL
        AND (c.context_kind='GENERAL' OR EXISTS (SELECT 1 FROM classrooms a WHERE a.id=c.classroom_id AND a.teacher_id=c.owner_id)) FOR UPDATE OF r`, resourceId, owner);
      if (!resource) return fail('NOT_FOUND');
      const [existing] = await tx.query<{ id: string; classroom_id: string }>('SELECT id,classroom_id FROM foxy_publications WHERE owner_id=$1::uuid AND request_id=$2::uuid', owner, v.requestId);
      if (existing) {
        const [prior] = await tx.query<Row>(`SELECT p.* FROM foxy_publications p JOIN classrooms c ON c.id=p.classroom_id AND c.teacher_id=p.owner_id
          WHERE p.id=$1::uuid AND p.owner_id=$2::uuid`, existing.id, owner);
        if (!prior) return fail('NOT_FOUND');
        if (prior.input_hash !== hash) return fail('CONFLICT');
        return { created: false, publication: view(prior) };
      }
      await destination(tx, owner, v);
      if (String(resource.revision) !== v.resourceRevision) return fail('CONFLICT');
      const [row] = await tx.query<Row>(`INSERT INTO foxy_publications(id,owner_id,request_id,input_hash,resource_id,resource_revision,
        snapshot_title,snapshot_markdown,classroom_id,unit_id,topic_id,title) VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5::uuid,$6::bigint,$7,$8,$9::uuid,$10::uuid,$11::uuid,$12) RETURNING *`,
      randomUUID(), owner, v.requestId, hash, resourceId, v.resourceRevision, resource.title, resource.markdown, v.classroomId, v.unitId, v.topicId, v.title);
      if (!row) return fail('CONFLICT');
      return { created: true, publication: view(row) };
    },
  };
}
