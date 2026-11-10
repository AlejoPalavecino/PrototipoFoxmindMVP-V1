import type { FoxyConversationRepositoryPort, FoxyTurnRepositoryPort, FoxyUnitOfWork } from './ports.ts';
import { parseSendFoxyMessage, strictObject, type SendFoxyMessage } from '../../../../../../src/core/domain/index.ts';
import type { SqlTransaction } from '../../../../../../src/core/contracts/sql.ts';

type Options = { uow: FoxyUnitOfWork; conversations: FoxyConversationRepositoryPort;
  turns: FoxyTurnRepositoryPort; configuration: { enabled: boolean; model: string };
  digest(text: string): string;
  authority: { ownedRoom(tx: SqlTransaction, owner: string, id: string): Promise<void>; activeRoom(tx: SqlTransaction, owner: string, id: string): Promise<void> };
  rebuildGrounding(tx: SqlTransaction, context: import('../../../../../../src/core/domain/index.ts').FoxyContext, selection: import('../../../../../../src/core/domain/index.ts').FoxySelection): Promise<import('../../../../../../src/core/domain/foxy/grounding.ts').FoxyGroundingSnapshot>;
};
function fail(code: 'INVALID_INPUT' | 'NOT_FOUND' | 'FORBIDDEN' | 'AI_UNAVAILABLE' | 'RESPONSE_TOO_LARGE'): never { throw Object.assign(new Error(code), { code }); }
function inputHash(input: SendFoxyMessage, digest: (text: string) => string): string {
  const data = { revision: input.revision, purpose: input.purpose, text: input.text,
    topicIds: input.selection.topicIds.map(id => id.toLowerCase()), sourceIds: input.selection.sourceIds.map(id => id.toLowerCase()) };
  return digest(JSON.stringify(data));
}
function publicTurn(turn: NonNullable<Awaited<ReturnType<Options['turns']['get']>>>) {
  const answer = turn.answer ? { schemaVersion: turn.answer.schemaVersion, title: turn.answer.title, markdown: turn.answer.markdown,
    warnings: turn.answer.warnings, missingInformation: turn.answer.missingInformation } : null;
  return { id: turn.id, sequence: turn.sequence, state: turn.state, purpose: turn.purpose, message: turn.message,
    answer, errorCode: turn.errorCode, createdAt: turn.createdAt };
}
const MAX_PAGE_BYTES = 2 * 1024 * 1024;
function boundedPage(turns: ReturnType<typeof publicTurn>[], limit: number) {
  const items: ReturnType<typeof publicTurn>[] = [];
  for (const turn of turns.slice(0, limit)) {
    const candidate = [...items, turn];
    const more = turns.length > candidate.length;
    const nextAfterSequence = more ? turn.sequence : null;
    if (new TextEncoder().encode(JSON.stringify({ items: candidate, nextAfterSequence })).byteLength > MAX_PAGE_BYTES) {
      if (!items.length) return fail('RESPONSE_TOO_LARGE');
      return { items, nextAfterSequence: items[items.length - 1]!.sequence };
    }
    items.push(turn);
  }
  return { items, nextAfterSequence: turns.length > items.length ? items[items.length - 1]!.sequence : null };
}
export function createFoxyTurnService(options: Options) {
  return {
    async send(request: unknown, conversationId: string, input: unknown) {
      return options.uow.run(request, true, async (tx, actor) => {
        const conversation = await options.conversations.get(tx, actor.id, conversationId);
        if (!conversation) return fail('NOT_FOUND');
        if (conversation.context.kind === 'CLASSROOM') {
          await options.authority.ownedRoom(tx, actor.id, conversation.context.classroomId);
        }
        const message = parseSendFoxyMessage(input, conversation.context), hash = inputHash(message, options.digest);
        const previous = await options.turns.replay(tx, actor.id, conversationId, message.requestId, hash);
        if (previous) return previous;
        if (!options.configuration.enabled || typeof options.configuration.model !== 'string' || !options.configuration.model.trim()) return fail('AI_UNAVAILABLE');
        if (conversation.context.kind === 'CLASSROOM') await options.authority.activeRoom(tx, actor.id, conversation.context.classroomId);
        const snapshot = await options.rebuildGrounding(tx, conversation.context, message.selection);
        return options.turns.enqueue(tx, actor.id, conversationId, message, snapshot, hash,
          { model: options.configuration.model, promptVersion: 'foxy-chat-v2', schemaVersion: 'foxy-answer-v1' });
      });
    },
    async get(request: unknown, conversationId: string, turnId: string) {
      return options.uow.run(request, false, async (tx, actor) => {
        const turn = await options.turns.get(tx, actor.id, conversationId, turnId);
        if (!turn) return fail('NOT_FOUND');
        return publicTurn(turn);
      });
    },
    async list(request: unknown, conversationId: string, input: unknown) {
      const page = strictObject(input, ['afterSequence', 'limit']);
      if (!Number.isSafeInteger(page.afterSequence) || (page.afterSequence as number) < 0 || !Number.isSafeInteger(page.limit)
        || (page.limit as number) < 1 || (page.limit as number) > 100) return fail('INVALID_INPUT');
      const turns = await options.uow.run(request, false, async (tx, actor) => {
        if (!await options.conversations.get(tx, actor.id, conversationId)) return fail('NOT_FOUND');
        return options.turns.list(tx, actor.id, conversationId,
          { afterSequence: page.afterSequence as number, limit: (page.limit as number) + 1 });
      });
      return boundedPage(turns.map(publicTurn), page.limit as number);
    },
  };
}
