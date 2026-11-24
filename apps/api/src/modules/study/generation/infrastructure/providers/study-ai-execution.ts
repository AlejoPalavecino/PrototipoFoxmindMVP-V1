import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import type { AiConfiguration } from '../../../../../platform/ai/configuration.ts';
import type { AiTextPreview, AiTextRequest, AiTextTransport, AiTextUsage } from '../../../../../platform/ai/text-contract.ts';
import { executeAiText, type AiTextMetric } from '../../../../../platform/ai/text-execution.ts';
import { bounded } from '../../../../../platform/ai/execution.ts';
import { createDefaultTextProfile, textProfileForSnapshot } from '../../../../../platform/ai/text-profiles.ts';
import { configurationForJob, studyPromptVersion } from '../../../../../platform/ai/execution-snapshot.ts';
import { reserveAiTextBudget, settleAiTextBudget } from '../../../../../platform/ai/text-budget.ts';
import { lockAiAdmission, activeAiOwnersSql } from '../../../../../platform/ai/admission.ts';
import { createAiChatTimings, type AiChatTimings } from '../../../../../platform/ai/text-metrics.ts';

export interface StudyFileDatabase {
  $transaction<T>(operation: (tx: { $queryRawUnsafe<T = unknown>(sql: string, ...values: unknown[]): Promise<T> }) => Promise<T>,
    options?: { maxWait: number; timeout: number }): Promise<T>;
}
export type StudyTextCapability = `study_${'chat' | 'tool' | 'feedback' | 'note' | 'outline' | 'plan' | 'quiz' | 'exercise' | 'mock_exam' | 'review_plan'}`;
function fail(code: string): never { throw Object.assign(new Error(code), { code }); }

