import type { FoxyPrivateAssetReadRepositoryPort } from '../../application/ports.ts';
import { agendaId } from '../../../../../../../src/core/domain/agenda/values.ts';
import { type FoxyPublicationManagement } from '../../../../../../../src/core/domain/foxy/resource.ts';
import type { SqlTransaction } from '../../../../../../../src/core/contracts/sql.ts';
import { decideFoxyPublicationManagement } from '../domain/management-policy.ts';
import { REPLAYABLE_FOXY_PDF_VERSIONS } from '../domain/pdf-renderer-version.ts';
import { validRasterSource, publicationFileFormat } from './publication-raster-check.ts';

type Facts = Parameters<typeof decideFoxyPublicationManagement>[0];
type Row = { id: string; revision: bigint; state: Facts['state']; error_code: string | null; cleanup_error_code: string | null;
  source_current: boolean; destination_usable: boolean; associations_valid: boolean; referenced: boolean; file_id: string | null;
  phase: NonNullable<Facts['file']>['phase'] | null; status: NonNullable<Facts['file']>['uploadStatus'] | null;
  binding_valid: boolean; reservation_released: boolean; blob_deleted: boolean; proof_valid: boolean; lease_active: boolean; renderer_compatible: boolean; source_kind?: string; source_asset_id?: string | null; snapshot_visual?: unknown };
