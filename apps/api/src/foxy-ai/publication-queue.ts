import { randomUUID } from 'node:crypto';
import type { SqlDatabase, SqlTransaction } from '../../../../src/core/domain/index.ts';
export type FoxyPublicationLease = { publicationId: string; ownerId: string; classroomId: string; leaseNonce: string };
const fileActive = `EXISTS (SELECT 1 FROM file_custodies f WHERE f.file_id=p.file_id
  AND f.phase IN ('receiving','inspecting') AND f.lease_until>clock_timestamp())`;
const eligible = `EXISTS (SELECT 1 FROM users u JOIN classrooms c ON c.id=p.classroom_id AND c.teacher_id=p.owner_id
  LEFT JOIN foxy_resources r ON p.source_kind='TEXT' AND r.id=p.resource_id AND r.owner_id=p.owner_id AND r.revision=p.resource_revision
  LEFT JOIN foxy_visual_assets v ON p.source_kind='VISUAL' AND v.id=p.source_asset_id AND v.owner_id=p.owner_id AND v.revision=p.source_asset_revision
    AND v.state='READY' AND v.discarded_at IS NULL AND v.blob_deleted_at IS NULL AND v.quota_released_at IS NULL
    AND v.digest IS NOT NULL AND v.validated_digest=v.digest AND v.scanned_digest=v.digest AND v.validated_at IS NOT NULL AND v.scanned_at IS NOT NULL
    AND p.snapshot_visual=jsonb_build_object('kind','VISUAL','assetId',v.id::text,'assetRevision',v.revision::text,'digest',v.digest,'sizeBytes',v.size_bytes,
      'mimeType',v.mime_type,'width',v.width,'height',v.height,'producerVersion',v.producer_version)
  JOIN foxy_conversations origin ON origin.id=COALESCE(r.conversation_id,v.conversation_id) AND origin.owner_id=p.owner_id AND origin.deleted_at IS NULL
  WHERE u.id=p.owner_id AND u.account_role='teacher' AND u.email_verified_at IS NOT NULL AND c.archived_at IS NULL
  AND (origin.context_kind='GENERAL' OR EXISTS (SELECT 1 FROM classrooms source WHERE source.id=origin.classroom_id AND source.teacher_id=p.owner_id)))`;
export function createFoxyPublicationQueue(options: { database: SqlDatabase }) {
  const transact = <T>(operation: (tx: SqlTransaction) => Promise<T>) => options.database.$transaction(
    raw => operation({ query: (sql, ...args) => raw.$queryRawUnsafe(sql, ...args) }), { maxWait: 2000, timeout: 6000 });
  async function change(lease: FoxyPublicationLease, release: boolean): Promise<boolean> {
    if (!lease) return false;
    const value = { ...lease };
    return transact(async tx => {
      await tx.query('SELECT id FROM classrooms WHERE id=$1::uuid FOR UPDATE', value.classroomId);
      await tx.query('SELECT 1 FROM pg_advisory_xact_lock(78123003)');
      const rows = await tx.query(`UPDATE foxy_publications p SET ${release ? 'lease_nonce=NULL,lease_until=NULL' : "lease_until=clock_timestamp()+interval '90 seconds'"}
        WHERE p.id=$1::uuid AND p.owner_id=$2::uuid AND p.classroom_id=$3::uuid AND p.lease_nonce=$4::uuid
        AND p.state='PREPARING' AND p.lease_until>clock_timestamp() AND ${eligible} ${release ? `AND NOT ${fileActive}` : ''} RETURNING p.id`,
      value.publicationId, value.ownerId, value.classroomId, value.leaseNonce);
      return rows.length === 1;
    });
  }
  return { renew: (lease: FoxyPublicationLease) => change(lease, false), release: (lease: FoxyPublicationLease) => change(lease, true),
    claim: () => transact(async tx => {
      const [candidate] = await tx.query<{ id: string; classroom_id: string }>(`SELECT p.id,p.classroom_id FROM foxy_publications p
        WHERE p.state='PREPARING' AND (p.lease_until IS NULL OR p.lease_until<=clock_timestamp())
        AND NOT ${fileActive} AND ${eligible} ORDER BY p.created_at,p.id LIMIT 1`);
      if (!candidate) return null;
      await tx.query('SELECT id FROM classrooms WHERE id=$1::uuid FOR UPDATE', candidate.classroom_id);
      await tx.query('SELECT 1 FROM pg_advisory_xact_lock(78123003)');
      const [capacity] = await tx.query<{ n: number }>(`SELECT count(*)::int AS n FROM foxy_publications p WHERE p.lease_until>clock_timestamp() OR ${fileActive}`);
      if (!capacity || Number(capacity.n) >= 2) return null;
      const nonce = randomUUID();
      const [row] = await tx.query<{ id: string; owner_id: string; classroom_id: string }>(`UPDATE foxy_publications p
        SET lease_nonce=$2::uuid,lease_until=clock_timestamp()+interval '90 seconds'
        WHERE p.id=$1::uuid AND p.classroom_id=$3::uuid AND p.state='PREPARING'
        AND (p.lease_until IS NULL OR p.lease_until<=clock_timestamp()) AND NOT ${fileActive} AND ${eligible}
        RETURNING p.id,p.owner_id,p.classroom_id`, candidate.id, nonce, candidate.classroom_id);
      return row ? { publicationId: row.id, ownerId: row.owner_id, classroomId: row.classroom_id, leaseNonce: nonce } : null;
    }) };
}