/** Domain-owned coordination: shared admission and existing SQL budget semantics. */
export async function executeStudyAiText(input: {
  configuration: AiConfiguration; database: StudyFileDatabase; ownerId: string; requestId: string;
  authorize?: () => Promise<void>; transport?: AiTextTransport; request: AiTextRequest; record?: (event: AiTextMetric) => void;
  transportForExecution?: (configuration: AiConfiguration) => AiTextTransport;
  waitForAdmission?: boolean;
  capability?: StudyTextCapability;
  timing?: AiChatTimings;
  /** Private partial text for the caller; only chat requests publish one. */
  preview?: AiTextPreview;
}) {
  const { configuration, database, ownerId, requestId, authorize, transport, request } = input;
  const timing = input.timing ?? createAiChatTimings('study', input.waitForAdmission ? 'feedback' : 'chat');
  const id = randomUUID(), started = performance.now();
  const admit = (remaining = 8000) => database.$transaction(async raw => {
    const tx = { query: <T>(sql: string, ...values: unknown[]) => raw.$queryRawUnsafe<T[]>(sql, ...values) };
    await lockAiAdmission(tx);
    const [{ running }] = await tx.query<{ running: bigint }>(`SELECT count(*)::bigint AS running FROM (${activeAiOwnersSql}) q`);
    const [{ owned }] = await tx.query<{ owned: boolean }>(`SELECT EXISTS(SELECT 1 FROM (${activeAiOwnersSql}) q WHERE owner_id=$1::uuid) AS owned`, ownerId);
    if (Number(running) >= configuration.maxConcurrency || owned) return null;
    const rows = await tx.query<{ execution_profile?: unknown }>(`INSERT INTO study_ai_dispatches(id,owner_id,request_id,lease_until,execution_profile)
      VALUES($1::uuid,$2::uuid,$3::uuid,clock_timestamp()+((COALESCE((SELECT (active_profiles->'study'->>'deadlineMs')::int FROM ai_execution_policy WHERE singleton),$4::int)+30000) * interval '1 millisecond'),
        (SELECT active_profiles->'study' FROM ai_execution_policy WHERE singleton))
      ON CONFLICT(owner_id,request_id) DO NOTHING RETURNING id,execution_profile`, id, ownerId, requestId, configuration.deadlineMs);
    if (!rows.length) fail('CONFLICT');
    return rows[0];
  }, {
    maxWait: Math.max(1, Math.min(2000, Math.floor(remaining / 4))),
    timeout: Math.max(1, Math.min(6000, Math.floor(remaining * 3 / 4))),
  });
  const admissionDeadline = started + (configuration.executionProfiles?.study?.deadlineMs ?? configuration.deadlineMs);
  const timeLeft = () => Math.floor(admissionDeadline - performance.now());
  const admitted = await timing.measure('admission', async () => {
    let row = await admit(input.waitForAdmission ? timeLeft() : undefined);
    while (row === null) {
      const beforeWait = timeLeft();
      if (!input.waitForAdmission || beforeWait <= 0) fail('AI_BUSY');
      await delay(Math.min(1000, beforeWait));
      const beforeAuthorization = timeLeft();
      if (beforeAuthorization <= 0) fail('AI_BUSY');
      // The preceding transaction has ended. Recheck before claiming a slot.
      if (authorize) await bounded(authorize, AbortSignal.timeout(beforeAuthorization));
      const remaining = timeLeft();
      if (remaining <= 0) fail('AI_BUSY');
      row = await admit(remaining);
    }
    return row;
  });
  const snapshot = admitted.execution_profile;
  let dispatched = false, completed = false, usage: AiTextUsage | undefined;
  let effective = configuration;
  try {
    // Keep classical injected fixtures working; all real SQL rows expose this column.
    if (snapshot !== undefined || input.transportForExecution || configuration.executionProfiles || configuration.legacyExecutionProfiles)
      effective = configurationForJob(configuration, snapshot, 'study');
    // A study request is prepared in this process and cannot execute a different stored prompt.
    if (effective.executionProfile && effective.executionProfile.promptVersion !== studyPromptVersion) fail('AI_UNAVAILABLE');
    const profile = effective.executionProfile ? textProfileForSnapshot(effective.executionProfile) : createDefaultTextProfile(effective, 'study');
    const remaining = Math.floor(effective.deadlineMs - (performance.now() - started));
    if (remaining <= 0) fail('AI_TIMEOUT');
    const signal = AbortSignal.timeout(remaining);
    const selected = input.transportForExecution?.(effective) ?? transport;
    if (!selected) fail('AI_UNAVAILABLE');
    const result = await executeAiText({ profile: { ...profile, deadlineMs: remaining }, request, authorize, signal, record(event) {
      timing.stage(event.stage, event.durationMs, event.outcome === 'failure' ? { code: event.code } : undefined, event.provider);
      input.record?.(event);
    },
      transport: { provider: selected.provider, count: value => selected.count(value), async generate(value) {
        const result = await selected.generate(value);
        usage = result.usage;
        return result;
      }, ...(selected.stream ? { async stream(value, preview) {
        const result = await selected.stream!(value, preview);
        usage = result.usage;
        return result;
      } } : {}) },
      ...(input.preview ? { preview: () => input.preview } : {}),
      async reserve(tokens) {
        await database.$transaction(async raw => {
          const tx = { query: <T>(sql: string, ...values: unknown[]) => raw.$queryRawUnsafe<T[]>(sql, ...values) };
          if (!await reserveAiTextBudget(tx, { id, owner_id: ownerId }, tokens, effective, 'study_ai_dispatches', {
            capability: input.capability ?? (input.waitForAdmission ? 'study_feedback' : 'study_chat'),
          })) fail('CONFLICT');
        }, { maxWait: 2000, timeout: 6000 });
      },
      onDispatch() { dispatched = true; },
    });
    if (Buffer.byteLength(result.text, 'utf8') > 1_000_000) fail('INVALID_AI_OUTPUT');
    completed = true;
    return result;
  } catch (error) {
    if (!usage && error && typeof error === 'object' && 'usage' in error) usage = error.usage as AiTextUsage;
    throw error;
  } finally {
    // No dispatch means known zero generation cost. After dispatch, unknown usage
    // retains the conservative reservation and is never silently retried.
    await database.$transaction(async raw => {
      const tx = { query: <T>(sql: string, ...values: unknown[]) => raw.$queryRawUnsafe<T[]>(sql, ...values) };
      await settleAiTextBudget(tx, { id, owner_id: ownerId }, effective,
        dispatched ? usage : { inputTokens: 0, outputTokens: 0 }, 'study_ai_dispatches');
      await tx.query('UPDATE study_ai_dispatches SET state=$2,lease_until=clock_timestamp() WHERE id=$1::uuid RETURNING id', id, completed ? 'DONE' : 'FAILED');
    }, { maxWait: 2000, timeout: 6000 });
  }
}
