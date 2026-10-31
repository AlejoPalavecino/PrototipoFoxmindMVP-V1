import { createHash } from 'node:crypto';
import { parseSendFoxyMessage, strictObject, type SqlTransaction, type SendFoxyMessage } from '../../../../src/core/domain/index.ts';
import type { createFoxyConversationRepository } from './conversation-repository.ts';
import type { createFoxyTurnRepository } from './turn-repository.ts';
import type { createFoxyUnitOfWork } from './unit-of-work.ts';
import { rebuildGrounding } from './grounding-rebuild.ts';

type Options = { uow: ReturnType<typeof createFoxyUnitOfWork>; conversations: ReturnType<typeof createFoxyConversationRepository>;
  turns: ReturnType<typeof createFoxyTurnRepository>; configuration: { enabled: boolean; model: string } };
function fail(code: 'INVALID_INPUT' | 'NOT_FOUND' | 'FORBIDDEN' | 'AI_UNAVAILABLE' | 'RESPONSE_TOO_LARGE'): never { throw Object.assign(new Error(code), { code }); }
function inputHash(input: SendFoxyMessage): string {
  const data = { revision: input.revision, purpose: input.purpose, text: input.text,
    topicIds: input.selection.topicIds.map(id => id.toLowerCase()), sourceIds: input.selection.sourceIds.map(id => id.toLowerCase()) };
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}
async function activeRoom(tx: SqlTransaction, owner: string, id: string): Promise<void> {
  const [room] = await tx.query('SELECT id FROM classrooms WHERE id=$1::uuid AND teacher_id=$2::uuid AND archived_at IS NULL FOR SHARE', id, owner);
  if (!room) return fail('FORBIDDEN');
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
    if (Buffer.byteLength(JSON.stringify({ items: candidate, nextAfterSequence }), 'utf8') > MAX_PAGE_BYTES) {
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
          const [owned] = await tx.query('SELECT id FROM classrooms WHERE id=$1::uuid AND teacher_id=$2::uuid FOR SHARE',
            conversation.context.classroomId, actor.id);
          if (!owned) return fail('FORBIDDEN');
        }
        const message = parseSendFoxyMessage(input, conversation.context), hash = inputHash(message);
        const previous = await options.turns.replay(tx, actor.id, conversationId, message.requestId, hash);
        if (previous) return previous;
        if (!options.configuration.enabled || typeof options.configuration.model !== 'string' || !options.configuration.model.trim()) return fail('AI_UNAVAILABLE');
        if (conversation.context.kind === 'CLASSROOM') await activeRoom(tx, actor.id, conversation.context.classroomId);
        const snapshot = await rebuildGrounding(tx, conversation.context, message.selection);
        return options.turns.enqueue(tx, actor.id, conversationId, message, snapshot, hash,
          { model: options.configuration.model, promptVersion: 'foxy-chat-v1', schemaVersion: 'foxy-answer-v1' });
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
