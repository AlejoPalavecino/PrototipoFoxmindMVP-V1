import { agendaId, parsePrepareFoxyPublication, parsePrepareFoxyVisualPublication, parseConfirmFoxyPublication, strictObject, type FoxyPublicationSummary, type FoxyPublicationInspection, type FoxyPublicationConfirmation } from '../../../../src/core/domain/index.ts';
import type { createFoxyUnitOfWork } from './unit-of-work.ts';
import type { createFoxyPublicationRepository } from './publication-repository.ts';
import type { createFoxyPublicationConfirmationRepository } from './publication-confirmation-repository.ts';
import type { createFoxyVisualPublicationRepository } from './visual-publication-repository.ts';

type Options = { uow: ReturnType<typeof createFoxyUnitOfWork>; publications: ReturnType<typeof createFoxyPublicationRepository>;
  confirmations: ReturnType<typeof createFoxyPublicationConfirmationRepository>; visualPublications?: ReturnType<typeof createFoxyVisualPublicationRepository> };
type Publication = NonNullable<Awaited<ReturnType<Options['publications']['inspect']>>>['publication'];
function publicPublication(p: Publication): FoxyPublicationSummary {
  if ('sourceKind' in p) throw Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' });
  return { id: p.id, resourceId: p.resourceId, resourceRevision: p.resourceRevision, classroomId: p.classroomId,
    unitId: p.unitId, topicId: p.topicId, title: p.title, state: p.state, revision: p.revision };
}
function projection(value: NonNullable<Awaited<ReturnType<Options['publications']['inspect']>>>): FoxyPublicationInspection {
  const p = value.publication;
  return { publication: 'sourceKind' in p ? p : publicPublication(p),
    classroomRevision: value.classroomRevision, classroomArchived: value.classroomArchived,
    errorCode: p.state !== 'FAILED' ? null : value.errorCode === 'AI_INPUT_LIMIT' || value.errorCode === 'INVALID_INPUT'
      || value.errorCode === 'FILE_NOT_READY' ? value.errorCode : 'FILE_NOT_READY' };
}
export function createFoxyPublicationService(options: Options) {
  return {
    async prepareVisual(request: unknown, assetId: string, input: unknown) {
      agendaId(assetId); const value = parsePrepareFoxyVisualPublication(input);
      if (!options.visualPublications) throw Object.assign(new Error('NOT_FOUND'), { code: 'NOT_FOUND' });
      return options.uow.run(request, true, (tx, actor) => options.visualPublications!.prepare(tx, actor.id, assetId, value));
    },
    async listVisual(request: unknown, assetId: string, input: unknown) {
      agendaId(assetId); const value = strictObject(input, ['limit', 'afterId']);
      if (typeof value.limit !== 'number' || !Number.isSafeInteger(value.limit) || value.limit < 1 || value.limit > 50) throw Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' });
      if (value.afterId !== null) agendaId(value.afterId);
      if (!options.visualPublications) throw Object.assign(new Error('NOT_FOUND'), { code: 'NOT_FOUND' });
      return options.uow.run(request, false, (tx, actor) => options.visualPublications!.list(tx, actor.id, assetId, { limit: value.limit as number, afterId: value.afterId as string | null }));
    },
    async prepare(request: unknown, resourceId: string, input: unknown) {
      agendaId(resourceId); const value = parsePrepareFoxyPublication(input);
      const result = await options.uow.run(request, true, (tx, actor) => options.publications.prepare(tx, actor.id, resourceId, value));
      return { created: result.created, publication: publicPublication(result.publication) };
    },
    async list(request: unknown, resourceId: string, input: unknown) {
      agendaId(resourceId); const value = strictObject(input, ['limit', 'afterId']);
      if (typeof value.limit !== 'number' || !Number.isSafeInteger(value.limit) || value.limit < 1 || value.limit > 50) throw Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' });
      if (value.afterId !== null) agendaId(value.afterId);
      const page = { limit: value.limit as number, afterId: value.afterId as string | null };
      const result = await options.uow.run(request, false, (tx, actor) => options.publications.list(tx, actor.id, resourceId, page));
      return { items: result.items.map(publicPublication), nextAfterId: result.nextAfterId };
    },
    async inspect(request: unknown, publicationId: string) {
      agendaId(publicationId);
      return options.uow.run(request, false, async (tx, actor) => {
        const value = await options.publications.inspect(tx, actor.id, publicationId);
        if (!value) throw Object.assign(new Error('NOT_FOUND'), { code: 'NOT_FOUND' });
        return projection(value);
      });
    },
    async confirm(request: unknown, publicationId: string, input: unknown): Promise<FoxyPublicationConfirmation> {
      agendaId(publicationId); const value = parseConfirmFoxyPublication(input);
      const result = await options.uow.run(request, true, (tx, actor) => options.confirmations.confirm(tx, request, actor.id, publicationId, value));
      return { publicationId: result.publicationId, materialId: result.materialId, publicationRevision: result.publicationRevision, classroomRevision: result.classroomRevision };
    },
  };
}
