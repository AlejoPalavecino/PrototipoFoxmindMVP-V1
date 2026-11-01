import { parseFoxyDiagram, type SqlTransaction } from '../../../../src/core/domain/index.ts';
import { isDeepStrictEqual } from 'node:util';
import { projectFoxyTextInput } from './provider-input.ts';
import { createVisualHeartbeat } from './visual-worker-heartbeat.ts';
import type { FoxyVisualLease, VisualOptions, VisualScope, VisualUsage } from './visual-worker-types.ts';
function errorCode(error: unknown, dispatched: boolean): string {
  const value = String((error as { code?: unknown })?.code ?? '');
  if (dispatched && value === 'PROVIDER_OUTCOME_UNKNOWN') return value;
  return ['INVALID_AI_OUTPUT','AI_INPUT_LIMIT','AI_TIMEOUT','AI_RATE_LIMITED','AI_BUDGET_EXCEEDED','CONFLICT','SERVICE_UNAVAILABLE','PROVIDER_OUTCOME_UNKNOWN'].includes(value) ? value : (dispatched ? 'PROVIDER_OUTCOME_UNKNOWN' : 'AI_UNAVAILABLE');
}
function fail(code: string): never { throw Object.assign(new Error(code), { code }); }
async function transact<T>(options: VisualOptions, fn: (tx: SqlTransaction) => Promise<T>): Promise<T> {
  return options.database.$transaction(raw => fn({ query: (sql,...args) => raw.$queryRawUnsafe(sql,...args) }), { maxWait: 2000, timeout: 6000 });
}
function checkUsage(usage: VisualUsage | null, profile: VisualScope['job']['profile']): void {
  if (usage && ((usage.inputTokens !== null && usage.inputTokens > profile.maxInputTokens)
    || (usage.outputTokens !== null && usage.outputTokens > profile.maxOutputTokens))) fail('INVALID_AI_OUTPUT');
}
export function createFoxyVisualWorker(options: VisualOptions) {
  if (!Number.isSafeInteger(options.configuration.deadlineMs) || options.configuration.deadlineMs < 1 || options.configuration.deadlineMs > 180000) return fail('INVALID_INPUT');
  let stopped = false, initialized = false, active: Promise<boolean> | undefined, controller: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined, stopping: Promise<void> | undefined;
  async function run(): Promise<boolean> {
    await options.queue.recoverExpired?.(); if (stopped) return false;
    const lease = await options.queue.claim(); if (!lease) return false;
    const aborter = new AbortController(); controller = aborter; const signal = aborter.signal;
    const deadline = setTimeout(() => aborter.abort(),options.configuration.deadlineMs);
    let scope: VisualScope | undefined, dispatched = false, recovering = false, settled = false, usage: VisualUsage | null = null;
    let outcome: { state: 'READY' } | { state: 'FAILED'; errorCode: string; usage?: VisualUsage|null } | undefined;
    const heartbeat = createVisualHeartbeat(options.queue,lease,() => aborter.abort());
    try {
      scope = await options.authority.open(lease,signal); signal.throwIfAborted();
      if (scope.job.id !== lease.jobId || scope.job.assetId !== lease.assetId) return fail('FORBIDDEN');
      if (scope.job.dispatchCount > 0) {
        dispatched = true; recovering = true;
        await heartbeat.stop(); signal.throwIfAborted();
        await options.custody.recover(scope.assetCapability,signal); signal.throwIfAborted(); outcome = { state: 'READY' };
      } else {
        if (!options.configuration.enabled[scope.job.kind] || !isDeepStrictEqual(scope.job.profile,options.configuration.profiles?.[scope.job.kind])) return fail('AI_UNAVAILABLE');
        const grounding = await options.loader.load(scope,signal); signal.throwIfAborted();
        const text = projectFoxyTextInput({ purpose: 'CHAT', message: scope.job.prompt, grounding, signal });
        const { purpose: _purpose, message: prompt, ...context } = text;
        const input = { ...context, prompt, aspectRatio: scope.job.aspectRatio };
        const provider = options.providers[scope.job.kind], count = await provider.countTokens(input); signal.throwIfAborted();
        if (!Number.isSafeInteger(count) || count < 1 || count > scope.job.profile.maxInputTokens) return fail('AI_INPUT_LIMIT');
        const capability = scope.capability;
        const reservation = await transact(options,async tx => {
          if (!await options.authority.revalidateGrounding(capability,signal,tx)) return fail('CONFLICT');
          signal.throwIfAborted(); return options.budget.reserve(tx,lease,count);
        });
        if (reservation === 'NOT_CURRENT') return true;
        if (reservation !== 'RESERVED') return fail(reservation === 'NO_BUDGET' ? 'AI_BUDGET_EXCEEDED' : 'PROVIDER_OUTCOME_UNKNOWN');
        dispatched = true; signal.throwIfAborted();
        let payload: Parameters<VisualOptions['custody']['receive']>[1];
        if (scope.job.kind === 'IMAGE') {
          const generated = await options.providers.IMAGE.generate(input); usage = generated.usage; signal.throwIfAborted();
          if (!await transact(options,tx => options.budget.settle(tx,lease,usage))) return fail('CONFLICT'); settled = true; checkUsage(usage,scope.job.profile);
          payload = { bytes: generated.bytes, title: 'Imagen educativa', description: scope.job.prompt, producerVersion: 'foxy-image-original-v1', diagram: null };
        } else {
          const generated = await options.providers.DIAGRAM.generate(input); usage = generated.usage; signal.throwIfAborted();
          if (!await transact(options,tx => options.budget.settle(tx,lease,usage))) return fail('CONFLICT'); settled = true; checkUsage(usage,scope.job.profile);
          const diagram = parseFoxyDiagram(generated.diagram); if (!diagram.nodes.length) return fail('INVALID_AI_OUTPUT');
          const rendered = await options.renderer.render({ diagram, aspectRatio: scope.job.aspectRatio, signal }); signal.throwIfAborted();
          payload = { bytes: rendered.bytes, title: diagram.title, description: diagram.description, producerVersion: 'foxy-diagram-png-v1', diagram };
        }
        await heartbeat.stop(); signal.throwIfAborted(); await options.custody.receive(scope.assetCapability,payload,signal); signal.throwIfAborted(); outcome = { state: 'READY' };
      }
    } catch (error) { outcome = { state: 'FAILED', errorCode: recovering ? 'PROVIDER_OUTCOME_UNKNOWN' : errorCode(error,dispatched), ...(settled ? { usage } : {}) }; }
    finally { await heartbeat.stop(); clearTimeout(deadline); if (scope) options.authority.close(scope); controller = undefined; }
    if (outcome) await options.completion.finish(lease,outcome); return true;
  }
  function runOnce(): Promise<boolean> { if (stopped) return Promise.resolve(false); if (!active) active = run().finally(() => { active = undefined; }); return active; }
  function poll(): void { if (!stopped) { timer = setTimeout(() => { void runOnce().catch(() => false).finally(poll); },30000); timer.unref?.(); } }
  return { runOnce, onModuleInit() { if (!initialized && !stopped) { initialized = true; poll(); } },
    onModuleDestroy() { if (!stopping) { stopped = true; clearTimeout(timer); controller?.abort(); stopping = (async () => { await active?.catch(() => false); })(); } return stopping; } };
}
