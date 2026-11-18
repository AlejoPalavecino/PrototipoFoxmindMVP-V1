import { parseFoxyDiagram } from '../../../../../../../src/core/domain/foxy/visual-validation.ts';
import type { SqlTransaction } from '../../../../../../../src/core/contracts/sql.ts';
import { isDeepStrictEqual } from 'node:util';
import { projectFoxyTextInput } from '../../domain/provider-input.ts';
import { exactOpeningImageProfileVersion, supportsPinnedVisualProfileVersion } from '../../domain/visual-profile.ts';
import { parseExactOpeningImage } from '../../domain/exact-opening-image.ts';
import { renderExactOpeningImage } from './exact-opening-image-renderer.ts';
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
function compatibleProfile(job: VisualScope['job'], live: VisualScope['job']['profile'] | null): boolean {
  if (!live) return false;
  const pinned = job.profile.profileVersion;
  return supportsPinnedVisualProfileVersion(job.kind, live.profileVersion, pinned)
    && isDeepStrictEqual(job.profile, { ...live, profileVersion: pinned });
}
function imagePayload(bytes: Uint8Array, description: string): Parameters<VisualOptions['custody']['receive']>[1] {
  return { bytes, title: 'Imagen educativa', description, producerVersion: 'foxy-image-original-v1', diagram: null };
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
    let scope: VisualScope | undefined, dispatched = false, renderingLocally = false, recovering = false, settled = false, usage: VisualUsage | null = null;
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
        if (!options.configuration.enabled[scope.job.kind] || !compatibleProfile(scope.job, options.configuration.profiles[scope.job.kind])) return fail('AI_UNAVAILABLE');
        const grounding = await options.loader.load(scope,signal); signal.throwIfAborted();
        const text = projectFoxyTextInput({ purpose: 'CHAT', message: scope.job.prompt, grounding, signal });
        const { purpose: _purpose, message: prompt, ...context } = text;
        const input = { ...context, prompt, aspectRatio: scope.job.aspectRatio, profileVersion: scope.job.profile.profileVersion };
        const exactOpening = scope.job.kind === 'IMAGE' && input.profileVersion === exactOpeningImageProfileVersion
          && input.mode === 'GENERAL' && !input.sources.length && !input.documents.length && !input.history.length && !input.warnings.length
          ? parseExactOpeningImage(prompt) : null;
        const provider = options.providers[scope.job.kind];
        const count = exactOpening ? null : await provider.countTokens(input);
        signal.throwIfAborted();
        if (!exactOpening && (count === null || !Number.isSafeInteger(count) || count < 1 || count > scope.job.profile.maxInputTokens)) return fail('AI_INPUT_LIMIT');
        const capability = scope.capability;
        const reservation = await transact(options,async tx => {
          if (!await options.authority.revalidateGrounding(capability,signal,tx)) return fail('CONFLICT');
          signal.throwIfAborted(); return options.budget.reserve(tx,lease,count);
        });
        if (reservation === 'NOT_CURRENT') return true;
        if (reservation !== 'RESERVED') return fail(reservation === 'NO_BUDGET' ? 'AI_BUDGET_EXCEEDED' : 'PROVIDER_OUTCOME_UNKNOWN');
        renderingLocally = exactOpening !== null;
        dispatched = !renderingLocally; signal.throwIfAborted();
        let payload: Parameters<VisualOptions['custody']['receive']>[1];
        if (exactOpening) {
          const bytes = await renderExactOpeningImage(exactOpening, input.aspectRatio, signal);
          payload = imagePayload(bytes, scope.job.prompt);
        } else if (scope.job.kind === 'IMAGE') {
          const generated = await options.providers.IMAGE.generate(input); usage = generated.usage; signal.throwIfAborted();
          if (!await transact(options,tx => options.budget.settle(tx,lease,usage))) return fail('CONFLICT'); settled = true; checkUsage(usage,scope.job.profile);
          payload = imagePayload(generated.bytes, scope.job.prompt);
        } else {
          const generated = await options.providers.DIAGRAM.generate(input); usage = generated.usage; signal.throwIfAborted();
          if (!await transact(options,tx => options.budget.settle(tx,lease,usage))) return fail('CONFLICT'); settled = true; checkUsage(usage,scope.job.profile);
          const diagram = parseFoxyDiagram(generated.diagram); if (!diagram.nodes.length) return fail('INVALID_AI_OUTPUT');
          const rendered = await options.renderer.render({ diagram, aspectRatio: scope.job.aspectRatio, signal }); signal.throwIfAborted();
          payload = { bytes: rendered.bytes, title: diagram.title, description: diagram.description, producerVersion: 'foxy-diagram-png-v1', diagram };
        }
        await heartbeat.stop(); signal.throwIfAborted(); await options.custody.receive(scope.assetCapability,payload,signal); signal.throwIfAborted(); outcome = { state: 'READY' };
      }
    } catch (error) {
      const code = renderingLocally && signal.aborted ? 'AI_TIMEOUT' : errorCode(error, dispatched);
      outcome = { state: 'FAILED', errorCode: recovering ? 'PROVIDER_OUTCOME_UNKNOWN' : code, ...(settled ? { usage } : {}) };
    }
    finally { await heartbeat.stop(); clearTimeout(deadline); if (scope) options.authority.close(scope); controller = undefined; }
    if (outcome) await options.completion.finish(lease,outcome); return true;
  }
  function runOnce(): Promise<boolean> { if (stopped) return Promise.resolve(false); if (!active) active = run().finally(() => { active = undefined; }); return active; }
  function poll(): void { if (!stopped) { timer = setTimeout(() => { void runOnce().catch(() => false).finally(poll); },30000); timer.unref?.(); } }
  return { runOnce, onModuleInit() { if (!initialized && !stopped) { initialized = true; poll(); } },
    onModuleDestroy() { if (!stopping) { stopped = true; clearTimeout(timer); controller?.abort(); stopping = (async () => { await active?.catch(() => false); })(); } return stopping; } };
}
