import type { FoxyPurpose, FoxyTextInput } from '../../../../src/core/domain/index.ts';
import type { FoxyGrounding } from '../../../../src/core/domain/foxy-ai-grounding.ts';
import type { FoxyTurnLease } from './turn-queue.ts';
import type { FoxyClaimScope } from './claim-authority.ts';
import { projectFoxyTextInput } from './provider-input.ts';

type Payload = { purpose: FoxyPurpose; message: string; metadata: { model: string; promptVersion: string; schemaVersion: string } };
type Options = { turns: { loadClaimed(lease: FoxyTurnLease): Promise<Payload> };
  authority: { open(lease: FoxyTurnLease, signal: AbortSignal): Promise<FoxyClaimScope>; close(scope: FoxyClaimScope): void };
  loader: { load(scope: FoxyClaimScope, signal: AbortSignal): Promise<FoxyGrounding> };
  provider: { countTokens(input: FoxyTextInput): Promise<number> }; configuration: { model: string; maxInputTokens: number } };
function invalid(): never { throw Object.assign(new Error('AI_UNAVAILABLE'), { code: 'AI_UNAVAILABLE' }); }
export function createFoxyTurnPreparation(options: Options) {
  return {
    async prepare(lease: FoxyTurnLease, signal: AbortSignal) {
      signal.throwIfAborted();
      const turn = await options.turns.loadClaimed(lease); signal.throwIfAborted();
      if (!turn?.metadata || turn.metadata.model !== options.configuration.model || turn.metadata.promptVersion !== 'foxy-chat-v1'
        || turn.metadata.schemaVersion !== 'foxy-answer-v1') return invalid();
      const scope = await options.authority.open(lease, signal);
      try {
        signal.throwIfAborted();
        const grounding = await options.loader.load(scope, signal); signal.throwIfAborted();
        const input = projectFoxyTextInput({ purpose: turn.purpose, message: turn.message, grounding, signal });
        const count = await options.provider.countTokens(input); signal.throwIfAborted();
        if (!Number.isSafeInteger(count) || count < 1 || count > options.configuration.maxInputTokens) return invalid();
        return { scope, grounding, input, count };
      } catch (error) { options.authority.close(scope); throw error; }
    },
  };
}
