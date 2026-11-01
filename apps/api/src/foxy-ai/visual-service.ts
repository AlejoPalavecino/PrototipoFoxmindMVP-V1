import { parseStartFoxyVisual, strictObject } from '../../../../src/core/domain/index.ts';
import type { createFoxyUnitOfWork } from './unit-of-work.ts';
import type { createFoxyConversationRepository } from './conversation-repository.ts';
import { rebuildGrounding } from './grounding-rebuild.ts';
import { validateVisualProfile, type VisualProfile, type createFoxyVisualRepository } from './visual-repository.ts';
function fail(code: string): never { throw Object.assign(new Error(code), { code }); }
type Options = { uow: ReturnType<typeof createFoxyUnitOfWork>; conversations: ReturnType<typeof createFoxyConversationRepository>;
  jobs: ReturnType<typeof createFoxyVisualRepository>; configuration: { enabled: { IMAGE: boolean; DIAGRAM: boolean }; profiles: { IMAGE: VisualProfile | null; DIAGRAM: VisualProfile | null }; privateQuotaBytes: bigint } };
export function createFoxyVisualService(options: Options) {
  return {
    async start(request: unknown, conversationId: string, input: unknown) {
      return options.uow.run(request,true,async(tx,actor)=>{
        const conversation=await options.conversations.get(tx,actor.id,conversationId); if (!conversation) return fail('NOT_FOUND');
        const command=parseStartFoxyVisual(input,conversation.context), previous=await options.jobs.replay(tx,actor.id,conversationId,command);
        if (previous) return previous;
        if (!options.configuration.enabled[command.kind]) return fail('AI_UNAVAILABLE');
        const profile=validateVisualProfile(options.configuration.profiles[command.kind],command.kind);
        if (conversation.context.kind==='CLASSROOM' && !(await tx.query('SELECT id FROM classrooms WHERE id=$1::uuid AND teacher_id=$2::uuid AND archived_at IS NULL FOR SHARE',conversation.context.classroomId,actor.id)).length) return fail('NOT_FOUND');
        const snapshot=await rebuildGrounding(tx,conversation.context,command.selection);
        return options.jobs.enqueue(tx,actor.id,conversationId,command,snapshot,profile,options.configuration.privateQuotaBytes);
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
