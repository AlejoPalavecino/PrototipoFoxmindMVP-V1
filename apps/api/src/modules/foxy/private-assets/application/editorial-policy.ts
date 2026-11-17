import type { EditFoxyPrivateAsset, FoxyPrivateAssetEditReceipt } from '../../../../../../../src/core/domain/foxy/asset.ts';

type LockedAsset = { state: string; editorial_revision: bigint };
type PriorEdit = { asset_id: string; action: string; input_hash: string; editorial_revision: bigint };
function conflict(): never { throw Object.assign(new Error('CONFLICT'), { code: 'CONFLICT' }); }

/** Keep the version marker, array order and revision spelling used by persisted receipts. */
export function privateAssetEditIdentity(id: string, command: EditFoxyPrivateAsset): string {
  return JSON.stringify(['foxy-private-editorial-v1', id, command.expectedRevision, command.title, command.description]);
}
/** Replay precedes current-state checks, after the adapter has reauthorized and locked the asset. */
export function privateAssetEditReplay(id: string, command: EditFoxyPrivateAsset, asset: LockedAsset,
  previous: PriorEdit | undefined, hash: string): FoxyPrivateAssetEditReceipt | null {
  if (previous) {
    if (previous.asset_id !== id || previous.action !== 'EDIT' || previous.input_hash !== hash) return conflict();
    return { assetId: id, action: 'EDIT', editorialRevision: String(previous.editorial_revision) };
  }
  if (asset.state !== 'READY' || String(asset.editorial_revision) !== command.expectedRevision
    || command.expectedRevision === '9223372036854775807') return conflict();
  return null;
}
