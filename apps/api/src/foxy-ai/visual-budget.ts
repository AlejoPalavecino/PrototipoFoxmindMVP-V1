import { quoteFoxyImageBudget, reserveAiTextBudget, settleAiTextBudget, tokenCost } from '../ai/index.ts';
import type { SqlTransaction } from '../../../../src/core/domain/index.ts';
import type { FoxyVisualLease } from './visual-worker-types.ts';
type Usage = { inputTokens: number | null; outputTokens: number | null };
type Limits = { dailyBudgetUsd: number; dailyActorRequests: number; dailyGlobalRequests: number };
type Profile = { kind: 'IMAGE' | 'DIAGRAM'; maxInputTokens: number; maxOutputTokens: number; inputUsdPerMillion: string; outputUsdPerMillion: string; textOutputUsdPerMillion?: string; imageOutputUsdPerMillion?: string };
type Row = { id: string; owner_id: string; dispatch_count: number; reserved_microusd: bigint; profile: Profile };
const invalid = (): never => { throw Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' }); };
function configuration(profile: Profile, limits: Limits) {
  const validRate = (v: unknown): v is string => typeof v === 'string' && /^(?:0|[1-9][0-9]{0,5})(?:\.[0-9]{1,6})?$/u.test(v) && Number(v) > 0;
  if (!limits || !Number.isFinite(limits.dailyBudgetUsd) || limits.dailyBudgetUsd <= 0 || !Number.isSafeInteger(limits.dailyActorRequests)
    || limits.dailyActorRequests < 1 || !Number.isSafeInteger(limits.dailyGlobalRequests) || limits.dailyGlobalRequests < 1
    || !profile || !Number.isSafeInteger(profile.maxInputTokens) || profile.maxInputTokens < 1 || profile.maxInputTokens > 65536
    || !Number.isSafeInteger(profile.maxOutputTokens) || profile.maxOutputTokens < 1 || profile.maxOutputTokens > 4096
    || !validRate(profile.inputUsdPerMillion) || !validRate(profile.outputUsdPerMillion)) return invalid();
  const config = { ...limits, maxOutputTokens: profile.maxOutputTokens, inputUsdPerMillion: Number(profile.inputUsdPerMillion), outputUsdPerMillion: Number(profile.outputUsdPerMillion) };
  if (profile.kind === 'IMAGE') {
    const quote = quoteFoxyImageBudget({ inputTokenCap: profile.maxInputTokens, outputTokenCap: profile.maxOutputTokens, inputUsdPerMillion: profile.inputUsdPerMillion, textOutputUsdPerMillion: profile.textOutputUsdPerMillion!, imageOutputUsdPerMillion: profile.imageOutputUsdPerMillion! });
    if (config.outputUsdPerMillion !== Math.max(Number(profile.textOutputUsdPerMillion), Number(profile.imageOutputUsdPerMillion))
      || quote !== tokenCost(profile.maxInputTokens,config.inputUsdPerMillion) + tokenCost(profile.maxOutputTokens,config.outputUsdPerMillion)) return invalid();
  } else if (profile.kind !== 'DIAGRAM') return invalid();
  return config;
}
async function current(tx: SqlTransaction, lease: FoxyVisualLease, requireAccess: boolean): Promise<Row | null> {
  const [row] = await tx.query<Row>(`SELECT j.* FROM foxy_visual_jobs j JOIN foxy_conversations c ON c.id=j.conversation_id AND c.owner_id=j.owner_id
    JOIN users u ON u.id=j.owner_id WHERE j.id=$1::uuid AND j.asset_id=$2::uuid AND j.owner_id=$3::uuid AND j.conversation_id=$4::uuid
    AND j.lease_nonce=$5::uuid AND j.state='RUNNING' AND j.lease_until>clock_timestamp()
    ${requireAccess ? "AND c.deleted_at IS NULL AND u.account_role='teacher' AND u.email_verified_at IS NOT NULL AND (c.context_kind='GENERAL' OR EXISTS (SELECT 1 FROM classrooms r WHERE r.id=c.classroom_id AND r.teacher_id=c.owner_id AND r.archived_at IS NULL)) AND EXISTS (SELECT 1 FROM foxy_visual_assets a WHERE a.id=j.asset_id AND a.owner_id=j.owner_id AND a.conversation_id=j.conversation_id AND a.state='PROCESSING' AND a.lease_nonce=j.lease_nonce AND a.lease_until>clock_timestamp() AND a.discarded_at IS NULL)" : ''} FOR UPDATE OF j`, lease.jobId,lease.assetId,lease.ownerId,lease.conversationId,lease.leaseNonce);
  return row ?? null;
}
export function createFoxyVisualBudget(options: { limits: Limits }) {
  async function reserve(tx: SqlTransaction, lease: FoxyVisualLease, preflightTokens: number): Promise<'RESERVED'|'ALREADY_DISPATCHED'|'NO_BUDGET'|'NOT_CURRENT'> {
    if (!Number.isSafeInteger(preflightTokens) || preflightTokens < 1) return invalid();
    await tx.query('SELECT 1 FROM pg_advisory_xact_lock(78123001)'); const row = await current(tx,lease,true);
    if (!row) return 'NOT_CURRENT'; if (row.dispatch_count) return 'ALREADY_DISPATCHED';
    const config = configuration(row.profile,options.limits); if (preflightTokens > row.profile.maxInputTokens) return invalid();
    if (!await reserveAiTextBudget(tx,row,row.profile.maxInputTokens,config,'foxy_visual_jobs')) return 'NO_BUDGET';
    await tx.query('UPDATE foxy_visual_jobs SET preflight_tokens=$2,input_tokens=NULL WHERE id=$1::uuid',row.id,preflightTokens); return 'RESERVED';
  }
  async function settleRow(tx: SqlTransaction, row: Row, usage?: Usage | null): Promise<boolean> {
    if (BigInt(row.reserved_microusd) === 0n) return false; const config = configuration(row.profile,options.limits);
    const safe = usage && Number.isSafeInteger(usage.inputTokens) && usage.inputTokens! >= 0
      && Number.isSafeInteger(usage.outputTokens) && usage.outputTokens! >= 0 ? usage : undefined;
    await settleAiTextBudget(tx,row,config,safe,'foxy_visual_jobs');
    if (safe) await tx.query('UPDATE foxy_visual_jobs SET input_tokens=$2 WHERE id=$1::uuid',row.id,safe.inputTokens); return true;
  }
  async function settle(tx: SqlTransaction, lease: FoxyVisualLease, usage?: Usage | null): Promise<boolean> {
    await tx.query('SELECT 1 FROM pg_advisory_xact_lock(78123001)'); const row = await current(tx,lease,false); return row ? settleRow(tx,row,usage) : false;
  }
  async function settleExpired(tx: SqlTransaction, jobId: string): Promise<boolean> {
    await tx.query('SELECT 1 FROM pg_advisory_xact_lock(78123001)');
    const [row] = await tx.query<Row>("SELECT * FROM foxy_visual_jobs WHERE id=$1::uuid AND state='RUNNING' AND lease_until<=clock_timestamp() FOR UPDATE",jobId);
    if (!row) return false;
    return BigInt(row.reserved_microusd) === 0n ? true : settleRow(tx,row);
  }
  return { reserve, settle, settleExpired };
}
