import type { VisualGroundingPort } from '../application/grounding-port.ts';
import { isDeepStrictEqual } from 'node:util';
import { parseSendFoxyMessage } from '../../../../../../../src/core/domain/foxy/validation.ts';
import type { SqlTransaction } from '../../../../../../../src/core/contracts/sql.ts';
import type { FoxyGroundingSnapshot } from '../../../../../../../src/core/domain/foxy/grounding.ts';
import type { FoxyVisualLease } from './visual-worker-types.ts';
type Row = { snapshot: FoxyGroundingSnapshot; context_kind: string; classroom_id: string | null };
const forbidden = (): never => { throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' }); };
export async function checkVisualClaim(tx: SqlTransaction, lease: FoxyVisualLease, maxJobAgeMs: number, grounding: VisualGroundingPort): Promise<{ snapshot: FoxyGroundingSnapshot; fresh: boolean }> {
  const [row] = await tx.query<Row>(`SELECT j.snapshot,c.context_kind,c.classroom_id FROM foxy_visual_jobs j
    JOIN foxy_conversations c ON c.id=j.conversation_id AND c.owner_id=j.owner_id JOIN users u ON u.id=j.owner_id
    JOIN foxy_visual_assets a ON a.id=j.asset_id AND a.owner_id=j.owner_id AND a.conversation_id=j.conversation_id
    WHERE j.id=$1::uuid AND j.asset_id=$2::uuid AND j.owner_id=$3::uuid AND j.conversation_id=$4::uuid AND j.lease_nonce=$5::uuid
    AND j.state='RUNNING' AND j.lease_until>clock_timestamp() AND j.created_at+$6::bigint*interval '1 millisecond'>clock_timestamp()
    AND c.deleted_at IS NULL AND u.account_role='teacher' AND u.email_verified_at IS NOT NULL AND a.discarded_at IS NULL
    AND ((a.state='PROCESSING' AND a.lease_nonce=j.lease_nonce AND a.lease_until>clock_timestamp()) OR (a.state='READY' AND j.dispatch_count=1))`,lease.jobId,lease.assetId,lease.ownerId,lease.conversationId,lease.leaseNonce,maxJobAgeMs);
  if (!row || !row.snapshot || !Array.isArray(row.snapshot.sources)) return forbidden();
  const context = row.context_kind === 'GENERAL' && row.classroom_id === null ? { kind: 'GENERAL' as const }
    : row.context_kind === 'CLASSROOM' && row.classroom_id ? { kind: 'CLASSROOM' as const, classroomId: row.classroom_id } : forbidden();
  if (!isDeepStrictEqual(row.snapshot.context,context)) return forbidden();
  if (context.kind === 'CLASSROOM' && !(await tx.query('SELECT id FROM classrooms WHERE id=$1::uuid AND teacher_id=$2::uuid AND archived_at IS NULL',context.classroomId,lease.ownerId)).length) return forbidden();
  try {
    const selection = parseSendFoxyMessage({ requestId: '00000000-0000-0000-0000-000000000000', revision: '0', purpose: 'CHAT', text: 'context', selection: grounding.snapshotSelection(row.snapshot) },context).selection;
    const current = await grounding.rebuildGrounding(tx,context,selection);
    await grounding.refreshFoxyAttachmentSnapshot(tx,lease.ownerId,lease.conversationId,row.snapshot,current);
    return { snapshot: row.snapshot, fresh: isDeepStrictEqual(row.snapshot,current) };
  } catch (error) {
    if (['INVALID_INPUT','FORBIDDEN','FILE_NOT_READY','AI_INPUT_LIMIT','CONFLICT','EMPTY_CONTENT'].includes(String((error as {code?: unknown})?.code))) return { snapshot: row.snapshot, fresh: false };
    throw error;
  }
}
