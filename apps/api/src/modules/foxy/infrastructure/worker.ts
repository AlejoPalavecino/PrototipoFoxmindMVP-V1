import type { FoxyTextInput, FoxyTextResponse } from '../../../../../../src/core/domain/index.ts';
import type { SqlDatabase, SqlTransaction } from '../../../../../../src/core/contracts/sql.ts';
import type { FoxyTurnLease } from './turn-queue.ts';
import type { FoxyClaimScope } from './claim-authority.ts';
import type { FoxyGrounding } from '../../../../../../src/core/domain/foxy/grounding.ts';
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
  configuration: { model: string; maxInputTokens: number; deadlineMs: number; maxJobAgeMs: number; maxConcurrency: number } };
const RETRY_INTERVAL_MS = 1000;
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
  const active = new Set<Promise<boolean>>();
  const controllers = new Set<AbortController>();
  let stopped = false, initialized = false, shutdownComplete = false;
  let filling = false, wakeRequested = false;
  let timer: ReturnType<typeof setTimeout> | undefined, stopping: Promise<void> | undefined;
  async function run(lease: FoxyTurnLease): Promise<boolean> {
      const controller = new AbortController();
      controllers.add(controller);
      const deadline = setTimeout(() => controller.abort(), options.configuration.deadlineMs);
      let prepared: Prepared | undefined, reserved = false, dispatched = false, outcome: any, shouldFinish = true;
      try {
        prepared = await withAbort(preparation.prepare(lease, controller.signal), controller.signal);
        const reservation = await reserve(options, lease, prepared, controller.signal);
        if (reservation === 'NOT_CURRENT') shouldFinish = false;
        else if (reservation !== 'RESERVED') outcome = { state: 'FAILED', errorCode: reservation === 'NO_BUDGET' ? 'AI_BUDGET_EXCEEDED' : 'PROVIDER_OUTCOME_UNKNOWN' };
        else {
          reserved = true; controller.signal.throwIfAborted();
          if (prepared.scope.snapshot.attachments?.length &&
            !await options.authority.revalidateGrounding(prepared.scope.capability, controller.signal))
            throw Object.assign(new Error('CONFLICT'), { code: 'CONFLICT' });
          controller.signal.throwIfAborted();
          dispatched = true;
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
      } catch (error) {
        outcome = { state: 'FAILED', errorCode: code(error, dispatched),
          ...(reserved && !dispatched ? { usage: { inputTokens: 0, outputTokens: 0 } } : {}) };
      }
      try { if (!shutdownComplete && shouldFinish && outcome) await options.completion.finish(lease, outcome); }
      finally { clearTimeout(deadline); controllers.delete(controller); if (prepared) options.authority.close(prepared.scope); }
      return true;
  }
  function launch() {
    const claimed = options.queue.claim();
    const done = claimed.then(lease => lease && !stopped ? run(lease) : false)
      .finally(() => active.delete(done));
    active.add(done);
    void done.then(processed => { if (processed) wake(); }, () => schedule(RETRY_INTERVAL_MS));
    return { claimed, done };
  }
  function runOnce(): Promise<boolean> {
    if (stopped) return Promise.resolve(false);
    return active.values().next().value ?? launch().done;
  }
  function schedule(delay: number): void {
    if (!initialized || stopped || filling || timer || active.size >= options.configuration.maxConcurrency) return;
    timer = setTimeout(() => { timer = undefined; wake(); }, delay);
    timer.unref?.();
  }
  async function fill(): Promise<void> {
    // Claim serially and process each lease independently up to the configured limit.
    while (!stopped && active.size < options.configuration.maxConcurrency) {
      if (!await launch().claimed) break;
    }
  }
  function wake(): void {
    if (!initialized || stopped) return;
    wakeRequested = true;
    if (filling || active.size >= options.configuration.maxConcurrency) return;
    clearTimeout(timer);
    timer = undefined;
    wakeRequested = false;
    filling = true;
    void fill().catch(() => {}).finally(() => {
      filling = false;
      // An enqueue can commit while an empty claim is in flight.
      if (wakeRequested && active.size < options.configuration.maxConcurrency) wake();
      else schedule(RETRY_INTERVAL_MS);
    });
  }
  function onModuleInit(): void {
    if (initialized || stopped) return;
    initialized = true;
    schedule(0);
  }
  function onModuleDestroy(): Promise<void> {
    if (stopping) return stopping;
    stopped = true;
    clearTimeout(timer);
    for (const controller of controllers) controller.abort();
    stopping = (async () => {
      if (active.size) {
        let timeout: ReturnType<typeof setTimeout> | undefined;
        try { await Promise.race([Promise.allSettled(active), new Promise<void>(resolve => {
          timeout = setTimeout(resolve, options.configuration.deadlineMs + 7000); timeout.unref?.();
        })]); } finally { if (timeout) clearTimeout(timeout); }
      }
      shutdownComplete = true;
    })();
    return stopping;
  }
  return { runOnce, wake, onModuleInit, onModuleDestroy };
}
