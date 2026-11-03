import { isDeepStrictEqual } from 'node:util';
import type { FoxyPublicationArtifact, SqlTransaction } from '../../../../src/core/domain/index.ts';
import { createFoxyPrivateAssetReadRepository } from './private-asset-read-repository.ts';
import type { createFoxyUnitOfWork } from './unit-of-work.ts';
import type { FoxyPublicationLease } from './publication-queue.ts';

type Artifact = FoxyPublicationArtifact;
type MaterialFiles = { beginInTransaction(tx: SqlTransaction, request: unknown, scope: { kind: 'classroom'; id: string },
  intent: { purpose: 'material'; name: string; bytes: number }): Promise<{ id: string }> };
function invalid(code: 'INVALID_INPUT' | 'CONFLICT'): never { throw Object.assign(new Error(code), { code }); }
function validate(value: Artifact): void {
  if (!value || !/^[a-f0-9]{64}$/u.test(value.digest) || !Number.isSafeInteger(value.sizeBytes) || value.sizeBytes<1) return invalid('INVALID_INPUT');
  if ('kind' in value) {
    if (value.kind !== 'RASTER' || value.sizeBytes>10485760 || !Number.isInteger(value.width) || !Number.isInteger(value.height)
      || value.width<1 || value.height<1 || value.width>4096 || value.height>4096 || value.width*value.height>4000000
      || !((value.mimeType==='image/png' && value.extension==='png') || (value.mimeType==='image/jpeg' && value.extension==='jpg'))
      || !['foxy-diagram-png-v1','foxy-image-original-v1'].includes(value.producerVersion)
      || (value.producerVersion==='foxy-diagram-png-v1' && value.mimeType!=='image/png')) return invalid('INVALID_INPUT');
  } else if (value.sizeBytes>20000000 || !Number.isSafeInteger(value.pageCount) || value.pageCount<1 || value.pageCount>100
    || !['foxy-text-pdf-v1','foxy-pdf-v1'].includes(value.rendererVersion)) return invalid('INVALID_INPUT');
}
export function createFoxyPublicationFileAllocator(options: { uow: ReturnType<typeof createFoxyUnitOfWork>; files: MaterialFiles }) {
  return { ensureFile: async (request: unknown, lease: FoxyPublicationLease, artifact: Artifact, signal: AbortSignal) => {
    if (!lease || !artifact) return invalid('INVALID_INPUT');
    lease = { publicationId: lease.publicationId, ownerId: lease.ownerId, classroomId: lease.classroomId, leaseNonce: lease.leaseNonce };
    artifact = structuredClone(artifact);
    validate(artifact); signal.throwIfAborted();
    return options.uow.run(request, true, async (tx, actor) => {
      if (!lease || actor.id.toLowerCase() !== lease.ownerId?.toLowerCase()) return null;
      const [origin] = await tx.query<{ origin_room: string | null; source_kind: string; source_asset_id: string | null; snapshot_visual: unknown }>(`SELECT c.classroom_id AS origin_room,p.source_kind,p.source_asset_id,p.snapshot_visual
        FROM foxy_publications p LEFT JOIN foxy_resources r ON r.id=p.resource_id AND r.owner_id=p.owner_id
        LEFT JOIN foxy_visual_assets v ON v.id=p.source_asset_id AND v.owner_id=p.owner_id
        JOIN foxy_conversations c ON c.id=COALESCE(r.conversation_id,v.conversation_id) AND c.owner_id=p.owner_id
        WHERE p.id=$1::uuid AND p.owner_id=$2::uuid`, lease.publicationId, actor.id);
      if (!origin) return null;
      const rooms = await tx.query<{ id: string; teacher_id: string; archived_at: Date | null }>(`SELECT id,teacher_id,archived_at FROM classrooms
        WHERE id IN ($1::uuid,$2::uuid) ORDER BY id FOR UPDATE`, lease.classroomId, origin.origin_room);
      const target = rooms.find(room => room.id.toLowerCase() === lease.classroomId.toLowerCase());
      const source = origin.origin_room ? rooms.find(room => room.id.toLowerCase() === origin.origin_room!.toLowerCase()) : null;
      if (!target || target.teacher_id.toLowerCase() !== actor.id.toLowerCase() || target.archived_at
        || (origin.origin_room && (!source || source.teacher_id.toLowerCase() !== actor.id.toLowerCase()))) return null;
      if (origin.source_kind === 'VISUAL') {
        if (!origin.source_asset_id || !('kind' in artifact)) return invalid('CONFLICT');
        const source = await createFoxyPrivateAssetReadRepository().describe(tx,actor.id,origin.source_asset_id);
        const expected = { kind:'VISUAL',assetId:source.assetId,assetRevision:source.assetRevision,digest:source.digest,sizeBytes:source.sizeBytes,
          mimeType:source.mimeType,width:source.width,height:source.height,producerVersion:source.producerVersion };
        if (!isDeepStrictEqual(expected,origin.snapshot_visual) || artifact.digest!==source.digest || artifact.sizeBytes!==source.sizeBytes
          || artifact.mimeType!==source.mimeType || artifact.width!==source.width || artifact.height!==source.height || artifact.producerVersion!==source.producerVersion) return invalid('CONFLICT');
      } else {
        if ('kind' in artifact) return invalid('CONFLICT');
        const [validSource] = await tx.query(`SELECT r.id FROM foxy_publications p JOIN foxy_resources r ON r.id=p.resource_id AND r.owner_id=p.owner_id
          JOIN foxy_conversations c ON c.id=r.conversation_id AND c.owner_id=r.owner_id
          WHERE p.id=$1::uuid AND p.owner_id=$2::uuid AND r.revision=p.resource_revision AND c.deleted_at IS NULL
          AND c.classroom_id IS NOT DISTINCT FROM $3::uuid FOR SHARE OF r,c`, lease.publicationId, actor.id, origin.origin_room);
        if (!validSource) return null;
      }
      const [row] = await tx.query<{ file_id: string | null; artifact_digest: string | null; artifact_size_bytes: number | null;
        artifact_page_count: number | null; renderer_version: string | null; artifact_mime_type: string | null; artifact_width: number | null; artifact_height: number | null }>(`SELECT file_id,artifact_digest,artifact_size_bytes,artifact_page_count,renderer_version,artifact_mime_type,artifact_width,artifact_height FROM foxy_publications
        WHERE id=$1::uuid AND owner_id=$2::uuid AND classroom_id=$3::uuid AND state='PREPARING' AND lease_nonce=$4::uuid
        AND lease_until>clock_timestamp() FOR UPDATE`, lease.publicationId, actor.id, lease.classroomId, lease.leaseNonce);
      if (!row) return null;
      signal.throwIfAborted();
      if (row.file_id) {
        if (row.artifact_digest !== artifact.digest || row.artifact_size_bytes !== artifact.sizeBytes || ('kind' in artifact
          ? row.artifact_mime_type!==artifact.mimeType || row.artifact_width!==artifact.width || row.artifact_height!==artifact.height || row.renderer_version!==artifact.producerVersion
          : row.artifact_page_count!==artifact.pageCount || row.renderer_version!==artifact.rendererVersion)) return invalid('CONFLICT');
        return { fileId: row.file_id, created: false };
      }
      const file = await options.files.beginInTransaction(tx, request, { kind: 'classroom', id: lease.classroomId },
        { purpose: 'material', name: 'kind' in artifact ? `foxy-ai.${artifact.extension}` : 'foxy-ai.pdf', bytes: artifact.sizeBytes });
      signal.throwIfAborted();
      const updated = await tx.query(`UPDATE foxy_publications SET file_id=$5::uuid,artifact_digest=$6,artifact_size_bytes=$7,
        artifact_page_count=$8,renderer_version=$9,artifact_mime_type=$10,artifact_width=$11,artifact_height=$12 WHERE id=$1::uuid AND owner_id=$2::uuid AND classroom_id=$3::uuid
        AND lease_nonce=$4::uuid AND lease_until>clock_timestamp() AND state='PREPARING' AND file_id IS NULL RETURNING id`,
      lease.publicationId, actor.id, lease.classroomId, lease.leaseNonce, file.id, artifact.digest, artifact.sizeBytes, 'kind' in artifact ? null : artifact.pageCount, 'kind' in artifact ? artifact.producerVersion : artifact.rendererVersion,
      'kind' in artifact ? artifact.mimeType : 'application/pdf', 'kind' in artifact ? artifact.width : null, 'kind' in artifact ? artifact.height : null);
      if (!updated.length) return invalid('CONFLICT');
      return { fileId: file.id, created: true };
    });
  } };
}
