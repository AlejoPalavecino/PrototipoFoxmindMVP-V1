import { assetUuid, parseFoxyDiagram, type FoxyPrivateAssetView, type FoxyPrivateAssetInspection, type FoxyPrivateAssetPayloadView, type FoxyPrivateAssetReadDescriptor, type FoxyPrivateAssetProducer, type FoxyDiagram, type SqlTransaction } from '../../../../src/core/domain/index.ts';

type Row = { id: string; owner_id: string; conversation_id: string; kind: FoxyPrivateAssetView['kind']; aspect_ratio: FoxyPrivateAssetView['aspectRatio']; state: FoxyPrivateAssetView['state']; revision: bigint; storage_key: string; digest: string | null; size_bytes: bigint | null; mime_type: 'image/png' | 'image/jpeg' | null; width: number | null; height: number | null; producer_version: string | null; title: string | null; description: string | null; diagram: FoxyDiagram | null; validated_digest: string | null; scanned_digest: string | null; validated_at: Date | null; scanned_at: Date | null; discarded_at: Date | null; blob_deleted_at: Date | null; quota_released_at: Date | null };
const fail = (code: string): never => { throw Object.assign(new Error(code), { code }); };
async function load(tx: SqlTransaction, ownerId: string, assetId: string): Promise<{ row: Row; classroomId: string | null }> {
  const owner = assetUuid(ownerId), id = assetUuid(assetId);
  const [ref] = await tx.query<{ conversation_id: string; classroom_id: string | null }>(`SELECT a.conversation_id,c.classroom_id FROM foxy_visual_assets a JOIN foxy_conversations c ON c.id=a.conversation_id AND c.owner_id=a.owner_id WHERE a.id=$1::uuid AND a.owner_id=$2::uuid AND c.deleted_at IS NULL`, id, owner);
  if (!ref) return fail('NOT_FOUND');
  if (ref.classroom_id && !(await tx.query('SELECT id FROM classrooms WHERE id=$1::uuid AND teacher_id=$2::uuid FOR SHARE', ref.classroom_id, owner)).length) return fail('NOT_FOUND');
  const [conversation] = await tx.query<{ classroom_id: string | null }>('SELECT classroom_id FROM foxy_conversations WHERE id=$1::uuid AND owner_id=$2::uuid AND deleted_at IS NULL FOR SHARE', ref.conversation_id, owner);
  if (!conversation || conversation.classroom_id !== ref.classroom_id) return fail('NOT_FOUND');
  const [row] = await tx.query<Row>('SELECT * FROM foxy_visual_assets WHERE id=$1::uuid AND owner_id=$2::uuid AND conversation_id=$3::uuid FOR SHARE', id, owner, ref.conversation_id);
  if (!row) return fail('NOT_FOUND'); return { row, classroomId: ref.classroom_id };
}
function valid(row: Row): boolean {
  const size = Number(row.size_bytes), w = row.width, h = row.height;
  if (row.state !== 'READY' || row.discarded_at || row.blob_deleted_at || row.quota_released_at || !row.digest || !/^[a-f0-9]{64}$/u.test(row.digest)
    || row.validated_digest !== row.digest || row.scanned_digest !== row.digest || !row.validated_at || !row.scanned_at
    || !Number.isSafeInteger(size) || size < 1 || size > 10485760 || !w || !h || !Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1 || w > 4096 || h > 4096 || w * h > 4000000
    || !['image/png','image/jpeg'].includes(row.mime_type ?? '') || row.storage_key !== `foxy-assets/${row.owner_id}/${row.id}` || row.title === null || row.description === null) return false;
  if (row.kind === 'IMAGE') return row.producer_version === 'foxy-image-original-v1' && row.diagram === null;
  if (row.kind !== 'DIAGRAM' || row.producer_version !== 'foxy-diagram-png-v1' || row.mime_type !== 'image/png') return false;
  try { const diagram = parseFoxyDiagram(row.diagram); return diagram.nodes.length > 0 && diagram.title === row.title && diagram.description === row.description; } catch { return false; }
}
export function createFoxyPrivateAssetReadRepository() {
  return {
    async inspect(tx: SqlTransaction, ownerId: string, assetId: string): Promise<FoxyPrivateAssetInspection> {
      const { row } = await load(tx, ownerId, assetId), discarded = row.state === 'DISCARDED';
      const asset: FoxyPrivateAssetView = { id: row.id, conversationId: row.conversation_id, kind: row.kind, aspectRatio: row.aspect_ratio, state: row.state, revision: String(row.revision) };
      const payload: FoxyPrivateAssetPayloadView | null = !discarded && row.digest && row.title !== null && row.description !== null && row.mime_type && row.size_bytes !== null && row.width !== null && row.height !== null && (row.producer_version === 'foxy-image-original-v1' || row.producer_version === 'foxy-diagram-png-v1') ? { title: row.title, description: row.description, mimeType: row.mime_type, sizeBytes: String(row.size_bytes), width: row.width, height: row.height, producerVersion: row.producer_version, diagram: row.diagram ? structuredClone(row.diagram) : null } : null;
      return { asset, payload, canPreview: valid(row), canDiscard: !discarded, cleanupState: discarded ? (row.blob_deleted_at && row.quota_released_at ? 'DONE' : 'PENDING') : 'NOT_REQUESTED' };
    },
    async describe(tx: SqlTransaction, ownerId: string, assetId: string): Promise<FoxyPrivateAssetReadDescriptor> {
      const { row, classroomId } = await load(tx, ownerId, assetId);
      if (row.state === 'DISCARDED') return fail('NOT_FOUND'); if (!valid(row)) return fail('FILE_NOT_READY');
      return { assetId: row.id, ownerId: row.owner_id, conversationId: row.conversation_id, sourceClassroomId: classroomId, assetRevision: String(row.revision), kind: row.kind, aspectRatio: row.aspect_ratio, storageKey: row.storage_key, digest: row.digest!, sizeBytes: Number(row.size_bytes), mimeType: row.mime_type!, width: row.width!, height: row.height!, producerVersion: row.producer_version as FoxyPrivateAssetProducer };
    },
  };
}
