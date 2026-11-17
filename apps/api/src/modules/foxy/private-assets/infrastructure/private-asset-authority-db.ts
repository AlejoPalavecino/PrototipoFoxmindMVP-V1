import type { FoxyAspectRatio, FoxyVisualKind, FoxyDiagram } from '../../../../../../../src/core/domain/foxy/visual.ts';
import type { SqlDatabase, SqlTransaction } from '../../../../../../../src/core/contracts/sql.ts';
export type Lease = { assetId: string; ownerId: string; conversationId: string; leaseNonce: string };
export type Metadata = { digest: string; sizeBytes: number; mimeType: 'image/png' | 'image/jpeg'; width: number; height: number;
  producerVersion: 'foxy-diagram-png-v1' | 'foxy-image-original-v1'; title: string; description: string; diagram: FoxyDiagram | null };
export type AssetRow = { id: string; owner_id: string; conversation_id: string; request_id: string; input_hash: string; conversation_revision: bigint;
  kind: FoxyVisualKind; aspect_ratio: FoxyAspectRatio; storage_key: string; reserved_bytes: bigint; state: string; lease_nonce: string | null;
  digest: string | null; size_bytes: bigint | null; mime_type: Metadata['mimeType'] | null; width: number | null; height: number | null;
  producer_version: Metadata['producerVersion'] | null; title: string | null; description: string | null; diagram: FoxyDiagram | null };
export function denied(): never { throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' }); }
export function conflict(): never { throw Object.assign(new Error('CONFLICT'), { code: 'CONFLICT' }); }
export function transaction<T>(database: SqlDatabase, fn: (tx: SqlTransaction) => Promise<T>): Promise<T> {
  return database.$transaction(raw => fn({ query: (sql, ...args) => raw.$queryRawUnsafe(sql, ...args) }), { maxWait: 2000, timeout: 6000 });
}
export async function lockAsset(tx: SqlTransaction, owner: string, id: string): Promise<AssetRow> {
  const [ref] = await tx.query<{ conversation_id: string; classroom_id: string | null }>(`SELECT a.conversation_id,c.classroom_id FROM foxy_visual_assets a
    JOIN foxy_conversations c ON c.id=a.conversation_id AND c.owner_id=a.owner_id WHERE a.id=$1::uuid AND a.owner_id=$2::uuid`, id, owner);
  if (!ref || !(await tx.query("SELECT id FROM users WHERE id=$1::uuid AND account_role='teacher' AND email_verified_at IS NOT NULL FOR UPDATE", owner)).length) return denied();
  if (ref.classroom_id && !(await tx.query('SELECT id FROM classrooms WHERE id=$1::uuid AND teacher_id=$2::uuid AND archived_at IS NULL FOR UPDATE', ref.classroom_id, owner)).length) return denied();
  if (!(await tx.query('SELECT id FROM foxy_conversations WHERE id=$1::uuid AND owner_id=$2::uuid AND deleted_at IS NULL FOR UPDATE', ref.conversation_id, owner)).length) return denied();
  await tx.query('SELECT id FROM foxy_visual_jobs WHERE asset_id=$1::uuid AND owner_id=$2::uuid FOR UPDATE', id, owner);
  const [asset] = await tx.query<AssetRow>('SELECT * FROM foxy_visual_assets WHERE id=$1::uuid AND owner_id=$2::uuid AND conversation_id=$3::uuid FOR UPDATE', id, owner, ref.conversation_id);
  return asset ?? denied();
}
export function payload(row: AssetRow): Metadata | null {
  if (!row.digest) return null;
  return { digest: row.digest, sizeBytes: Number(row.size_bytes), mimeType: row.mime_type!, width: row.width!, height: row.height!,
    producerVersion: row.producer_version!, title: row.title!, description: row.description!, diagram: row.diagram ? structuredClone(row.diagram) : null };
}
export function grant(row: AssetRow, lease: Lease) {
  return { ...lease, kind: row.kind, aspectRatio: row.aspect_ratio, storageKey: row.storage_key, reservedBytes: BigInt(row.reserved_bytes), payload: payload(row) };
}
