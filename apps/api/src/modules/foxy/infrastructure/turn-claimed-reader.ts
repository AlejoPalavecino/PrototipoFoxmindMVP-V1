import { isDeepStrictEqual } from 'node:util';
import type { FoxyPurpose } from '../../../../../../src/core/domain/index.ts';
import type { SqlDatabase } from '../../../../../../src/core/contracts/sql.ts';
import type { FoxyTurnLease } from './turn-queue.ts';
import { checkClaim } from './claim-authority-check.ts';
import { claimedHistory } from './turn-history.ts';

type Payload = { sequence: number; purpose: FoxyPurpose; message_text: string; execution_profile?: unknown; metadata: { model: string; promptVersion: string; schemaVersion: string } };
function forbidden(): never { throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' }); }
export function createFoxyClaimedTurnReader(options: { database: SqlDatabase; maxJobAgeMs: number }) {
  return {
    async loadClaimed(lease: FoxyTurnLease, signal?: AbortSignal) {
      signal?.throwIfAborted();
      const claim = { turnId: lease.turnId, ownerId: lease.ownerId, conversationId: lease.conversationId, leaseNonce: lease.leaseNonce };
      return options.database.$transaction(async raw => {
        const tx = { query: <T>(sql: string, ...args: unknown[]) => raw.$queryRawUnsafe<T[]>(sql, ...args) };
        const snapshot = await checkClaim(tx, claim, options.maxJobAgeMs);
        signal?.throwIfAborted();
        const [row] = await tx.query<Payload>(`SELECT t.sequence,t.purpose,t.message_text,t.metadata,t.execution_profile FROM foxy_turns t
          JOIN foxy_conversations c ON c.id=t.conversation_id AND c.owner_id=t.owner_id JOIN users u ON u.id=t.owner_id
          WHERE t.id=$1::uuid AND t.owner_id=$2::uuid AND t.conversation_id=$3::uuid AND t.lease_nonce=$4::uuid
          AND t.state='RUNNING' AND t.lease_until>clock_timestamp() AND c.deleted_at IS NULL
          AND u.account_role='teacher' AND u.email_verified_at IS NOT NULL
          AND (c.context_kind='GENERAL' OR EXISTS (SELECT 1 FROM classrooms r
            WHERE r.id=c.classroom_id AND r.teacher_id=c.owner_id AND r.archived_at IS NULL))`,
        claim.turnId, claim.ownerId, claim.conversationId, claim.leaseNonce);
        if (!row) return forbidden();
        const history = await claimedHistory(tx, claim, row.sequence, snapshot, signal);
        signal?.throwIfAborted();
        const current = await checkClaim(tx, claim, options.maxJobAgeMs);
        if (!isDeepStrictEqual(snapshot, current)) return forbidden();
        signal?.throwIfAborted();
        return { purpose: row.purpose, message: row.message_text, metadata: row.metadata, executionProfile: row.execution_profile, history };
      }, { maxWait: 2000, timeout: 6000 });
    },
  };
}
