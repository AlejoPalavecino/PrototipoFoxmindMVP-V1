import { assetUuid } from '../../../../src/core/domain/index.ts';
import type { createFoxyUnitOfWork } from './unit-of-work.ts';
import type { createFoxyPrivateAssetReadRepository } from './private-asset-read-repository.ts';
export function createFoxyPrivateAssetReadService(options: { uow: ReturnType<typeof createFoxyUnitOfWork>; assets: ReturnType<typeof createFoxyPrivateAssetReadRepository> }) {
  return { inspect(request: unknown, assetId: string) { const id = assetUuid(assetId); return options.uow.run(request, false, (tx, actor) => options.assets.inspect(tx, actor.id, id)); } };
}
