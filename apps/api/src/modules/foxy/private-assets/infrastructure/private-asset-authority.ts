import { isDeepStrictEqual } from 'node:util';
import { assetUuid } from '../../../../../../../src/core/domain/foxy/asset-validation.ts';
import type { SqlDatabase, SqlTransaction } from '../../../../../../../src/core/contracts/sql.ts';
import { conflict, denied, grant, lockAsset, payload, transaction, type AssetRow, type Lease, type Metadata } from './private-asset-authority-db.ts';
import { validatePayload } from './private-asset-authority-payload.ts';
import type { VisualClaimPort } from '../application/visual-claim-port.ts';
type State = { lease: Lease; signal: AbortSignal; closed: boolean; identity: string };
type Proof = { digest: string; sizeBytes: number; mimeType: string; width: number; height: number; validatedDigest: string; scannedDigest: string };
function identity(row: AssetRow): string { return JSON.stringify([row.id,row.owner_id,row.conversation_id,row.request_id,row.input_hash,String(row.conversation_revision),row.kind,row.aspect_ratio,row.storage_key,String(row.reserved_bytes)]); }
export function createFoxyPrivateAssetAuthority(options: { checkVisualClaim: VisualClaimPort; database: SqlDatabase; maxJobAgeMs?: number }) {
  const capabilities = new WeakMap<object,State>(), scopes = new WeakMap<object,State>();
  const transact = <T>(fn: (tx: SqlTransaction) => Promise<T>) => transaction(options.database, fn);
  async function check(tx: SqlTransaction, lease: Lease): Promise<AssetRow> {
    const row = await lockAsset(tx, lease.ownerId, lease.assetId);
    if (row.conversation_id !== lease.conversationId || row.state !== 'PROCESSING' || row.lease_nonce !== lease.leaseNonce) return denied();
    const [live] = await tx.query('SELECT id FROM foxy_visual_assets WHERE id=$1::uuid AND lease_nonce=$2::uuid AND lease_until>clock_timestamp()',lease.assetId,lease.leaseNonce);
    if (!live) return denied();
    const [job] = await tx.query<{ id: string }>('SELECT id FROM foxy_visual_jobs WHERE asset_id=$1::uuid AND owner_id=$2::uuid',lease.assetId,lease.ownerId);
    if (job && (!Number.isSafeInteger(options.maxJobAgeMs) || options.maxJobAgeMs! < 1
      || !(await options.checkVisualClaim(tx,{ ...lease, jobId: job.id },options.maxJobAgeMs!)).fresh)) return denied();
    return row;
  }
  function stateOf(capability: object, signal: AbortSignal): State {
    const state = capability && capabilities.get(capability);
    if (!state || state.closed || !signal || signal !== state.signal || signal.aborted) return denied();
    return state;
  }
  async function verify(tx: SqlTransaction, state: State, signal: AbortSignal): Promise<AssetRow> {
    if (state.closed || signal.aborted) return denied();
    const row = await check(tx,state.lease);
    if (state.closed || signal.aborted || identity(row) !== state.identity) return denied();
    return row;
  }
  return {
    async open(input: Lease, signal: AbortSignal) {
      if (!input || !signal || signal.aborted) return denied();
      const lease = { assetId: assetUuid(input.assetId), ownerId: assetUuid(input.ownerId), conversationId: assetUuid(input.conversationId), leaseNonce: assetUuid(input.leaseNonce) };
      const row = await transact(tx => check(tx,lease)); if (signal.aborted) return denied();
      const state: State = { lease, signal, closed: false, identity: identity(row) }, capability = Object.freeze({}), scope = { capability };
      capabilities.set(capability,state); scopes.set(scope,state); return scope;
    },
    async authorize(capability: object, signal: AbortSignal) {
      const state = stateOf(capability,signal); return transact(async tx => grant(await verify(tx,state,signal),state.lease));
    },
    async bind(capability: object, input: Metadata, signal: AbortSignal) {
      const state = stateOf(capability,signal), copy = structuredClone(input);
      return transact(async tx => {
        const row = await verify(tx,state,signal), next = validatePayload(copy,row), prior = payload(row);
        if (prior) { if (!isDeepStrictEqual(prior,next)) return conflict(); return grant(row,state.lease); }
        const [updated] = await tx.query<AssetRow>(`UPDATE foxy_visual_assets SET digest=$3,size_bytes=$4,mime_type=$5,width=$6,height=$7,producer_version=$8,title=$9,description=$10,diagram=$11::jsonb,revision=revision+1,last_activity_at=clock_timestamp(),updated_at=clock_timestamp()
          WHERE id=$1::uuid AND lease_nonce=$2::uuid AND state='PROCESSING' AND lease_until>clock_timestamp() AND digest IS NULL RETURNING *`,state.lease.assetId,state.lease.leaseNonce,next.digest,next.sizeBytes,next.mimeType,next.width,next.height,next.producerVersion,next.title,next.description,next.diagram ? JSON.stringify(next.diagram) : null);
        if (!updated || state.closed || signal.aborted) return denied(); return grant(updated,state.lease);
      });
    },
    async complete(capability: object, proof: Proof, signal: AbortSignal) {
      const state = stateOf(capability,signal), copy = structuredClone(proof);
      return transact(async tx => {
        const row = await verify(tx,state,signal), data = payload(row);
        if (!data || !copy || copy.digest !== data.digest || copy.validatedDigest !== data.digest || copy.scannedDigest !== data.digest
          || copy.sizeBytes !== data.sizeBytes || copy.mimeType !== data.mimeType || copy.width !== data.width || copy.height !== data.height) return conflict();
        const [updated] = await tx.query(`UPDATE foxy_visual_assets SET state='READY',charge_bytes=size_bytes,validated_digest=digest,scanned_digest=digest,
          validated_at=clock_timestamp(),scanned_at=clock_timestamp(),lease_nonce=NULL,lease_until=NULL,revision=revision+1,last_activity_at=clock_timestamp(),updated_at=clock_timestamp()
          WHERE id=$1::uuid AND lease_nonce=$2::uuid AND state='PROCESSING' AND lease_until>clock_timestamp() AND digest=$3 RETURNING id`,state.lease.assetId,state.lease.leaseNonce,data.digest);
        if (state.closed || signal.aborted) return denied();
        return !!updated;
      });
    },
    async reject(capability: object, code: 'INVALID_CONTENT' | 'INFECTED', signal: AbortSignal) {
      const state = stateOf(capability,signal); if (code !== 'INVALID_CONTENT' && code !== 'INFECTED') return conflict();
      return transact(async tx => {
        await verify(tx,state,signal);
        const [updated] = await tx.query(`UPDATE foxy_visual_assets SET state='REJECTED',error_code=$3,lease_nonce=NULL,lease_until=NULL,revision=revision+1,last_activity_at=clock_timestamp(),updated_at=clock_timestamp()
          WHERE id=$1::uuid AND lease_nonce=$2::uuid AND state='PROCESSING' AND lease_until>clock_timestamp() RETURNING id`,state.lease.assetId,state.lease.leaseNonce,code);
        if (state.closed || signal.aborted) return denied();
        return !!updated;
      });
    },
    close(scope: object): void { const state = scope && (scopes.get(scope) ?? capabilities.get(scope)); if (state) state.closed = true; },
  };
}
