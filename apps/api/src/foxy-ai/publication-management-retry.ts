import { createHash } from 'node:crypto';
import { agendaId, parseRetryFoxyPublication, type SqlTransaction } from '../../../../src/core/domain/index.ts';
import { lockFoxyManagementScopes } from './publication-management-scopes.ts';
import { decideFoxyPublicationManagement } from './foxy-publication-management.ts';
import { FOXY_PDF_RENDERER_VERSION } from './pdf-renderer-version.ts';

type Facts = Parameters<typeof decideFoxyPublicationManagement>[0];
type Row = { id: string; file_id: string | null; state: Facts['state']; revision: bigint; error_code: string | null;
  source_current: boolean; destination_usable: boolean; associations_valid: boolean; renderer_version: string | null };
type Prior = { publication_id: string; action: string; input_hash: string; publication_revision: bigint };
function fail(code: 'NOT_FOUND' | 'CONFLICT'): never { throw Object.assign(new Error(code), { code }); }
async function fileFacts(tx: SqlTransaction, row: Row, room: string, actor: string): Promise<{ file: Facts['file']; referenced: boolean }> {
  if (!row.file_id) return { file: null, referenced: false };
  const [file] = await tx.query<{ phase: NonNullable<Facts['file']>['phase']; status: NonNullable<Facts['file']>['uploadStatus']; reservation_released: boolean;
    blob_deleted: boolean; proof_valid: boolean; lease_active: boolean }>(`SELECT c.phase,u.status::text status,(u.reservation_released_at IS NOT NULL) reservation_released,
    (f.blob_deleted_at IS NOT NULL) blob_deleted, COALESCE(c.phase='ready' AND f.validation_status='APPROVED' AND f.scan_status='CLEAN'
      AND f.validated_at IS NOT NULL AND f.scanned_at IS NOT NULL AND u.completed_at IS NOT NULL AND f.extension='pdf'
      AND f.detected_mime_type='application/pdf' AND f.size_bytes=p.artifact_size_bytes AND c.digest=p.artifact_digest
      AND c.validated_digest=p.artifact_digest AND c.scanned_digest=p.artifact_digest,false) proof_valid,
    COALESCE(c.lease_until>clock_timestamp(),false) lease_active
    FROM files f JOIN uploads u ON u.file_id=f.id JOIN file_custodies c ON c.file_id=f.id JOIN foxy_publications p ON p.file_id=f.id
    WHERE f.id=$1::uuid AND p.id=$2::uuid AND f.classroom_id=$3::uuid AND f.classroom_draft_id IS NULL AND f.uploaded_by_id=$4::uuid
      AND c.purpose='material' AND c.target_id IS NULL FOR UPDATE OF f,u,c`, row.file_id, row.id, room, actor);
  if (!file) return fail('CONFLICT');
  const [ref] = await tx.query(`SELECT 1 WHERE EXISTS(SELECT 1 FROM materials WHERE file_id=$1::uuid)
    OR EXISTS(SELECT 1 FROM study_plan_versions WHERE file_id=$1::uuid) OR EXISTS(SELECT 1 FROM activity_instruction_files WHERE file_id=$1::uuid)
    OR EXISTS(SELECT 1 FROM attempt_attachments WHERE file_id=$1::uuid) OR EXISTS(SELECT 1 FROM foxy_publications WHERE file_id=$1::uuid AND id<>$2::uuid)`, row.file_id, row.id);
  return { referenced: !!ref, file: { phase: file.phase, uploadStatus: file.status, reservationReleased: file.reservation_released,
    blobDeleted: file.blob_deleted, proofValid: file.proof_valid, leaseActive: file.lease_active,
    rendererCompatible: row.renderer_version === FOXY_PDF_RENDERER_VERSION } };
}
export async function retryFoxyPublication(tx: SqlTransaction, actorId: string, publicationId: string, input: unknown) {
  const actor = agendaId(actorId).toLowerCase(), id = agendaId(publicationId).toLowerCase(), parsed = parseRetryFoxyPublication(input);
  const requestId = parsed.requestId.toLowerCase(), hash = createHash('sha256').update(JSON.stringify({ action: 'RETRY', publicationId: id,
    requestId, publicationRevision: parsed.publicationRevision })).digest('hex');
  const scope = await lockFoxyManagementScopes(tx, actor, id);
  const [row] = await tx.query<Row>(`SELECT p.id,p.file_id,p.state,p.revision,p.error_code,p.renderer_version,
    (r.revision=p.resource_revision) source_current,(a.archived_at IS NULL) destination_usable,
    ((p.unit_id IS NULL OR EXISTS(SELECT 1 FROM units u WHERE u.id=p.unit_id AND u.classroom_id=p.classroom_id))
      AND (p.topic_id IS NULL OR EXISTS(SELECT 1 FROM topics t WHERE t.id=p.topic_id AND t.unit_id=p.unit_id AND t.classroom_id=p.classroom_id))) associations_valid
    FROM foxy_publications p JOIN foxy_resources r ON r.id=p.resource_id AND r.owner_id=p.owner_id JOIN classrooms a ON a.id=p.classroom_id
    WHERE p.id=$1::uuid AND p.owner_id=$2::uuid AND p.resource_id=$3::uuid AND p.classroom_id=$4::uuid FOR UPDATE OF p`, id, actor, scope.resource_id, scope.classroom_id);
  if (!row) return fail('NOT_FOUND');
  const [prior] = await tx.query<Prior>('SELECT * FROM foxy_publication_command_requests WHERE owner_id=$1::uuid AND request_id=$2::uuid', actor, requestId);
  if (prior) {
    if (prior.publication_id !== id || prior.action !== 'RETRY' || prior.input_hash !== hash) return fail('CONFLICT');
    return { publicationId: id, action: 'RETRY' as const, publicationRevision: String(prior.publication_revision) };
  }
  if (String(row.revision) !== parsed.publicationRevision || BigInt(row.revision) >= 9223372036854775807n) return fail('CONFLICT');
  const file = await fileFacts(tx, row, scope.classroom_id, actor);
  if (!decideFoxyPublicationManagement({ state: row.state, errorCode: row.error_code, sourceCurrent: row.source_current,
    destinationUsable: row.destination_usable, associationsValid: row.associations_valid, cleanupError: null, ...file }).canRetry) return fail('CONFLICT');
  const [updated] = await tx.query<{ revision: bigint }>(`UPDATE foxy_publications SET state='PREPARING',error_code=NULL,lease_nonce=NULL,lease_until=NULL,revision=revision+1
    WHERE id=$1::uuid AND owner_id=$2::uuid AND state='FAILED' AND revision=$3::bigint RETURNING revision`, id, actor, parsed.publicationRevision);
  if (!updated) return fail('CONFLICT');
  await tx.query(`INSERT INTO foxy_publication_command_requests(owner_id,request_id,publication_id,action,input_hash,publication_revision)
    VALUES($1::uuid,$2::uuid,$3::uuid,'RETRY',$4,$5::bigint)`, actor, requestId, id, hash, String(updated.revision));
  return { publicationId: id, action: 'RETRY' as const, publicationRevision: String(updated.revision) };
}
