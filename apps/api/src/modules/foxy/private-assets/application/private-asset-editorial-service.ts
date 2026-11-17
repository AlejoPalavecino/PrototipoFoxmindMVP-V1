import { assetUuid, parseEditFoxyPrivateAsset } from '../../../../../../../src/core/domain/foxy/asset-validation.ts';
import type { FoxyUnitOfWork, FoxyPrivateAssetEditorialRepositoryPort, FoxyPrivateAssetReadRepositoryPort } from '../../application/ports.ts';
export function createFoxyPrivateAssetEditorialService(options: { uow: FoxyUnitOfWork; assets: FoxyPrivateAssetEditorialRepositoryPort; reads: FoxyPrivateAssetReadRepositoryPort }) {
  return { async edit(request: unknown, assetId: string, input: unknown) {
    const id = assetUuid(assetId), command = parseEditFoxyPrivateAsset(input);
    return options.uow.run(request,true,async(tx,actor)=>{
      const receipt = await options.assets.edit(tx,actor.id,id,command);
      return { ...await options.reads.inspect(tx,actor.id,id), receipt };
    });
  } };
}
