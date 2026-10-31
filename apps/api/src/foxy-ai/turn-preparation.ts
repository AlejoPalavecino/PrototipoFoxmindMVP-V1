import type { FoxyPurpose, FoxyTextInput } from '../../../../src/core/domain/index.ts';
import type { FoxyGrounding } from '../../../../src/core/domain/foxy-ai-grounding.ts';
import type { FoxyTurnLease } from './turn-queue.ts';
import type { FoxyClaimScope } from './claim-authority.ts';
import { projectFoxyTextInput } from './provider-input.ts';

type HistoryPair = { user: string; assistant: { title: string; markdown: string } };
type Payload = { purpose: FoxyPurpose; message: string; history?: HistoryPair[]; metadata: { model: string; promptVersion: string; schemaVersion: string } };
type Options = { turns: { loadClaimed(lease: FoxyTurnLease, signal: AbortSignal): Promise<Payload> };
  authority: { open(lease: FoxyTurnLease, signal: AbortSignal): Promise<FoxyClaimScope>; close(scope: FoxyClaimScope): void };
  loader: { load(scope: FoxyClaimScope, signal: AbortSignal): Promise<FoxyGrounding> };
  provider: { countTokens(input: FoxyTextInput): Promise<number> }; configuration: { model: string; maxInputTokens: number } };
function failure(code: 'AI_UNAVAILABLE' | 'AI_INPUT_LIMIT'): never { throw Object.assign(new Error(code), { code }); }
async function preflight(options: Options, original: FoxyTextInput, signal: AbortSignal) {
  let input = original;
  for (;;) {
    signal.throwIfAborted();
    let count: number;
    try { count = await options.provider.countTokens(input); }
    catch (error) {
      signal.throwIfAborted();
      if ((error as { code?: string })?.code !== 'AI_INPUT_LIMIT' || !input.history?.length) throw error;
      input = { ...input, history: input.history.slice(1) }; continue;
    }
    signal.throwIfAborted();
    if (!Number.isSafeInteger(count) || count < 1) return failure('AI_UNAVAILABLE');
    if (count <= options.configuration.maxInputTokens) return { input, count };
    if (!input.history?.length) return failure('AI_INPUT_LIMIT');
    input = { ...input, history: input.history.slice(1) };
  }
}
export function createFoxyTurnPreparation(options: Options) {
  return {
    async prepare(lease: FoxyTurnLease, signal: AbortSignal) {
      signal.throwIfAborted();
      const turn = await options.turns.loadClaimed(lease, signal); signal.throwIfAborted();
      if (!turn?.metadata || turn.metadata.model !== options.configuration.model || turn.metadata.promptVersion !== 'foxy-chat-v2'
        || turn.metadata.schemaVersion !== 'foxy-answer-v1') return failure('AI_UNAVAILABLE');
      const scope = await options.authority.open(lease, signal);
      try {
        signal.throwIfAborted();
        const grounding = await options.loader.load(scope, signal); signal.throwIfAborted();
        const original = projectFoxyTextInput({ purpose: turn.purpose, message: turn.message, history: turn.history, grounding, signal });
        const { input, count } = await preflight(options, original, signal);
        return { scope, grounding, input, count };
      } catch (error) { options.authority.close(scope); throw error; }
    },
  };
}
