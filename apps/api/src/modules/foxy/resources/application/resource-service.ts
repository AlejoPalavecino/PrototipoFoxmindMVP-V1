import { assertResourceIdentifiers, resourceEditCommand } from './editorial-policy.ts';
import type { FoxyResourceRepositoryPort, FoxyUnitOfWork } from '../../application/ports.ts';

export function createFoxyResourceService(options: {
  uow: FoxyUnitOfWork;
  resources: FoxyResourceRepositoryPort;
  prepareActivity(tx: import('../../../../../../../src/core/contracts/sql.ts').SqlTransaction, actor: import('../../application/ports.ts').FoxyActor, resourceId: string, input: unknown, resources: FoxyResourceRepositoryPort): Promise<import('../../../../../../../src/core/domain/foxy/foxy-activity-draft.ts').FoxyActivityDraftReceipt>;
}) {
  return {
    prepareActivity(request: unknown, resourceId: string, input: unknown) {
      return options.uow.run(request, true, (tx, actor) => options.prepareActivity(tx, actor, resourceId, input, options.resources));
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
      return options.uow.run(request, true, (tx, actor) => {
        assertResourceIdentifiers(actor.id, resourceId);
        return options.resources.edit(tx, actor.id, resourceId, resourceEditCommand(input));
      });
    },
  };
}
