import type { SqlTransaction } from '../../../../../../../src/core/contracts/sql.ts';
import type { ReserveFoxyPrivateAsset, FoxyPrivateAssetView } from '../../../../../../../src/core/domain/foxy/asset.ts';
export interface FoxyPrivateAssetReservationPort {
 usage(tx: SqlTransaction, actorId: string): Promise<{ usedBytes: bigint }>;
 reserve(tx: SqlTransaction, actorId: string, conversationId: string, input: ReserveFoxyPrivateAsset, quotaBytes: bigint): Promise<{ created: boolean; asset: FoxyPrivateAssetView }>;
}
