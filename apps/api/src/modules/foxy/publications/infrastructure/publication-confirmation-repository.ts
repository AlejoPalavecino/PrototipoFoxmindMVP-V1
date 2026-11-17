import type { FoxyPrivateAssetReadRepositoryPort } from '../../application/ports.ts';
import { createHash } from 'node:crypto';
import { agendaId } from '../../../../../../../src/core/domain/agenda/values.ts';
import { parseConfirmFoxyPublication } from '../../../../../../../src/core/domain/foxy/resource-validation.ts';
import type { SqlTransaction } from '../../../../../../../src/core/contracts/sql.ts';
import type { MaterialPublisherPort } from '../../../materials/public.ts';
import { validRasterSource, publicationFileFormat } from './publication-raster-check.ts';

type Hint = { resource_id: string | null; source_kind?: string; source_asset_id?: string | null; snapshot_visual?: unknown; conversation_id: string; source_room: string | null; classroom_id: string };
type Publication = { id: string; owner_id: string; resource_id: string; resource_revision: bigint; classroom_id: string; unit_id: string | null;
  topic_id: string | null; title: string; source_kind?: string; snapshot_title: string; snapshot_description: string | null; file_id: string | null; material_id: string | null; state: string; revision: bigint };
type Receipt = { publication_id: string; material_id: string; publication_revision: bigint; classroom_revision: bigint; input_hash: string };
function fail(code: 'NOT_FOUND' | 'CONFLICT'): never { throw Object.assign(new Error(code), { code }); }
function receipt(row: Receipt) { return { publicationId: row.publication_id, materialId: row.material_id,
  publicationRevision: String(row.publication_revision), classroomRevision: String(row.classroom_revision) }; }
