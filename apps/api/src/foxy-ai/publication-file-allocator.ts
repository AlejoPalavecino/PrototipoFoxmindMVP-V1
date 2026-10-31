import type { FileService } from '../files/index.ts';
import type { createFoxyUnitOfWork } from './unit-of-work.ts';
import type { FoxyPublicationLease } from './publication-queue.ts';

type Artifact = { digest: string; sizeBytes: number; pageCount: number; rendererVersion: string };
function invalid(code: 'INVALID_INPUT' | 'CONFLICT'): never { throw Object.assign(new Error(code), { code }); }
function validate(value: Artifact): void {
  if (!value || !/^[a-f0-9]{64}$/u.test(value.digest) || !Number.isSafeInteger(value.sizeBytes) || value.sizeBytes < 1 || value.sizeBytes > 20000000
    || !Number.isSafeInteger(value.pageCount) || value.pageCount < 1 || value.pageCount > 100
    || !['foxy-text-pdf-v1', 'foxy-pdf-v1'].includes(value.rendererVersion)) invalid('INVALID_INPUT');
}
export function createFoxyPublicationFileAllocator(options: { uow: ReturnType<typeof createFoxyUnitOfWork>; files: Pick<FileService, 'beginInTransaction'> }) {
  return { ensureFile: async (request: unknown, lease: FoxyPublicationLease, artifact: Artifact, signal: AbortSignal) => {
    if (!lease || !artifact) return invalid('INVALID_INPUT');
    lease = { publicationId: lease.publicationId, ownerId: lease.ownerId, classroomId: lease.classroomId, leaseNonce: lease.leaseNonce };
    artifact = { digest: artifact.digest, sizeBytes: artifact.sizeBytes, pageCount: artifact.pageCount, rendererVersion: artifact.rendererVersion };
    validate(artifact); signal.throwIfAborted();
    return options.uow.run(request, true, async (tx, actor) => {
      if (!lease || actor.id.toLowerCase() !== lease.ownerId?.toLowerCase()) return null;
      const [origin] = await tx.query<{ origin_room: string | null }>(`SELECT c.classroom_id AS origin_room
        FROM foxy_publications p JOIN foxy_resources r ON r.id=p.resource_id AND r.owner_id=p.owner_id
        JOIN foxy_conversations c ON c.id=r.conversation_id AND c.owner_id=r.owner_id
        WHERE p.id=$1::uuid AND p.owner_id=$2::uuid`, lease.publicationId, actor.id);
      if (!origin) return null;
      const rooms = await tx.query<{ id: string; teacher_id: string; archived_at: Date | null }>(`SELECT id,teacher_id,archived_at FROM classrooms
        WHERE id IN ($1::uuid,$2::uuid) ORDER BY id FOR UPDATE`, lease.classroomId, origin.origin_room);
      const target = rooms.find(room => room.id.toLowerCase() === lease.classroomId.toLowerCase());
      const source = origin.origin_room ? rooms.find(room => room.id.toLowerCase() === origin.origin_room!.toLowerCase()) : null;
      if (!target || target.teacher_id.toLowerCase() !== actor.id.toLowerCase() || target.archived_at
        || (origin.origin_room && (!source || source.teacher_id.toLowerCase() !== actor.id.toLowerCase()))) return null;
      const [validSource] = await tx.query(`SELECT r.id FROM foxy_publications p JOIN foxy_resources r ON r.id=p.resource_id AND r.owner_id=p.owner_id
        JOIN foxy_conversations c ON c.id=r.conversation_id AND c.owner_id=r.owner_id
        WHERE p.id=$1::uuid AND p.owner_id=$2::uuid AND r.revision=p.resource_revision AND c.deleted_at IS NULL
        AND c.classroom_id IS NOT DISTINCT FROM $3::uuid FOR SHARE OF r,c`, lease.publicationId, actor.id, origin.origin_room);
      if (!validSource) return null;
      const [row] = await tx.query<{ file_id: string | null; artifact_digest: string | null; artifact_size_bytes: number | null;
        artifact_page_count: number | null; renderer_version: string | null }>(`SELECT file_id,artifact_digest,artifact_size_bytes,artifact_page_count,renderer_version FROM foxy_publications
        WHERE id=$1::uuid AND owner_id=$2::uuid AND classroom_id=$3::uuid AND state='PREPARING' AND lease_nonce=$4::uuid
        AND lease_until>clock_timestamp() FOR UPDATE`, lease.publicationId, actor.id, lease.classroomId, lease.leaseNonce);
      if (!row) return null;
      signal.throwIfAborted();
      if (row.file_id) {
        if (row.artifact_digest !== artifact.digest || row.artifact_size_bytes !== artifact.sizeBytes || row.artifact_page_count !== artifact.pageCount
          || row.renderer_version !== artifact.rendererVersion) return invalid('CONFLICT');
        return { fileId: row.file_id, created: false };
      }
      const file = await options.files.beginInTransaction(tx, request, { kind: 'classroom', id: lease.classroomId },
        { purpose: 'material', name: 'foxy-ai.pdf', bytes: artifact.sizeBytes });
      signal.throwIfAborted();
      const updated = await tx.query(`UPDATE foxy_publications SET file_id=$5::uuid,artifact_digest=$6,artifact_size_bytes=$7,
        artifact_page_count=$8,renderer_version=$9 WHERE id=$1::uuid AND owner_id=$2::uuid AND classroom_id=$3::uuid
        AND lease_nonce=$4::uuid AND lease_until>clock_timestamp() AND state='PREPARING' AND file_id IS NULL RETURNING id`,
      lease.publicationId, actor.id, lease.classroomId, lease.leaseNonce, file.id, artifact.digest, artifact.sizeBytes, artifact.pageCount, artifact.rendererVersion);
      if (!updated.length) return invalid('CONFLICT');
      return { fileId: file.id, created: true };
    });
  } };
}
