import type { FoxyAspectRatio, FoxyVisualKind } from './foxy-ai-visual.ts';
export type FoxyPrivateAssetState = 'RESERVED' | 'PROCESSING' | 'READY' | 'REJECTED' | 'DISCARDED';
export interface ReserveFoxyPrivateAsset { requestId: string; conversationRevision: string; kind: FoxyVisualKind; aspectRatio: FoxyAspectRatio }
export interface FoxyPrivateAssetView { id: string; conversationId: string; kind: FoxyVisualKind; aspectRatio: FoxyAspectRatio; state: FoxyPrivateAssetState; revision: string }
