import type { createFoxyResourceRepository } from './resource-repository.ts';
import type { createFoxyUnitOfWork } from './unit-of-work.ts';
import { prepareFoxyActivity } from './activity-handoff.ts';

export function createFoxyResourceService(options: {
  uow: ReturnType<typeof createFoxyUnitOfWork>;
  resources: ReturnType<typeof createFoxyResourceRepository>;
}) {
  return {
    prepareActivity(request: unknown, resourceId: string, input: unknown) {
      return options.uow.run(request, true, (tx, actor) => prepareFoxyActivity(tx, actor, resourceId, input, options.resources));
    },
    fromTurn(request: unknown, conversationId: string, turnId: string) {
      return options.uow.run(request, true, (tx, actor) => options.resources.fromTurn(tx, actor.id, conversationId, turnId));
    },
    get(request: unknown, resourceId: string) {
      return options.uow.run(request, false, async (tx, actor) => {
        const result = await options.resources.get(tx, actor.id, resourceId);
        if (!result) throw Object.assign(new Error('NOT_FOUND'), { code: 'NOT_FOUND' });
        return result;
      });
    },
    edit(request: unknown, resourceId: string, input: unknown) {
      return options.uow.run(request, true, (tx, actor) => options.resources.edit(tx, actor.id, resourceId, input));
    },
  };
}
