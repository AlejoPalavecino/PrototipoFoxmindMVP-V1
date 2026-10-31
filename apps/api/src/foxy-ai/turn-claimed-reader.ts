import type { SqlDatabase, FoxyPurpose } from '../../../../src/core/domain/index.ts';
import type { FoxyTurnLease } from './turn-queue.ts';
import { checkClaim } from './claim-authority-check.ts';

type Payload = { purpose: FoxyPurpose; message_text: string; metadata: { model: string; promptVersion: string; schemaVersion: string } };
function forbidden(): never { throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' }); }
export function createFoxyClaimedTurnReader(options: { database: SqlDatabase; maxJobAgeMs: number }) {
  return {
    async loadClaimed(lease: FoxyTurnLease) {
      return options.database.$transaction(async raw => {
        const tx = { query: <T>(sql: string, ...args: unknown[]) => raw.$queryRawUnsafe<T[]>(sql, ...args) };
        await checkClaim(tx, lease, options.maxJobAgeMs);
        const [row] = await tx.query<Payload>(`SELECT t.purpose,t.message_text,t.metadata FROM foxy_turns t
          JOIN foxy_conversations c ON c.id=t.conversation_id AND c.owner_id=t.owner_id JOIN users u ON u.id=t.owner_id
          WHERE t.id=$1::uuid AND t.owner_id=$2::uuid AND t.conversation_id=$3::uuid AND t.lease_nonce=$4::uuid
          AND t.state='RUNNING' AND t.lease_until>clock_timestamp() AND c.deleted_at IS NULL
          AND u.account_role='teacher' AND u.email_verified_at IS NOT NULL
          AND (c.context_kind='GENERAL' OR EXISTS (SELECT 1 FROM classrooms r
            WHERE r.id=c.classroom_id AND r.teacher_id=c.owner_id AND r.archived_at IS NULL))`,
        lease.turnId, lease.ownerId, lease.conversationId, lease.leaseNonce);
        if (!row) return forbidden();
        return { purpose: row.purpose, message: row.message_text, metadata: row.metadata };
      }, { maxWait: 2000, timeout: 6000 });
    },
  };
}
