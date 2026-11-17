import type { FoxyUnitOfWork, FoxyPrivateAssetReadRepositoryPort } from '../../application/ports.ts';
import { assetUuid } from '../../../../../../../src/core/domain/foxy/asset-validation.ts';
export function createFoxyPrivateAssetReadService(options: { uow: FoxyUnitOfWork; assets: FoxyPrivateAssetReadRepositoryPort }) {
  return { inspect(request: unknown, assetId: string) { const id = assetUuid(assetId); return options.uow.run(request, false, (tx, actor) => options.assets.inspect(tx, actor.id, id)); } };
}
