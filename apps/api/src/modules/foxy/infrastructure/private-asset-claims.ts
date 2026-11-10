import { randomUUID } from 'node:crypto';
import { assetUuid } from '../../../../../../src/core/domain/index.ts';
import type { SqlDatabase } from '../../../../../../src/core/contracts/sql.ts';
import { lockAsset, transaction, type Lease } from './private-asset-authority-db.ts';
export function createFoxyPrivateAssetClaims(options: { database: SqlDatabase }) {
  return {
    async claim(input: { assetId: string; ownerId: string }): Promise<Lease | null> {
      const assetId = assetUuid(input.assetId), ownerId = assetUuid(input.ownerId), nonce = randomUUID();
      return transaction(options.database, async tx => {
        const row = await lockAsset(tx, ownerId, assetId);
        const [changed] = await tx.query<{ id: string }>(`UPDATE foxy_visual_assets SET state='PROCESSING',lease_nonce=$2::uuid,
          lease_until=clock_timestamp()+interval '90 seconds',revision=revision+1,updated_at=clock_timestamp(),last_activity_at=clock_timestamp()
          WHERE id=$1::uuid AND (state='RESERVED' OR (state='PROCESSING' AND lease_until<=clock_timestamp())) RETURNING id`, assetId, nonce);
        return changed ? { assetId, ownerId, conversationId: row.conversation_id, leaseNonce: nonce } : null;
      });
    },
    async renew(lease: Lease): Promise<boolean> {
      return transaction(options.database, async tx => {
        await lockAsset(tx, assetUuid(lease.ownerId), assetUuid(lease.assetId));
        const rows = await tx.query(`UPDATE foxy_visual_assets SET lease_until=clock_timestamp()+interval '90 seconds',last_activity_at=clock_timestamp(),updated_at=clock_timestamp()
          WHERE id=$1::uuid AND owner_id=$2::uuid AND conversation_id=$3::uuid AND state='PROCESSING' AND lease_nonce=$4::uuid AND lease_until>clock_timestamp() RETURNING id`, lease.assetId, lease.ownerId, lease.conversationId, lease.leaseNonce);
        return rows.length === 1;
      });
    },
  };
}