export async function inspectFoxyPublicationManagement(tx: SqlTransaction, owner: string, publicationId: string, assets: FoxyPrivateAssetReadRepositoryPort): Promise<FoxyPublicationManagement> {
  const actor = agendaId(owner).toLowerCase(), id = agendaId(publicationId).toLowerCase();
  const [r] = await tx.query<Row>(`SELECT p.id,p.revision,p.state,p.error_code,p.cleanup_error_code,p.file_id,p.source_kind,p.source_asset_id,p.snapshot_visual,
    COALESCE(r.revision=p.resource_revision,false) source_current,(a.archived_at IS NULL) destination_usable,
    ((p.unit_id IS NULL OR EXISTS(SELECT 1 FROM units u WHERE u.id=p.unit_id AND u.classroom_id=p.classroom_id))
      AND (p.topic_id IS NULL OR EXISTS(SELECT 1 FROM topics t WHERE t.id=p.topic_id AND t.unit_id=p.unit_id AND t.classroom_id=p.classroom_id))) associations_valid,
    (EXISTS(SELECT 1 FROM materials m WHERE m.file_id=p.file_id) OR EXISTS(SELECT 1 FROM study_plan_versions s WHERE s.file_id=p.file_id)
      OR EXISTS(SELECT 1 FROM activity_instruction_files i WHERE i.file_id=p.file_id) OR EXISTS(SELECT 1 FROM attempt_attachments t WHERE t.file_id=p.file_id)
      OR EXISTS(SELECT 1 FROM foxy_publications other WHERE other.file_id=p.file_id AND other.id<>p.id)) referenced,
    COALESCE(f.id IS NOT NULL AND u.id IS NOT NULL AND c.file_id IS NOT NULL AND f.classroom_id=p.classroom_id
      AND f.classroom_draft_id IS NULL AND f.uploaded_by_id=p.owner_id AND c.purpose='material' AND c.target_id IS NULL
      AND ((p.source_kind='TEXT' AND f.extension='pdf' AND p.artifact_page_count>0) OR (p.source_kind='VISUAL' AND f.extension=CASE WHEN p.artifact_mime_type='image/png' THEN 'png' ELSE 'jpg' END))
      AND f.size_bytes=p.artifact_size_bytes AND p.artifact_digest ~ '^[a-f0-9]{64}$' AND p.renderer_version IS NOT NULL AND (c.digest IS NULL OR c.digest=p.artifact_digest)
      AND (c.validated_digest IS NULL OR c.validated_digest=p.artifact_digest) AND (c.scanned_digest IS NULL OR c.scanned_digest=p.artifact_digest),false) binding_valid,
    CASE WHEN f.classroom_id=p.classroom_id AND f.classroom_draft_id IS NULL AND f.uploaded_by_id=p.owner_id
      AND c.purpose='material' AND c.target_id IS NULL AND ((p.source_kind='TEXT' AND f.extension='pdf') OR (p.source_kind='VISUAL' AND f.extension=CASE WHEN p.artifact_mime_type='image/png' THEN 'png' ELSE 'jpg' END)) AND f.size_bytes=p.artifact_size_bytes
      THEN c.phase ELSE 'deleted' END phase,u.status::text status,COALESCE(u.reservation_released_at IS NOT NULL,true) reservation_released,
    COALESCE(f.blob_deleted_at IS NOT NULL,true) blob_deleted,COALESCE(c.lease_until>clock_timestamp(),false) lease_active,
    COALESCE((p.source_kind='TEXT' AND p.renderer_version=ANY($3::text[])) OR (p.source_kind='VISUAL' AND p.renderer_version IN ('foxy-image-original-v1','foxy-diagram-png-v1')),false) renderer_compatible,
    COALESCE(f.classroom_id=p.classroom_id AND f.classroom_draft_id IS NULL AND f.uploaded_by_id=p.owner_id
      AND c.purpose='material' AND c.target_id IS NULL AND c.phase='ready' AND f.validation_status='APPROVED' AND f.scan_status='CLEAN'
      AND f.validated_at IS NOT NULL AND f.scanned_at IS NOT NULL AND u.completed_at IS NOT NULL AND ${publicationFileFormat} AND f.size_bytes=p.artifact_size_bytes AND c.digest=p.artifact_digest
      AND c.validated_digest=p.artifact_digest AND c.scanned_digest=p.artifact_digest,false) proof_valid
    FROM foxy_publications p JOIN users owner ON owner.id=p.owner_id AND owner.account_role='teacher' AND owner.email_verified_at IS NOT NULL
    JOIN classrooms a ON a.id=p.classroom_id AND a.teacher_id=p.owner_id LEFT JOIN foxy_resources r ON r.id=p.resource_id AND r.owner_id=p.owner_id
    LEFT JOIN foxy_visual_assets v ON v.id=p.source_asset_id AND v.owner_id=p.owner_id
    JOIN foxy_conversations c0 ON c0.id=COALESCE(r.conversation_id,v.conversation_id) AND c0.owner_id=p.owner_id AND c0.deleted_at IS NULL
    LEFT JOIN files f ON f.id=p.file_id LEFT JOIN uploads u ON u.file_id=f.id LEFT JOIN file_custodies c ON c.file_id=f.id
    WHERE p.id=$1::uuid AND p.owner_id=$2::uuid AND (c0.context_kind='GENERAL' OR EXISTS
      (SELECT 1 FROM classrooms origin WHERE origin.id=c0.classroom_id AND origin.teacher_id=p.owner_id))`, id, actor, [...REPLAYABLE_FOXY_PDF_VERSIONS]);
  if (!r) throw Object.assign(new Error('NOT_FOUND'), { code: 'NOT_FOUND' });
  if (r.source_kind === 'VISUAL') r.source_current = !!r.source_asset_id && await validRasterSource(tx,actor,r.source_asset_id,r.snapshot_visual, assets);
  if (r.file_id && !r.binding_valid) throw Object.assign(new Error('SERVICE_UNAVAILABLE'), { code: 'SERVICE_UNAVAILABLE' });
  const file: Facts['file'] = r.file_id ? { phase: r.phase ?? 'deleted', uploadStatus: r.status ?? 'CANCELLED',
    reservationReleased: r.reservation_released, blobDeleted: r.blob_deleted, proofValid: r.proof_valid,
    leaseActive: r.lease_active, rendererCompatible: r.renderer_compatible } : null;
  const result = decideFoxyPublicationManagement({ state: r.state, errorCode: r.error_code, sourceCurrent: r.source_current,
    destinationUsable: r.destination_usable, associationsValid: r.associations_valid, referenced: r.referenced, cleanupError: r.cleanup_error_code, file });
  return { publicationId: r.id, publicationRevision: String(r.revision), ...result };
}