async function lockScopes(tx: SqlTransaction, actor: string, id: string): Promise<Hint> {
  if (!(await tx.query("SELECT id FROM users WHERE id=$1::uuid AND account_role='teacher' AND email_verified_at IS NOT NULL FOR UPDATE", actor)).length) return fail('NOT_FOUND');
  const [hint] = await tx.query<Hint>(`SELECT r.id AS resource_id,p.source_kind,p.source_asset_id,p.snapshot_visual,c.id AS conversation_id,c.classroom_id AS source_room,p.classroom_id
    FROM foxy_publications p LEFT JOIN foxy_resources r ON r.id=p.resource_id AND r.owner_id=p.owner_id
    LEFT JOIN foxy_visual_assets v ON v.id=p.source_asset_id AND v.owner_id=p.owner_id
    JOIN foxy_conversations c ON c.id=COALESCE(r.conversation_id,v.conversation_id) AND c.owner_id=p.owner_id
    WHERE p.id=$1::uuid AND p.owner_id=$2::uuid AND c.deleted_at IS NULL`, id, actor);
  if (!hint) return fail('NOT_FOUND');
  const rooms = await tx.query<{ id: string; teacher_id: string }>(`SELECT id,teacher_id FROM classrooms
    WHERE id IN ($1::uuid,$2::uuid) ORDER BY id FOR UPDATE`, hint.classroom_id, hint.source_room);
  if (!rooms.some(r => r.id === hint.classroom_id && r.teacher_id === actor)
    || (hint.source_room && !rooms.some(r => r.id === hint.source_room && r.teacher_id === actor))) return fail('NOT_FOUND');
  const [source] = hint.source_kind === 'VISUAL'
    ? await tx.query(`SELECT a.id FROM foxy_visual_assets a JOIN foxy_conversations c ON c.id=a.conversation_id AND c.owner_id=a.owner_id
      WHERE a.id=$1::uuid AND a.owner_id=$2::uuid AND c.id=$3::uuid AND c.deleted_at IS NULL
      AND c.classroom_id IS NOT DISTINCT FROM $4::uuid FOR SHARE OF a,c`,hint.source_asset_id,actor,hint.conversation_id,hint.source_room)
    : await tx.query(`SELECT r.id FROM foxy_resources r JOIN foxy_conversations c ON c.id=r.conversation_id AND c.owner_id=r.owner_id
      WHERE r.id=$1::uuid AND r.owner_id=$2::uuid AND c.id=$3::uuid AND c.deleted_at IS NULL
      AND c.classroom_id IS NOT DISTINCT FROM $4::uuid FOR SHARE OF r,c`,hint.resource_id,actor,hint.conversation_id,hint.source_room);
  if (!source) return fail('NOT_FOUND');
  return hint;
}
async function lockPublication(tx: SqlTransaction, actor: string, id: string, hint: Hint): Promise<Publication> {
  const [row] = await tx.query<Publication>(`SELECT * FROM foxy_publications WHERE id=$1::uuid AND owner_id=$2::uuid
    AND resource_id IS NOT DISTINCT FROM $3::uuid AND classroom_id=$4::uuid AND source_asset_id IS NOT DISTINCT FROM $5::uuid FOR UPDATE`, id, actor, hint.resource_id, hint.classroom_id, hint.source_asset_id ?? null);
  if (!row) return fail('NOT_FOUND'); return row;
}
async function replay(tx: SqlTransaction, actor: string, requestId: string, hash: string, publication: Publication) {
  const [prior] = await tx.query<Receipt>('SELECT * FROM foxy_publication_confirm_requests WHERE owner_id=$1::uuid AND request_id=$2::uuid', actor, requestId);
  if (!prior) return null;
  if (prior.input_hash !== hash || prior.publication_id !== publication.id) return fail('CONFLICT');
  const [material] = await tx.query(`SELECT m.id FROM materials m JOIN files f ON f.id=m.file_id AND f.classroom_id=m.classroom_id
    WHERE m.id=$1::uuid AND m.classroom_id=$2::uuid AND m.deleted_at IS NULL AND f.blob_deleted_at IS NULL`, prior.material_id, publication.classroom_id);
  if (!material || publication.material_id !== prior.material_id || publication.state !== 'PUBLISHED') return fail('NOT_FOUND');
  return receipt(prior);
}
async function requireReady(tx: SqlTransaction, actor: string, publication: Publication, publicationRevision: string, classroomRevision: string, hint: Hint, assets: FoxyPrivateAssetReadRepositoryPort): Promise<void> {
  if (publication.state !== 'READY' || String(publication.revision) !== publicationRevision || !publication.file_id) return fail('CONFLICT');
  if (hint.source_kind === 'VISUAL' && (!hint.source_asset_id || !await validRasterSource(tx,actor,hint.source_asset_id,hint.snapshot_visual, assets))) return fail('CONFLICT');
  const [valid] = await tx.query(`SELECT p.id FROM foxy_publications p LEFT JOIN foxy_resources r ON r.id=p.resource_id AND r.owner_id=p.owner_id
    JOIN classrooms a ON a.id=p.classroom_id AND a.teacher_id=p.owner_id
    WHERE p.id=$1::uuid AND p.owner_id=$2::uuid AND (p.source_kind='VISUAL' OR (p.source_kind='TEXT' AND r.revision=p.resource_revision)) AND a.archived_at IS NULL AND a.revision=$3::bigint
    AND (p.unit_id IS NULL OR EXISTS (SELECT 1 FROM units u WHERE u.id=p.unit_id AND u.classroom_id=p.classroom_id))
    AND (p.topic_id IS NULL OR EXISTS (SELECT 1 FROM topics t WHERE t.id=p.topic_id AND t.unit_id=p.unit_id AND t.classroom_id=p.classroom_id))`,
  publication.id, actor, classroomRevision);
  if (!valid) return fail('CONFLICT');
  const [proof] = await tx.query(`SELECT p.id FROM foxy_publications p JOIN files f ON f.id=p.file_id
    JOIN uploads u ON u.file_id=f.id JOIN file_custodies c ON c.file_id=f.id
    WHERE p.id=$1::uuid AND f.classroom_id=p.classroom_id AND f.classroom_draft_id IS NULL AND f.uploaded_by_id=p.owner_id
    AND f.blob_deleted_at IS NULL AND ${publicationFileFormat} AND f.size_bytes=p.artifact_size_bytes
    AND f.validation_status='APPROVED' AND f.scan_status='CLEAN' AND f.validated_at IS NOT NULL AND f.scanned_at IS NOT NULL
    AND u.status='COMPLETED' AND u.completed_at IS NOT NULL AND c.purpose='material' AND c.target_id IS NULL AND c.phase='ready'
    AND c.digest=p.artifact_digest AND c.validated_digest=p.artifact_digest AND c.scanned_digest=p.artifact_digest FOR UPDATE OF f,u,c`, publication.id);
  if (!proof) return fail('CONFLICT');
}
export function createFoxyPublicationConfirmationRepository(options: { assets: FoxyPrivateAssetReadRepositoryPort;  library: MaterialPublisherPort }) {
  return { async confirm(tx: SqlTransaction, request: unknown, actorId: string, publicationId: string, input: unknown) {
    agendaId(actorId); agendaId(publicationId); actorId = actorId.toLowerCase(); publicationId = publicationId.toLowerCase();
    const v = parseConfirmFoxyPublication(input);
    const hash = createHash('sha256').update(JSON.stringify({ publicationId: publicationId.toLowerCase(), requestId: v.requestId.toLowerCase(),
      publicationRevision: v.publicationRevision, classroomRevision: v.classroomRevision, confirm: true })).digest('hex');
    const hint = await lockScopes(tx, actorId, publicationId), publication = await lockPublication(tx, actorId, publicationId, hint);
    const prior = await replay(tx, actorId, v.requestId, hash, publication); if (prior) return prior;
    await requireReady(tx, actorId, publication, v.publicationRevision, v.classroomRevision, hint, options.assets);
    const created = await options.library.publish(tx, request, actorId, { classroomId: publication.classroom_id, revision: v.classroomRevision,
      title: publication.source_kind === 'VISUAL' ? publication.snapshot_title : publication.title,
      ...(publication.source_kind === 'VISUAL' && publication.snapshot_description !== null ? { body: publication.snapshot_description } : {}), fileId: publication.file_id!, unitId: publication.unit_id, topicId: publication.topic_id });
    const [updated] = await tx.query<{ revision: bigint }>(`UPDATE foxy_publications SET state='PUBLISHED',material_id=$3::uuid,revision=revision+1
      WHERE id=$1::uuid AND owner_id=$2::uuid AND state='READY' AND revision=$4::bigint RETURNING revision`, publicationId, actorId, created.materialId, v.publicationRevision);
    if (!updated) return fail('CONFLICT');
    const result = { publicationId: publication.id, materialId: created.materialId, publicationRevision: String(updated.revision), classroomRevision: created.classroomRevision };
    await tx.query(`INSERT INTO foxy_publication_confirm_requests(owner_id,request_id,publication_id,input_hash,material_id,publication_revision,classroom_revision)
      VALUES($1::uuid,$2::uuid,$3::uuid,$4,$5::uuid,$6::bigint,$7::bigint)`, actorId, v.requestId, publicationId, hash, result.materialId, result.publicationRevision, result.classroomRevision);
    return result;
  } };
}
