import { assetUuid, parseDiscardFoxyPrivateAsset } from '../../../../src/core/domain/index.ts';
import type { createFoxyUnitOfWork } from './unit-of-work.ts';
import type { createFoxyPrivateAssetDiscardRepository } from './private-asset-discard-repository.ts';
export function createFoxyPrivateAssetDiscardService(options: { uow: ReturnType<typeof createFoxyUnitOfWork>; assets: ReturnType<typeof createFoxyPrivateAssetDiscardRepository> }) {
  return { async discard(request: unknown, assetId: string, input: unknown) {
    const id = assetUuid(assetId), command = parseDiscardFoxyPrivateAsset(input);
    return options.uow.run(request, true, (tx, actor) => options.assets.discard(tx, actor.id, id, command));
  } };
}
