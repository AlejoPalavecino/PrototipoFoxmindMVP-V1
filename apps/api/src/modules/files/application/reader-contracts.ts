import type { FoxyGroundingFile, FoxyParsedDocument } from '../../../../../../src/core/domain/foxy/grounding.ts';
import type { FoxyDiagram, FoxyPublicationArtifact, FoxyRasterPublicationArtifact } from '../../../../../../src/core/domain/index.ts';
import type { FileTransaction } from './contracts.ts';
import type { FileView } from '../domain/file-view.ts';

export interface FoxyDocumentGrant { ownerId: string; classroomId: string; file: FoxyGroundingFile }
export type AuthorizeDocument = (capability: object, signal: AbortSignal, tx?: FileTransaction) => Promise<FoxyDocumentGrant>;
export interface FoxyDocumentReader { read(capability: object, signal: AbortSignal): Promise<FoxyParsedDocument> }
export interface PrivateImageFacts { mimeType: 'image/png' | 'image/jpeg'; width: number; height: number; sizeBytes: number; digest: string }
export interface PrivateImageInspector { inspect(bytes: Uint8Array, signal: AbortSignal): Promise<PrivateImageFacts> }
export interface FoxyPrivateAssetPayload {
  bytes: Uint8Array; title: string; description: string;
  producerVersion: 'foxy-diagram-png-v1' | 'foxy-image-original-v1'; diagram: FoxyDiagram | null;
}
export type RenewPrivateAsset = (lease: { assetId: string; ownerId: string; conversationId: string; leaseNonce: string }) => Promise<boolean>;
export interface FoxyPrivateAssetFiles {
  receive(capability: object, payload: FoxyPrivateAssetPayload, signal: AbortSignal): Promise<PrivateImageFacts>;
  recover(capability: object, signal: AbortSignal): Promise<PrivateImageFacts>;
  close(): Promise<void>;
}
export interface FoxyPublicationFiles {
  ensureFile(capability: object, artifact: FoxyPublicationArtifact, signal: AbortSignal): Promise<{ fileId: string; created: boolean } | null>;
  receive(capability: object, bytes: Uint8Array, signal: AbortSignal): Promise<FileView>;
  inspect(capability: object, signal: AbortSignal): Promise<'READY' | 'UNAVAILABLE' | 'BUSY' | 'RECEIVABLE'>;
  proof(capability: object, signal: AbortSignal): Promise<{ fileId: string; digest: string; sizeBytes: number }>;
}
export interface FoxyPublicationRasterSource {
  read(capability: object, signal: AbortSignal): Promise<{ bytes: Uint8Array; artifact: FoxyRasterPublicationArtifact }>;
}
