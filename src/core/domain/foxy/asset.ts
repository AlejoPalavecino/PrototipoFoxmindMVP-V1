import type { FoxyAspectRatio, FoxyVisualKind, FoxyDiagram } from './visual.ts';
export type FoxyPrivateAssetState = 'RESERVED' | 'PROCESSING' | 'READY' | 'REJECTED' | 'DISCARDED';
export interface ReserveFoxyPrivateAsset { requestId: string; conversationRevision: string; kind: FoxyVisualKind; aspectRatio: FoxyAspectRatio }
export interface FoxyPrivateAssetView { id: string; conversationId: string; kind: FoxyVisualKind; aspectRatio: FoxyAspectRatio; state: FoxyPrivateAssetState; revision: string }
export interface DiscardFoxyPrivateAsset { requestId: string; assetRevision: string; confirm: true }
export interface FoxyPrivateAssetDiscardReceipt { assetId: string; action: 'DISCARD'; assetRevision: string }
export type FoxyPrivateAssetMime = 'image/png' | 'image/jpeg';
export type FoxyPrivateAssetProducer = 'foxy-diagram-png-v1' | 'foxy-image-original-v1';
export interface FoxyPrivateAssetPayloadView {
  title: string; description: string; mimeType: FoxyPrivateAssetMime; sizeBytes: string; width: number; height: number;
  producerVersion: FoxyPrivateAssetProducer; diagram: FoxyDiagram | null;
}
export interface FoxyPrivateAssetInspection {
  asset: FoxyPrivateAssetView; payload: FoxyPrivateAssetPayloadView | null; canPreview: boolean; canDiscard: boolean;
  cleanupState: 'NOT_REQUESTED' | 'PENDING' | 'DONE';
}
/** Internal authorization descriptor; never return this object in an HTTP response. */
export interface FoxyPrivateAssetReadDescriptor {
  assetId: string; ownerId: string; conversationId: string; sourceClassroomId: string | null; assetRevision: string;
  kind: FoxyVisualKind; aspectRatio: FoxyAspectRatio; storageKey: string; digest: string; sizeBytes: number;
  mimeType: FoxyPrivateAssetMime; width: number; height: number; producerVersion: FoxyPrivateAssetProducer;
}
