import type { FoxyPurpose } from '../../../../../../../src/core/domain/foxy/foxy-ai.ts';
import type { FoxyTextInput } from '../../../../../../../src/core/domain/foxy/text.ts';
import type { FoxyGrounding } from '../../../../../../../src/core/domain/foxy/grounding.ts';
import type { FoxyTurnLease } from './turn-queue.ts';
import type { FoxyClaimScope } from './claim-authority.ts';
import { projectFoxyTextInput } from '../../domain/provider-input.ts';
import type { AiExecutionSettings } from '../../../../../../../src/core/contracts/ai-execution.ts';
import { configurationForJob } from '../../../../platform/ai/execution-snapshot.ts';
import type { AiChatTimings } from '../../../../platform/ai/text-metrics.ts';

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
type CountResult = { fits: true; input: FoxyTextInput; count: number } | { fits: false; count?: number };

function estimateSuffix(history: HistoryPair[], remainingTokens: number, historyTokens?: number): number {
  const sizes = history.map(pair => Buffer.byteLength(JSON.stringify(pair), 'utf8'));
  const total = sizes.reduce((sum, size) => sum + size, 0);
  // Some providers reject an oversized request without returning its token count.
  const bytesPerToken = historyTokens === undefined ? 4 : total / historyTokens;
  const remainingBytes = Math.ceil(remainingTokens * bytesPerToken);
  let bytes = 0, length = 0;
  for (let index = sizes.length - 1; index > 0; index--) {
    bytes += sizes[index];
    if (bytes > remainingBytes) break;
    length++;
  }
  return Math.max(1, length);
}

async function preflight(options: Pick<Options, 'authority' | 'provider' | 'configuration'>, original: FoxyTextInput, signal: AbortSignal, scope: FoxyClaimScope) {
  async function attempt(input: FoxyTextInput): Promise<CountResult> {
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
      return { fits: false };
    }
    signal.throwIfAborted();
    if (!Number.isSafeInteger(count) || count < 1) return failure('AI_UNAVAILABLE');
    return count <= options.configuration.maxInputTokens ? { fits: true, input, count } : { fits: false, count };
  }

  const full = await attempt(original);
  if (full.fits) return full;
  const history = original.history ?? [];
  if (history.length > 5) {
    const base = await attempt({ ...original, history: [] });
    if (!base.fits) return failure('AI_INPUT_LIMIT');
    const remainingTokens = options.configuration.maxInputTokens - base.count;
    const historyTokens = full.count === undefined ? undefined : full.count - base.count;
    // Return the first suffix confirmed by the provider. Its identity keeps the preflight ticket.
    for (let length = estimateSuffix(history, remainingTokens, historyTokens); length > 0; length = Math.floor(length / 2)) {
      const result = await attempt({ ...original, history: history.slice(-length) });
      if (result.fits) return result;
    }
    return base;
  }
  for (let removed = 1; removed <= history.length; removed++) {
    const result = await attempt({ ...original, history: history.slice(removed) });
    if (result.fits) return result;
  }
  return failure('AI_INPUT_LIMIT');
}
export function createFoxyTurnPreparation<C extends Configuration, P extends Provider>(options: Options<C, P>) {
  return {
    async prepare(lease: FoxyTurnLease, signal: AbortSignal, onConfiguration?: (configuration: C) => void, timing?: AiChatTimings) {
      let opened: FoxyClaimScope | undefined;
      async function assemble() {
        signal.throwIfAborted();
        const turn = await options.turns.loadClaimed(lease, signal); signal.throwIfAborted();
        if (!turn?.metadata) return failure('AI_UNAVAILABLE');
        timing?.setFlow(turn.purpose === 'CHAT' ? 'chat' : 'tool');
        const configuration = turn.executionProfile != null || options.configuration.legacyExecutionProfiles || options.providerForExecution
          ? configurationForJob(options.configuration, turn.executionProfile, 'foxy') : options.configuration;
        const snapshot = configuration.executionProfile;
        if (turn.metadata.model !== configuration.model || turn.metadata.promptVersion !== 'foxy-chat-v2'
          || turn.metadata.schemaVersion !== 'foxy-answer-v1' || (snapshot && (snapshot.promptVersion !== turn.metadata.promptVersion
            || snapshot.responseVersion !== turn.metadata.schemaVersion))) return failure('AI_UNAVAILABLE');
        onConfiguration?.(configuration);
        signal.throwIfAborted();
        const provider = options.providerForExecution?.(configuration) ?? options.provider;
        const scope = opened = await options.authority.open(lease, signal);
        signal.throwIfAborted();
        const grounding = await options.loader.load(scope, signal); signal.throwIfAborted();
        const original = projectFoxyTextInput({ purpose: turn.purpose, message: turn.message, history: turn.history, grounding, signal });
        return { scope, grounding, original, provider, configuration };
      }
      try {
        const { scope, grounding, original, provider, configuration } = await (timing?.measure('prepare', assemble) ?? assemble());
        const countInput = () => preflight({ ...options, provider, configuration }, original, signal, scope);
        const { input, count } = await (timing?.measure('count', countInput) ?? countInput());
        return { scope, grounding, input, count, provider, configuration };
      } catch (error) { if (opened) options.authority.close(opened); throw error; }
    },
  };
}
