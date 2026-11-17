import type { FoxyUnitOfWork, FoxyPrivateAssetDiscardRepositoryPort } from '../../application/ports.ts';
import { assetUuid, parseDiscardFoxyPrivateAsset } from '../../../../../../../src/core/domain/foxy/asset-validation.ts';
export function createFoxyPrivateAssetDiscardService(options: { uow: FoxyUnitOfWork; assets: FoxyPrivateAssetDiscardRepositoryPort }) {
  return { async discard(request: unknown, assetId: string, input: unknown) {
    const id = assetUuid(assetId), command = parseDiscardFoxyPrivateAsset(input);
    return options.uow.run(request, true, (tx, actor) => options.assets.discard(tx, actor.id, id, command));
  } };
}
