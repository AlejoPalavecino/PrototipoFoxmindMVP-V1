import { reserveAiTextBudget, settleAiTextBudget } from '../../../../platform/ai/text-budget.ts';
import { lockAiBudget } from '../../../../platform/ai/admission.ts';
import type { SqlTransaction } from '../../../../../../../src/core/contracts/sql.ts';
import type { FoxyPurpose } from '../../../../../../../src/core/domain/foxy/foxy-ai.ts';
import type { FoxyTurnLease } from '../application/queue-contracts.ts';
import { configurationForJob } from '../../../../platform/ai/execution-snapshot.ts';

export type { FoxyTextBudgetConfiguration } from '../application/queue-contracts.ts';
import type { FoxyTextBudgetConfiguration } from '../application/queue-contracts.ts';
type Usage = { inputTokens: number | null; outputTokens: number | null };
type Reservation = { id: string; owner_id: string; purpose: FoxyPurpose; dispatch_count: number; reserved_microusd: bigint; execution_profile?: unknown;
  input_usd_per_million: number | null; output_usd_per_million: number | null };
const foxyCapabilities = {
  CHAT: 'foxy_chat', STUDY_MATERIAL: 'foxy_study_material', REVIEW: 'foxy_review', SUMMARY: 'foxy_summary',
  ACTIVITY_IDEAS: 'foxy_activity_ideas', LESSON_PLAN: 'foxy_lesson_plan', RUBRIC: 'foxy_rubric',
} satisfies Record<FoxyPurpose, string>;
const permissionSql = `c.owner_id=t.owner_id AND c.deleted_at IS NULL AND u.account_role='teacher' AND u.email_verified_at IS NOT NULL
  AND (c.context_kind='GENERAL' OR EXISTS (SELECT 1 FROM classrooms r WHERE r.id=c.classroom_id AND r.teacher_id=c.owner_id AND r.archived_at IS NULL))`;
async function current(tx: SqlTransaction, lease: FoxyTurnLease, requireAccess: boolean): Promise<Reservation | null> {
  const [row] = await tx.query<Reservation>(`SELECT t.* FROM foxy_turns t JOIN foxy_conversations c ON c.id=t.conversation_id
    JOIN users u ON u.id=t.owner_id WHERE t.id=$1::uuid AND t.owner_id=$2::uuid AND t.conversation_id=$3::uuid
    AND t.lease_nonce=$4::uuid AND t.state='RUNNING' AND t.lease_until>clock_timestamp() ${requireAccess ? 'AND ' + permissionSql : ''} FOR UPDATE OF t`,
  lease.turnId, lease.ownerId, lease.conversationId, lease.leaseNonce);
  return row ?? null;
}
function prices(row: Reservation, fallback: FoxyTextBudgetConfiguration): FoxyTextBudgetConfiguration {
  if (row.input_usd_per_million === null || row.output_usd_per_million === null) throw new Error('INVALID_BUDGET_SNAPSHOT');
  return { ...fallback, inputUsdPerMillion: row.input_usd_per_million, outputUsdPerMillion: row.output_usd_per_million };
}
export function createFoxyTextBudget(options: { configuration: FoxyTextBudgetConfiguration }) {
  async function reserve(tx: SqlTransaction, lease: FoxyTurnLease, tokens: number): Promise<'RESERVED' | 'ALREADY_DISPATCHED' | 'NO_BUDGET' | 'NOT_CURRENT'> {
    if (!Number.isSafeInteger(tokens) || tokens < 1) throw new Error('INVALID_INPUT');
    await lockAiBudget(tx, lease.ownerId);
    const row = await current(tx, lease, true);
    if (!row) return 'NOT_CURRENT';
    if (row.dispatch_count > 0) return 'ALREADY_DISPATCHED';
    const config = row.execution_profile != null || options.configuration.legacyExecutionProfiles
      ? configurationForJob(options.configuration, row.execution_profile, 'foxy') : { ...options.configuration };
    const capability = Object.hasOwn(foxyCapabilities, row.purpose) ? foxyCapabilities[row.purpose] : 'foxy';
    const ok = await reserveAiTextBudget(tx, row, tokens, config, 'foxy_turns', { capability });
    if (!ok) return 'NO_BUDGET';
    await tx.query(`UPDATE foxy_turns SET input_usd_per_million=$2,output_usd_per_million=$3 WHERE id=$1::uuid`,
      row.id, config.inputUsdPerMillion, config.outputUsdPerMillion);
    return 'RESERVED';
  }
  async function settle(tx: SqlTransaction, lease: FoxyTurnLease, usage?: Usage): Promise<boolean> {
    await lockAiBudget(tx, lease.ownerId);
    const row = await current(tx, lease, false);
    if (!row || BigInt(row.reserved_microusd) === 0n) return false;
    await settleAiTextBudget(tx, row, prices(row, options.configuration), usage, 'foxy_turns');
    return true;
  }
  async function settleExpired(tx: SqlTransaction, turnId: string): Promise<boolean> {
    const [owner] = await tx.query<{ owner_id: string }>('SELECT owner_id FROM foxy_turns WHERE id=$1::uuid', turnId);
    if (!owner) return false;
    await lockAiBudget(tx, owner.owner_id);
    const [row] = await tx.query<Reservation>(`SELECT * FROM foxy_turns WHERE id=$1::uuid AND state='RUNNING'
      AND lease_until<=clock_timestamp() FOR UPDATE`, turnId);
    if (!row || BigInt(row.reserved_microusd) === 0n) return false;
    await settleAiTextBudget(tx, row, prices(row, options.configuration), undefined, 'foxy_turns');
    return true;
  }
  return { reserve, settle, settleExpired };
}
