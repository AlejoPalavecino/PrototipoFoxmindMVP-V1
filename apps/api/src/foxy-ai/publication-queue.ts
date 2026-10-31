import { randomUUID } from 'node:crypto';
import type { SqlDatabase, SqlTransaction } from '../../../../src/core/domain/index.ts';
export type FoxyPublicationLease = { publicationId: string; ownerId: string; classroomId: string; leaseNonce: string };
export function createFoxyPublicationQueue(options: { database: SqlDatabase }) {
  return { claim: () => options.database.$transaction(async raw => {
    const tx: SqlTransaction = { query: (sql, ...args) => raw.$queryRawUnsafe(sql, ...args) };
    const query = tx.query;
    await query('SELECT 1 FROM pg_advisory_xact_lock(78123003)');
    const [capacity] = await query<{ n: number }>('SELECT count(*)::int AS n FROM foxy_publications WHERE lease_until>clock_timestamp()');
    if (!capacity || Number(capacity.n) >= 2) return null;
    const [row] = await query<{ id: string; owner_id: string; classroom_id: string }>(`SELECT p.id,p.owner_id,p.classroom_id FROM foxy_publications p
      JOIN users u ON u.id=p.owner_id JOIN classrooms c ON c.id=p.classroom_id AND c.teacher_id=p.owner_id
      JOIN foxy_resources r ON r.id=p.resource_id AND r.owner_id=p.owner_id AND r.revision=p.resource_revision
      JOIN foxy_conversations origin ON origin.id=r.conversation_id AND origin.owner_id=r.owner_id AND origin.deleted_at IS NULL
      WHERE p.state='PREPARING' AND (p.lease_until IS NULL OR p.lease_until<=clock_timestamp())
      AND u.account_role='teacher' AND u.email_verified_at IS NOT NULL AND c.archived_at IS NULL
      AND (origin.context_kind='GENERAL' OR EXISTS (SELECT 1 FROM classrooms source WHERE source.id=origin.classroom_id AND source.teacher_id=p.owner_id))
      ORDER BY p.created_at,p.id LIMIT 1 FOR UPDATE OF p SKIP LOCKED`);
    if (!row) return null;
    const nonce = randomUUID();
    await query("UPDATE foxy_publications SET lease_nonce=$2::uuid,lease_until=clock_timestamp()+interval '90 seconds' WHERE id=$1::uuid", row.id, nonce);
    return { publicationId: String(row.id), ownerId: String(row.owner_id), classroomId: String(row.classroom_id), leaseNonce: nonce };
  }, { maxWait: 2000, timeout: 6000 }) };
}
