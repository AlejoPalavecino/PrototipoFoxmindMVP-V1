import type { SqlDatabase, SqlTransaction, FoxyTextInput, FoxyTextResponse } from '../../../../src/core/domain/index.ts';
import type { FoxyTurnLease } from './turn-queue.ts';
import type { FoxyClaimScope } from './claim-authority.ts';
import type { FoxyGrounding } from '../../../../src/core/domain/foxy-ai-grounding.ts';
import { createFoxyTurnPreparation } from './turn-preparation.ts';
import { workerAnswer } from './worker-output.ts';

type Prepared = { scope: FoxyClaimScope; grounding: FoxyGrounding; input: FoxyTextInput; count: number };
type Usage = { inputTokens: number | null; outputTokens: number | null };
type Options = { database: SqlDatabase; queue: { claim(): Promise<FoxyTurnLease | null> };
  turns: Parameters<typeof createFoxyTurnPreparation>[0]['turns'];
  authority: Parameters<typeof createFoxyTurnPreparation>[0]['authority'] & {
    revalidateGrounding(cap: object, signal: AbortSignal, tx?: SqlTransaction): Promise<boolean> };
  loader: Parameters<typeof createFoxyTurnPreparation>[0]['loader'];
  provider: { countTokens(input: FoxyTextInput): Promise<number>; generate(input: FoxyTextInput): Promise<{ json: FoxyTextResponse } & Usage> };
  budget: { reserve(tx: SqlTransaction, lease: FoxyTurnLease, count: number): Promise<'RESERVED' | 'ALREADY_DISPATCHED' | 'NO_BUDGET' | 'NOT_CURRENT'> };
  completion: { finish(lease: FoxyTurnLease, result: any): Promise<boolean> };
  configuration: { model: string; maxInputTokens: number; deadlineMs: number; maxJobAgeMs: number } };
async function withAbort<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  let onAbort: (() => void) | undefined;
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(Object.assign(new Error('AI_TIMEOUT'), { code: 'AI_TIMEOUT' }));
    signal.addEventListener('abort', onAbort, { once: true });
  });
  try { return await Promise.race([work, aborted]); }
  finally { if (onAbort) signal.removeEventListener('abort', onAbort); }
}
function code(error: unknown, reserved: boolean): string {
  const actual = String((error as { code?: unknown })?.code ?? '');
  if (actual === 'INVALID_AI_OUTPUT') return actual;
  if (reserved) return 'PROVIDER_OUTCOME_UNKNOWN';
  if (['AI_TIMEOUT', 'AI_INPUT_LIMIT', 'AI_RATE_LIMITED', 'AI_UNAVAILABLE'].includes(actual)) return actual;
  return 'AI_UNAVAILABLE';
}
async function reserve(options: Options, lease: FoxyTurnLease, prepared: Prepared, signal: AbortSignal) {
  return options.database.$transaction(async raw => {
    const tx: SqlTransaction = { query: (sql, ...args) => raw.$queryRawUnsafe(sql, ...args) };
    await tx.query('SELECT id FROM users WHERE id=$1::uuid FOR SHARE', lease.ownerId);
    if (prepared.scope.snapshot.context.kind === 'CLASSROOM') await tx.query('SELECT id FROM classrooms WHERE id=$1::uuid FOR SHARE', prepared.scope.snapshot.context.classroomId);
    await tx.query('SELECT id FROM foxy_conversations WHERE id=$1::uuid AND owner_id=$2::uuid FOR SHARE', lease.conversationId, lease.ownerId);
    signal.throwIfAborted();
    if (!await options.authority.revalidateGrounding(prepared.scope.capability, signal, tx)) throw Object.assign(new Error('CONFLICT'), { code: 'CONFLICT' });
    signal.throwIfAborted();
    return options.budget.reserve(tx, lease, prepared.count);
  }, { maxWait: 2000, timeout: 6000 });
}
export function createFoxyTextWorker(options: Options) {
  const preparation = createFoxyTurnPreparation(options);
  let stopped = false, initialized = false, shutdownComplete = false;
  let active: Promise<boolean> | undefined, controller: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined, stopping: Promise<void> | undefined;
  async function run(): Promise<boolean> {
      const lease = await options.queue.claim(); if (!lease || stopped) return false;
      controller = new AbortController();
      const deadline = setTimeout(() => controller?.abort(), options.configuration.deadlineMs);
      let prepared: Prepared | undefined, reserved = false, outcome: any, shouldFinish = true;
      try {
        prepared = await withAbort(preparation.prepare(lease, controller.signal), controller.signal);
        const reservation = await reserve(options, lease, prepared, controller.signal);
        if (reservation === 'NOT_CURRENT') shouldFinish = false;
        else if (reservation !== 'RESERVED') outcome = { state: 'FAILED', errorCode: reservation === 'NO_BUDGET' ? 'AI_BUDGET_EXCEEDED' : 'PROVIDER_OUTCOME_UNKNOWN' };
        else {
          reserved = true; controller.signal.throwIfAborted();
          const generated = await withAbort(options.provider.generate(prepared.input), controller.signal);
          const usage = { inputTokens: generated.inputTokens, outputTokens: generated.outputTokens };
          try {
            const resolved = workerAnswer(generated.json, prepared.grounding);
            outcome = { state: 'READY', answer: resolved.answer,
              referenceMap: prepared.grounding.referenceMap, sourceReport: prepared.grounding.sources.map(source => ({
                sourceKey: source.sourceKey, title: source.title, kind: source.kind, documentKeys: source.documentKeys,
                citations: resolved.citations.filter(citation => prepared!.grounding.referenceMap.some(mapping =>
                  mapping.sourceKey === source.sourceKey && mapping.sourceId === citation.sourceId)),
              })), usage };
          }
          catch { outcome = { state: 'FAILED', errorCode: 'INVALID_AI_OUTPUT', usage }; }
        }
      } catch (error) { outcome = { state: 'FAILED', errorCode: code(error, reserved) }; }
      try { if (!shutdownComplete && shouldFinish && outcome) await options.completion.finish(lease, outcome); }
      finally { clearTimeout(deadline); controller = undefined; if (prepared) options.authority.close(prepared.scope); }
      return true;
  }
  function runOnce(): Promise<boolean> {
    if (stopped) return Promise.resolve(false);
    if (active) return active;
    active = run().finally(() => { active = undefined; });
    return active;
  }
  function poll(): void {
    if (stopped) return;
    timer = setTimeout(() => { timer = undefined; void runOnce().catch(() => false).finally(poll); }, 30000);
    timer.unref?.();
  }
  function onModuleInit(): void {
    if (initialized || stopped) return;
    initialized = true; poll();
  }
  function onModuleDestroy(): Promise<void> {
    if (stopping) return stopping;
    stopped = true; if (timer) clearTimeout(timer); controller?.abort();
    stopping = (async () => {
      if (active) {
        let timeout: ReturnType<typeof setTimeout> | undefined;
        try { await Promise.race([active.catch(() => false), new Promise<void>(resolve => {
          timeout = setTimeout(resolve, options.configuration.deadlineMs + 7000); timeout.unref?.();
        })]); } finally { if (timeout) clearTimeout(timeout); }
      }
      shutdownComplete = true;
    })();
    return stopping;
  }
  return { runOnce, onModuleInit, onModuleDestroy };
}
