import type { FoxyPurpose, FoxyTextInput } from '../../../../../../src/core/domain/index.ts';
import type { FoxyGrounding } from '../../../../../../src/core/domain/foxy/grounding.ts';
import type { FoxyTurnLease } from './turn-queue.ts';
import type { FoxyClaimScope } from './claim-authority.ts';
import { projectFoxyTextInput } from './provider-input.ts';
import type { AiExecutionSettings } from '../../../../../../src/core/contracts/ai-execution.ts';
import { configurationForJob } from '../../../platform/ai/execution-snapshot.ts';

type HistoryPair = { user: string; assistant: { title: string; markdown: string } };
type Payload = { purpose: FoxyPurpose; message: string; history?: HistoryPair[]; executionProfile?: unknown; metadata: { model: string; promptVersion: string; schemaVersion: string } };
type Configuration = { model: string; maxInputTokens: number } & AiExecutionSettings;
type Provider = { countTokens(input: FoxyTextInput): Promise<number> };
type Options<C extends Configuration = Configuration, P extends Provider = Provider> = { turns: { loadClaimed(lease: FoxyTurnLease, signal: AbortSignal): Promise<Payload> };
  authority: { open(lease: FoxyTurnLease, signal: AbortSignal): Promise<FoxyClaimScope>; close(scope: FoxyClaimScope): void;
    revalidateGrounding?(capability: object, signal: AbortSignal): Promise<boolean> };
  loader: { load(scope: FoxyClaimScope, signal: AbortSignal): Promise<FoxyGrounding> };
  provider: P; configuration: C; providerForExecution?: (configuration: C) => P };
function failure(code: 'AI_UNAVAILABLE' | 'AI_INPUT_LIMIT'): never { throw Object.assign(new Error(code), { code }); }
async function preflight(options: Pick<Options, 'authority' | 'provider' | 'configuration'>, original: FoxyTextInput, signal: AbortSignal, scope: FoxyClaimScope) {
  async function attempt(input: FoxyTextInput) {
    signal.throwIfAborted();
    if ((scope.snapshot.context?.kind === 'CLASSROOM' || scope.snapshot.attachments?.length)
      && !await options.authority.revalidateGrounding?.(scope.capability, signal))
      throw Object.assign(new Error('CONFLICT'), { code: 'CONFLICT' });
    signal.throwIfAborted();
    let count: number;
    try { count = await options.provider.countTokens(input); }
    catch (error) {
      signal.throwIfAborted();
      if ((error as { code?: string })?.code !== 'AI_INPUT_LIMIT') throw error;
      return null;
    }
    signal.throwIfAborted();
    if (!Number.isSafeInteger(count) || count < 1) return failure('AI_UNAVAILABLE');
    return count <= options.configuration.maxInputTokens ? { input, count } : null;
  }
  let input = original;
  const history = original.history ?? [];
  if (history.length > 5) {
    const full = await attempt(original);
    if (full) return full;
    let best = await attempt({ ...original, history: [] });
    if (!best) return failure('AI_INPUT_LIMIT');
    let low = 1, high = history.length - 1;
    // Keep the exact successful input: its identity carries the adapter's preflight ticket.
    // Non-monotonic tokenization may hide a longer fit; never return an uncounted suffix.
    while (low <= high) {
      const length = Math.floor((low + high) / 2);
      const result = await attempt({ ...original, history: history.slice(-length) });
      if (result) { best = result; low = length + 1; }
      else high = length - 1;
    }
    return best;
  }
  for (;;) {
    const result = await attempt(input);
    if (result) return result;
    if (!input.history?.length) return failure('AI_INPUT_LIMIT');
    input = { ...input, history: input.history.slice(1) };
  }
}
export function createFoxyTurnPreparation<C extends Configuration, P extends Provider>(options: Options<C, P>) {
  return {
    async prepare(lease: FoxyTurnLease, signal: AbortSignal, onConfiguration?: (configuration: C) => void) {
      signal.throwIfAborted();
      const turn = await options.turns.loadClaimed(lease, signal); signal.throwIfAborted();
      if (!turn?.metadata) return failure('AI_UNAVAILABLE');
      const configuration = turn.executionProfile != null || options.configuration.legacyExecutionProfiles || options.providerForExecution
        ? configurationForJob(options.configuration, turn.executionProfile, 'foxy') : options.configuration;
      const snapshot = configuration.executionProfile;
      if (turn.metadata.model !== configuration.model || turn.metadata.promptVersion !== 'foxy-chat-v2'
        || turn.metadata.schemaVersion !== 'foxy-answer-v1' || (snapshot && (snapshot.promptVersion !== turn.metadata.promptVersion
          || snapshot.responseVersion !== turn.metadata.schemaVersion))) return failure('AI_UNAVAILABLE');
      onConfiguration?.(configuration);
      signal.throwIfAborted();
      const provider = options.providerForExecution?.(configuration) ?? options.provider;
      const scope = await options.authority.open(lease, signal);
      try {
        signal.throwIfAborted();
        const grounding = await options.loader.load(scope, signal); signal.throwIfAborted();
        const original = projectFoxyTextInput({ purpose: turn.purpose, message: turn.message, history: turn.history, grounding, signal });
        const { input, count } = await preflight({ ...options, provider, configuration }, original, signal, scope);
        return { scope, grounding, input, count, provider, configuration };
      } catch (error) { options.authority.close(scope); throw error; }
    },
  };
}
