import { isDeepStrictEqual } from 'node:util';
import { parseSendFoxyMessage, type FoxyContext, type SqlTransaction } from '../../../../src/core/domain/index.ts';
import type { FoxyGroundingSnapshot } from '../../../../src/core/domain/foxy-ai-grounding.ts';
import type { ClassroomService } from '../classrooms/index.ts';
import { snapshotError } from './grounding-sources.ts';
import { rebuildGrounding } from './grounding-rebuild.ts';

type Conversations = { get(tx: SqlTransaction, owner: string, id: string): Promise<{ context: FoxyContext } | null> };
export class FoxyGroundingSnapshotService {
  private readonly run: ClassroomService['run'];
  private readonly classroom: ClassroomService['classroom'];
  private readonly conversations: Conversations;
  constructor(context: Pick<ClassroomService, 'run' | 'classroom'>, conversations: Conversations) {
    this.run = context.run.bind(context); this.classroom = context.classroom.bind(context); this.conversations = conversations;
  }
  async capture(request: unknown, conversationId: string, selection: unknown): Promise<FoxyGroundingSnapshot> {
    const result = await this.run(request, false, async (tx, actor) => {
      try {
        if (actor.account_role !== 'teacher') return snapshotError('FORBIDDEN');
        const conversation = await this.conversations.get(tx, actor.id, conversationId);
        if (!conversation) return snapshotError('FORBIDDEN');
        const checked = parseSendFoxyMessage({ requestId: '00000000-0000-0000-0000-000000000000', revision: '0',
          purpose: 'CHAT', text: 'context', selection }, conversation.context).selection;
        if (conversation.context.kind === 'GENERAL') return { value: await rebuildGrounding(tx, conversation.context, checked) };
        const room = await this.classroom(tx, actor, conversation.context.classroomId, false, true);
        if (room.archived_at) return snapshotError('CONFLICT');
        return { value: await rebuildGrounding(tx, conversation.context, checked) };
      } catch (error) {
        const code = (error as { code?: unknown })?.code;
        if (typeof code === 'string' && ['INVALID_INPUT', 'FORBIDDEN', 'FILE_NOT_READY', 'AI_INPUT_LIMIT', 'CONFLICT', 'EMPTY_CONTENT'].includes(code)) return { error: code };
        throw error;
      }
    });
    if ('error' in result && result.error) throw Object.assign(new Error(result.error), { code: result.error });
    return result.value!;
  }
  async revalidate(request: unknown, conversationId: string, snapshot: FoxyGroundingSnapshot): Promise<boolean> {
    try {
      const current = await this.capture(request, conversationId, { topicIds: snapshot.curriculum?.selectedTopicIds ?? [],
        sourceIds: snapshot.sources.map(source => source.sourceId) });
      return isDeepStrictEqual(current, snapshot);
    } catch (error) {
      if ((error as { code?: unknown })?.code === 'FORBIDDEN') throw error;
      if (['INVALID_INPUT', 'FILE_NOT_READY', 'AI_INPUT_LIMIT', 'CONFLICT', 'EMPTY_CONTENT'].includes(String((error as { code?: unknown })?.code))) return false;
      throw error;
    }
  }
}
