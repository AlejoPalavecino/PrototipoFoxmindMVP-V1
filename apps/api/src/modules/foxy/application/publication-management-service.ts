import type { FoxyUnitOfWork, FoxyPublicationManagementRepositoryPort } from './ports.ts';
import { agendaId, parseRetryFoxyPublication, parseDiscardFoxyPublication, type FoxyPublicationManagement } from '../../../../../../src/core/domain/index.ts';

function receipt(value: unknown, id: string, action: 'RETRY' | 'DISCARD', base: string) {
  const r = value as { publicationId?: unknown; action?: unknown; publicationRevision?: unknown } | null;
  if (!r || typeof r.publicationId !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu.test(r.publicationId)
    || r.publicationId.toLowerCase() !== id.toLowerCase() || r.action !== action || typeof r.publicationRevision !== 'string'
    || !/^(0|[1-9][0-9]{0,18})$/u.test(r.publicationRevision) || BigInt(r.publicationRevision) > 9223372036854775807n
    || BigInt(r.publicationRevision) !== BigInt(base) + 1n) throw Object.assign(new Error('SERVICE_UNAVAILABLE'), { code: 'SERVICE_UNAVAILABLE' });
  return { publicationId: r.publicationId, action, publicationRevision: r.publicationRevision };
}
type Options = { uow: FoxyUnitOfWork; management: FoxyPublicationManagementRepositoryPort };
export function createFoxyPublicationManagementService(options: Options) {
  return {
    async inspect(request: unknown, id: string): Promise<FoxyPublicationManagement> {
      agendaId(id); return options.uow.run(request, false, async (tx, actor) => {
        const v = await options.management.inspect(tx, actor.id, id);
        return { publicationId: v.publicationId, publicationRevision: v.publicationRevision, canRetry: v.canRetry,
          retryReason: v.retryReason, canDiscard: v.canDiscard, cleanupState: v.cleanupState };
      });
    },
    async retry(request: unknown, id: string, input: unknown) {
      agendaId(id); const value = parseRetryFoxyPublication(input);
      return options.uow.run(request, true, async (tx, actor) => {
        const r = await options.management.retry(tx, actor.id, id, value);
        return receipt(r, id, 'RETRY', value.publicationRevision);
      });
    },
    async discard(request: unknown, id: string, input: unknown) {
      agendaId(id); const value = parseDiscardFoxyPublication(input);
      return options.uow.run(request, true, async (tx, actor) => {
        const r = await options.management.discard(tx, actor.id, id, value);
        return receipt(r, id, 'DISCARD', value.publicationRevision);
      });
    },
  };
}
