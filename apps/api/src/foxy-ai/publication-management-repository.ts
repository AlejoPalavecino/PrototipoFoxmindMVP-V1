import { inspectFoxyPublicationManagement } from './publication-management-inspect.ts';
import { lockFoxyManagementScopes } from './publication-management-scopes.ts';
import { createHash, randomUUID } from 'node:crypto';
import { retryFoxyPublication } from './publication-management-retry.ts';
import { agendaId, parseDiscardFoxyPublication, type SqlTransaction } from '../../../../src/core/domain/index.ts';

type Publication = { id: string; file_id: string | null; state: string; revision: bigint; material_id: string | null };
type Prior = { publication_id: string; action: string; input_hash: string; publication_revision: bigint };
function fail(code: 'NOT_FOUND' | 'CONFLICT'): never { throw Object.assign(new Error(code), { code }); }
async function fenceFile(tx: SqlTransaction, actor: string, pub: Publication, room: string): Promise<void> {
  if (!pub.file_id) return;
  const [file] = await tx.query(`SELECT f.id FROM files f JOIN uploads u ON u.file_id=f.id JOIN file_custodies c ON c.file_id=f.id
    WHERE f.id=$1::uuid AND f.classroom_id=$2::uuid AND f.classroom_draft_id IS NULL AND f.uploaded_by_id=$3::uuid
    AND f.blob_deleted_at IS NULL AND c.purpose='material' AND c.target_id IS NULL FOR UPDATE OF f,u,c`, pub.file_id, room, actor);
  if (!file) return fail('CONFLICT');
  const [ref] = await tx.query(`SELECT 1 WHERE EXISTS(SELECT 1 FROM materials WHERE file_id=$1::uuid)
    OR EXISTS(SELECT 1 FROM study_plan_versions WHERE file_id=$1::uuid)
    OR EXISTS(SELECT 1 FROM activity_instruction_files WHERE file_id=$1::uuid)
    OR EXISTS(SELECT 1 FROM attempt_attachments WHERE file_id=$1::uuid)
    OR EXISTS(SELECT 1 FROM foxy_publications WHERE file_id=$1::uuid AND id<>$2::uuid)`, pub.file_id, pub.id);
  if (ref) return fail('CONFLICT');
  await tx.query(`UPDATE file_custodies SET phase='deleting',operation_id=$2::uuid,
    lease_until=GREATEST(clock_timestamp()+interval '90 seconds',lease_until,(SELECT lease_until FROM foxy_publications WHERE id=$3::uuid)) WHERE file_id=$1::uuid`, pub.file_id, randomUUID(), pub.id);
}
export function createFoxyPublicationManagementRepository() {
  return { inspect: inspectFoxyPublicationManagement, retry: retryFoxyPublication, async discard(tx: SqlTransaction, actorId: string, publicationId: string, input: unknown) {
    const actor = agendaId(actorId).toLowerCase(), id = agendaId(publicationId).toLowerCase(), parsed = parseDiscardFoxyPublication(input);
    const requestId = parsed.requestId.toLowerCase(), value = { requestId, publicationRevision: parsed.publicationRevision, confirm: true };
    const hash = createHash('sha256').update(JSON.stringify({ action: 'DISCARD', publicationId: id, ...value })).digest('hex');
    const scope = await lockFoxyManagementScopes(tx, actor, id);
    const [pub] = await tx.query<Publication>(`SELECT id,file_id,state,revision,material_id FROM foxy_publications
      WHERE id=$1::uuid AND owner_id=$2::uuid AND resource_id=$3::uuid AND classroom_id=$4::uuid FOR UPDATE`, id, actor, scope.resource_id, scope.classroom_id);
    if (!pub) return fail('NOT_FOUND');
    const [prior] = await tx.query<Prior>('SELECT * FROM foxy_publication_command_requests WHERE owner_id=$1::uuid AND request_id=$2::uuid', actor, requestId);
    if (prior) {
      if (prior.publication_id !== id || prior.action !== 'DISCARD' || prior.input_hash !== hash) return fail('CONFLICT');
      return { publicationId: id, action: 'DISCARD' as const, publicationRevision: String(prior.publication_revision) };
    }
    if (!['PREPARING','READY','FAILED'].includes(pub.state) || pub.material_id || String(pub.revision) !== value.publicationRevision || BigInt(pub.revision) >= 9223372036854775807n) return fail('CONFLICT');
    await fenceFile(tx, actor, pub, scope.classroom_id);
    const [updated] = await tx.query<{ revision: bigint }>(`UPDATE foxy_publications SET state='DISCARDED',discarded_at=clock_timestamp(),lease_nonce=NULL,lease_until=NULL,error_code=NULL,revision=revision+1
      WHERE id=$1::uuid AND owner_id=$2::uuid AND revision=$3::bigint RETURNING revision`, id, actor, value.publicationRevision);
    if (!updated) return fail('CONFLICT');
    await tx.query(`INSERT INTO foxy_publication_command_requests(owner_id,request_id,publication_id,action,input_hash,publication_revision)
      VALUES($1::uuid,$2::uuid,$3::uuid,'DISCARD',$4,$5::bigint)`, actor, requestId, id, hash, String(updated.revision));
    return { publicationId: id, action: 'DISCARD' as const, publicationRevision: String(updated.revision) };
  } };
}
