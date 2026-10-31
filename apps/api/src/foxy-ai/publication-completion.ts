import type { SqlDatabase, SqlTransaction } from '../../../../src/core/domain/index.ts';
import type { FoxyPublicationLease } from './publication-queue.ts';

type Result = { state: 'READY' } | { state: 'FAILED'; errorCode: string };
function input(value: Result): Result {
  if (value?.state === 'READY' && Object.keys(value).length === 1) return { state: 'READY' };
  if (value?.state === 'FAILED' && Object.keys(value).length === 2 && typeof value.errorCode === 'string'
    && /^[A-Z][A-Z0-9_]{1,79}$/u.test(value.errorCode)) return { state: 'FAILED', errorCode: value.errorCode };
  throw Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' });
}
async function scopes(tx: SqlTransaction, lease: FoxyPublicationLease): Promise<boolean> {
  const [owner] = await tx.query(`SELECT id FROM users WHERE id=$1::uuid AND account_role='teacher'
    AND email_verified_at IS NOT NULL FOR UPDATE`, lease.ownerId);
  if (!owner) return false;
  const [origin] = await tx.query<{ origin_room: string | null }>(`SELECT c.classroom_id AS origin_room FROM foxy_publications p
    JOIN foxy_resources r ON r.id=p.resource_id AND r.owner_id=p.owner_id JOIN foxy_conversations c ON c.id=r.conversation_id AND c.owner_id=r.owner_id
    WHERE p.id=$1::uuid AND p.owner_id=$2::uuid`, lease.publicationId, lease.ownerId);
  if (!origin) return false;
  const rooms = await tx.query<{ id: string; teacher_id: string; archived_at: Date | null }>(`SELECT id,teacher_id,archived_at FROM classrooms
    WHERE id IN ($1::uuid,$2::uuid) ORDER BY id FOR UPDATE`, lease.classroomId, origin.origin_room);
  const target = rooms.find(r => r.id.toLowerCase() === lease.classroomId.toLowerCase());
  const source = origin.origin_room ? rooms.find(r => r.id.toLowerCase() === origin.origin_room!.toLowerCase()) : null;
  if (!target || target.teacher_id.toLowerCase() !== lease.ownerId.toLowerCase() || target.archived_at
    || (origin.origin_room && (!source || source.teacher_id.toLowerCase() !== lease.ownerId.toLowerCase()))) return false;
  const [valid] = await tx.query(`SELECT r.id FROM foxy_publications p JOIN foxy_resources r ON r.id=p.resource_id AND r.owner_id=p.owner_id
    JOIN foxy_conversations c ON c.id=r.conversation_id AND c.owner_id=r.owner_id WHERE p.id=$1::uuid AND p.owner_id=$2::uuid
    AND r.revision=p.resource_revision AND c.deleted_at IS NULL AND c.classroom_id IS NOT DISTINCT FROM $3::uuid FOR SHARE OF r,c`,
  lease.publicationId, lease.ownerId, origin.origin_room);
  return !!valid;
}
async function proof(tx: SqlTransaction, lease: FoxyPublicationLease): Promise<boolean> {
  const [row] = await tx.query(`SELECT p.id FROM foxy_publications p JOIN files f ON f.id=p.file_id
    JOIN uploads u ON u.file_id=f.id JOIN file_custodies c ON c.file_id=f.id
    WHERE p.id=$1::uuid AND p.owner_id=$2::uuid AND p.classroom_id=$3::uuid AND p.lease_nonce=$4::uuid
    AND p.state='PREPARING' AND p.lease_until>clock_timestamp() AND f.classroom_id=p.classroom_id AND f.uploaded_by_id=p.owner_id
    AND f.blob_deleted_at IS NULL AND f.extension='pdf' AND f.detected_mime_type='application/pdf' AND f.size_bytes=p.artifact_size_bytes
    AND f.validation_status='APPROVED' AND f.scan_status='CLEAN' AND f.validated_at IS NOT NULL AND f.scanned_at IS NOT NULL
    AND u.status='COMPLETED' AND u.completed_at IS NOT NULL AND c.purpose='material' AND c.target_id IS NULL AND c.phase='ready'
    AND c.digest=p.artifact_digest AND c.validated_digest=p.artifact_digest AND c.scanned_digest=p.artifact_digest FOR UPDATE OF p,f,u,c`,
  lease.publicationId, lease.ownerId, lease.classroomId, lease.leaseNonce);
  return !!row;
}
export function createFoxyPublicationCompletion(options: { database: SqlDatabase }) {
  return { async finish(lease: FoxyPublicationLease, result: Result): Promise<boolean> {
    const outcome = input(result);
    const copy = { publicationId: lease.publicationId, ownerId: lease.ownerId, classroomId: lease.classroomId, leaseNonce: lease.leaseNonce };
    return options.database.$transaction(async raw => {
      const tx: SqlTransaction = { query: (sql, ...args) => raw.$queryRawUnsafe(sql, ...args) };
      if (outcome.state === 'READY') {
        if (!await scopes(tx, copy)) return false;
        const [claimed] = await tx.query(`SELECT id FROM foxy_publications WHERE id=$1::uuid AND owner_id=$2::uuid
          AND classroom_id=$3::uuid AND lease_nonce=$4::uuid AND state='PREPARING' AND lease_until>clock_timestamp() FOR UPDATE`,
        copy.publicationId, copy.ownerId, copy.classroomId, copy.leaseNonce);
        if (!claimed || !await proof(tx, copy)) return false;
      }
      const rows = await tx.query(`UPDATE foxy_publications SET state=$5,error_code=$6,lease_nonce=NULL,lease_until=NULL,revision=revision+1
        WHERE id=$1::uuid AND owner_id=$2::uuid AND classroom_id=$3::uuid AND lease_nonce=$4::uuid
        AND state='PREPARING' AND lease_until>clock_timestamp() RETURNING id`, copy.publicationId, copy.ownerId,
      copy.classroomId, copy.leaseNonce, outcome.state, outcome.state === 'FAILED' ? outcome.errorCode : null);
      return rows.length === 1;
    }, { maxWait: 2000, timeout: 6000 });
  } };
}
