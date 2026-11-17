import { parseStartFoxyVisual } from '../../../../../../../src/core/domain/foxy/visual-validation.ts';
import { strictObject } from '../../../../../../../src/core/domain/curriculum/plan.ts';
import type { FoxyUnitOfWork, FoxyConversationRepositoryPort, FoxyVisualRepositoryPort } from '../../application/ports.ts';
import type { FoxyContext, FoxySelection } from '../../../../../../../src/core/domain/foxy/foxy-ai.ts';
import type { SqlTransaction } from '../../../../../../../src/core/contracts/sql.ts';
import type { FoxyGroundingSnapshot, ChatAttachmentSource } from '../../../../../../../src/core/domain/foxy/grounding.ts';
import { validateVisualProfile, type VisualProfile } from '../../domain/visual-profile.ts';
function fail(code: string): never { throw Object.assign(new Error(code), { code }); }
type Options = { uow: FoxyUnitOfWork; conversations: FoxyConversationRepositoryPort;
  attachments?(tx: SqlTransaction, owner: string, conversation: string): Promise<ChatAttachmentSource[]>;
  jobs: FoxyVisualRepositoryPort; configuration: { enabled: { IMAGE: boolean; DIAGRAM: boolean }; profiles: { IMAGE: VisualProfile | null; DIAGRAM: VisualProfile | null }; privateQuotaBytes: bigint };
 activeClassroom(tx: SqlTransaction, classroomId: string, owner: string): Promise<boolean>;
 checkFileQuota?(snapshot: FoxyGroundingSnapshot): void;
 rebuildGrounding(tx: SqlTransaction, context: FoxyContext, selection: FoxySelection): Promise<FoxyGroundingSnapshot>;
};
export function createFoxyVisualService(options: Options) {
  return {
    async start(request: unknown, conversationId: string, input: unknown) {
      return options.uow.run(request,true,async(tx,actor)=>{
        const conversation=await options.conversations.get(tx,actor.id,conversationId); if (!conversation) return fail('NOT_FOUND');
        const command=parseStartFoxyVisual(input,conversation.context), previous=await options.jobs.replay(tx,actor.id,conversationId,command);
        if (previous) return previous;
        if (!options.configuration.enabled[command.kind]) return fail('AI_UNAVAILABLE');
        const profile=validateVisualProfile(options.configuration.profiles[command.kind],command.kind);
        if (conversation.context.kind==='CLASSROOM' && !await options.activeClassroom(tx,conversation.context.classroomId,actor.id)) return fail('NOT_FOUND');
        const snapshot=await options.rebuildGrounding(tx,conversation.context,command.selection);
        const attachments=await options.attachments?.(tx,actor.id,conversationId);
        if (attachments?.length) snapshot.attachments=attachments;
        options.checkFileQuota?.(snapshot);
        return options.jobs.enqueue(tx,actor.id,conversationId,command,snapshot,profile,options.configuration.privateQuotaBytes);
      });
    },
    async cancel(request: unknown, conversationId: string, jobId: string) {
      return options.uow.run(request,true,async(tx,actor)=>{
        if (!await options.conversations.get(tx,actor.id,conversationId)) return fail('NOT_FOUND');
        return await options.jobs.cancel(tx,actor.id,conversationId,jobId) ?? fail('NOT_FOUND');
      });
    },
    async get(request: unknown, conversationId: string, jobId: string) {
      return options.uow.run(request,false,async(tx,actor)=>{
        if (!await options.conversations.get(tx,actor.id,conversationId)) return fail('NOT_FOUND');
        return await options.jobs.get(tx,actor.id,conversationId,jobId) ?? fail('NOT_FOUND');
      });
    },
    async list(request: unknown, conversationId: string, input: unknown) {
      const page=strictObject(input,['limit','afterId']);
      if (!Number.isSafeInteger(page.limit) || (page.limit as number)<1 || (page.limit as number)>50 || (page.afterId!==null && typeof page.afterId!=='string')) return fail('INVALID_INPUT');
      return options.uow.run(request,false,async(tx,actor)=>{
        if (!await options.conversations.get(tx,actor.id,conversationId)) return fail('NOT_FOUND');
        return options.jobs.list(tx,actor.id,conversationId,{limit:page.limit as number,afterId:page.afterId as string | null});
      });
    },
  };
}
