import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { agendaId } from '../../../../src/core/domain/index.ts';
import type { createFoxyUnitOfWork } from './unit-of-work.ts';
import { validRasterSource, publicationFileFormat } from './publication-raster-check.ts';

type Files = { read(request: unknown, id: string, mode: 'preview' | 'download'): Promise<{ bytes: Uint8Array }> };
type Row = { id: string; state: string; revision: bigint; resource_revision: bigint; snapshot_revision: bigint; resource_id: string;
  conversation_id: string; classroom_id: string; source_room: string | null; artifact_page_count: number | null; renderer_version: string | null; material_id: string | null;
  file_id: string | null; artifact_digest: string | null; artifact_size_bytes: number | null; proof: boolean; material_live: boolean;
  source_kind?: string; source_asset_id?: string|null; snapshot_visual?: unknown; artifact_mime_type?: string|null };
function fileFailure(error: unknown): never {
  const code = (error as { code?: unknown })?.code;
  if (typeof code === 'string' && ['AUTH_REQUIRED', 'EMAIL_VERIFICATION_REQUIRED', 'CSRF_INVALID', 'ORIGIN_NOT_ALLOWED', 'RATE_LIMITED', 'FILE_NOT_READY', 'NOT_FOUND'].includes(code))
    throw Object.assign(new Error(code), { code });
  if (code === 'FORBIDDEN') return fail('NOT_FOUND');
  throw Object.assign(new Error('SERVICE_UNAVAILABLE'), { code: 'SERVICE_UNAVAILABLE' });
}
function fail(code: 'NOT_FOUND' | 'FILE_NOT_READY' | 'INVALID_INPUT'): never { throw Object.assign(new Error(code), { code }); }
export function createFoxyPublicationFileReader(options: { uow: ReturnType<typeof createFoxyUnitOfWork>; files: Files }) {
  async function resolve(request: unknown, id: string) {
    return options.uow.run(request, false, async (tx, actor) => {
      const [row] = await tx.query<Row>(`SELECT p.id,p.state,p.revision,r.revision AS resource_revision,p.resource_revision AS snapshot_revision,
        p.resource_id,c.id AS conversation_id,p.classroom_id,c.classroom_id AS source_room,p.artifact_page_count,p.renderer_version,p.material_id,p.file_id,
        p.artifact_digest,p.artifact_size_bytes,p.source_kind,p.source_asset_id,p.snapshot_visual,p.artifact_mime_type,
        EXISTS (SELECT 1 FROM materials m JOIN files mf ON mf.id=m.file_id AND mf.classroom_id=m.classroom_id
          WHERE m.id=p.material_id AND m.classroom_id=p.classroom_id AND m.file_id=p.file_id AND m.deleted_at IS NULL AND mf.blob_deleted_at IS NULL) AS material_live,
        EXISTS (SELECT 1 FROM files f JOIN uploads u ON u.file_id=f.id JOIN file_custodies fc ON fc.file_id=f.id
          WHERE f.id=p.file_id AND f.classroom_id=p.classroom_id AND f.classroom_draft_id IS NULL AND f.uploaded_by_id=p.owner_id
          AND f.blob_deleted_at IS NULL AND ${publicationFileFormat} AND f.size_bytes=p.artifact_size_bytes
          AND f.validation_status='APPROVED' AND f.scan_status='CLEAN' AND f.validated_at IS NOT NULL AND f.scanned_at IS NOT NULL
          AND u.status='COMPLETED' AND u.completed_at IS NOT NULL AND fc.purpose='material' AND fc.target_id IS NULL AND fc.phase='ready'
          AND fc.digest=p.artifact_digest AND fc.validated_digest=p.artifact_digest AND fc.scanned_digest=p.artifact_digest) AS proof
        FROM foxy_publications p JOIN classrooms a ON a.id=p.classroom_id AND a.teacher_id=p.owner_id
        LEFT JOIN foxy_resources r ON r.id=p.resource_id AND r.owner_id=p.owner_id
        LEFT JOIN foxy_visual_assets v ON v.id=p.source_asset_id AND v.owner_id=p.owner_id
        JOIN foxy_conversations c ON c.id=COALESCE(r.conversation_id,v.conversation_id) AND c.owner_id=p.owner_id AND c.deleted_at IS NULL
        WHERE p.id=$1::uuid AND p.owner_id=$2::uuid
        AND (c.context_kind='GENERAL' OR EXISTS (SELECT 1 FROM classrooms origin WHERE origin.id=c.classroom_id AND origin.teacher_id=p.owner_id))`, id, actor.id);
      if (!row) return fail('NOT_FOUND');
      if (!['READY', 'PUBLISHED'].includes(row.state)) return fail('FILE_NOT_READY');
      if (row.state === 'PUBLISHED' && !row.material_live) return fail('NOT_FOUND');
      if (row.source_kind === 'VISUAL' && row.state === 'READY' && (!row.source_asset_id || !await validRasterSource(tx,actor.id,row.source_asset_id,row.snapshot_visual))) return fail('NOT_FOUND');
      if (!row.proof || !row.file_id || !row.artifact_digest || !/^[a-f0-9]{64}$/u.test(row.artifact_digest)
        || !Number.isSafeInteger(row.artifact_size_bytes) || row.artifact_size_bytes! < 1 || row.artifact_size_bytes! > 20000000) return fail('NOT_FOUND');
      return { id: row.id, state: row.state, revision: String(row.revision), resourceRevision: String(row.resource_revision),
        snapshotRevision: String(row.snapshot_revision), resourceId: row.resource_id, conversationId: row.conversation_id, classroomId: row.classroom_id,
        sourceRoom: row.source_room, pageCount: row.artifact_page_count, rendererVersion: row.renderer_version, materialId: row.material_id,
        fileId: row.file_id, digest: row.artifact_digest, sizeBytes: row.artifact_size_bytes!, mimeType: row.source_kind === 'VISUAL' ? row.artifact_mime_type : 'application/pdf' };
    });
  }
  return { async readFile(request: unknown, publicationId: string, mode: 'preview' | 'download') {
    agendaId(publicationId); if (mode !== 'preview' && mode !== 'download') return fail('INVALID_INPUT');
    const before = await resolve(request, publicationId);
    let result: Awaited<ReturnType<Files['read']>>;
    try { result = await options.files.read(request, before.fileId, mode); }
    catch (error) {
      const after = await resolve(request, publicationId);
      if (!isDeepStrictEqual(before, after)) return fail('NOT_FOUND');
      return fileFailure(error);
    }
    const bytes = result.bytes instanceof Uint8Array && result.bytes.byteLength === before.sizeBytes ? Buffer.from(result.bytes) : null;
    const after = await resolve(request, publicationId);
    if (!isDeepStrictEqual(before, after) || !bytes || createHash('sha256').update(bytes).digest('hex') !== before.digest) return fail('NOT_FOUND');
    return { bytes, headers: { 'Content-Type': before.mimeType ?? 'application/octet-stream', 'Content-Length': String(bytes.length),
      'Content-Disposition': mode === 'preview' ? 'inline' : 'attachment', 'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'same-origin', 'Content-Security-Policy': "sandbox; default-src 'none'" } };
  } };
}
