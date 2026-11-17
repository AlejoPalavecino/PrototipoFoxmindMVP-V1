import type { FoxyVisualKind, FoxyAspectRatio, FoxyDiagram } from '../../../../../../src/core/domain/foxy/visual.ts';
import type { FoxyPrivateAssetReadDescriptor } from '../../../../../../src/core/domain/foxy/asset.ts';
import type { FoxyPublicationArtifact } from '../../../../../../src/core/domain/foxy/resource.ts';
import type { SqlTransaction } from '../../../../../../src/core/contracts/sql.ts';
export type FoxyPrivateAssetLease = {
    assetId: string;
    ownerId: string;
    conversationId: string;
    leaseNonce: string;
};
export type FoxyPrivateAssetMetadata = {
    digest: string;
    sizeBytes: number;
    mimeType: 'image/png' | 'image/jpeg';
    width: number;
    height: number;
    producerVersion: 'foxy-diagram-png-v1' | 'foxy-image-original-v1';
    title: string;
    description: string;
    diagram: FoxyDiagram | null;
};
export type FoxyPrivateAssetProof = {
    digest: string;
    sizeBytes: number;
    mimeType: string;
    width: number;
    height: number;
    validatedDigest: string;
    scannedDigest: string;
};
export type FoxyPublicationLease = {
    publicationId: string;
    ownerId: string;
    classroomId: string;
    leaseNonce: string;
};
export interface FoxyPrivateAssetAuthorityPort {
    open(input: FoxyPrivateAssetLease, signal: AbortSignal): Promise<{
        capability: Readonly<{}>;
    }>;
    authorize(capability: object, signal: AbortSignal): Promise<{
        kind: FoxyVisualKind;
        aspectRatio: FoxyAspectRatio;
        storageKey: string;
        reservedBytes: bigint;
        payload: FoxyPrivateAssetMetadata | null;
        assetId: string;
        ownerId: string;
        conversationId: string;
        leaseNonce: string;
    }>;
    bind(capability: object, input: FoxyPrivateAssetMetadata, signal: AbortSignal): Promise<{
        kind: FoxyVisualKind;
        aspectRatio: FoxyAspectRatio;
        storageKey: string;
        reservedBytes: bigint;
        payload: FoxyPrivateAssetMetadata | null;
        assetId: string;
        ownerId: string;
        conversationId: string;
        leaseNonce: string;
    }>;
    complete(capability: object, proof: FoxyPrivateAssetProof, signal: AbortSignal): Promise<boolean>;
    reject(capability: object, code: "INVALID_CONTENT" | "INFECTED", signal: AbortSignal): Promise<boolean>;
    close(scope: object): void;
}
export interface FoxyPublicationAuthorityPort {
    open(lease: FoxyPublicationLease, signal: AbortSignal): Promise<{
        capability: Readonly<{}>;
        snapshot: {
            title: string;
            markdown: string;
        } | {
            kind: "VISUAL";
            assetId: string;
            assetRevision: string;
            digest: string;
            sizeBytes: number;
            mimeType: "image/png" | "image/jpeg";
            width: number;
            height: number;
            producerVersion: "foxy-diagram-png-v1" | "foxy-image-original-v1";
        };
    }>;
    authorize(capability: object, signal: AbortSignal, tx?: SqlTransaction | undefined): Promise<{
        snapshot: {
            title: string;
            markdown: string;
        } | {
            kind: "VISUAL";
            assetId: string;
            assetRevision: string;
            digest: string;
            sizeBytes: number;
            mimeType: "image/png" | "image/jpeg";
            width: number;
            height: number;
            producerVersion: "foxy-diagram-png-v1" | "foxy-image-original-v1";
        };
        publicationId: string;
        ownerId: string;
        classroomId: string;
        leaseNonce: string;
    }>;
    authorizeVisualSource(capability: object, signal: AbortSignal, tx?: SqlTransaction | undefined): Promise<{
        asset: FoxyPrivateAssetReadDescriptor;
        publicationId: string;
        ownerId: string;
        classroomId: string;
        leaseNonce: string;
    }>;
    existingFile(capability: object, signal: AbortSignal, tx?: SqlTransaction | undefined): Promise<{
        capability: Readonly<{}>;
        descriptor: {
            fileId: string;
            digest: string;
            sizeBytes: number;
            pageCount: number;
            rendererVersion: string;
        } | {
            fileId: string;
            kind: "RASTER";
            digest: string;
            sizeBytes: number;
            mimeType: "image/png" | "image/jpeg";
            extension: "png" | "jpg";
            width: number;
            height: number;
            producerVersion: "foxy-diagram-png-v1" | "foxy-image-original-v1";
        };
    } | null>;
    createFileCapability(capability: object, signal: AbortSignal, tx?: SqlTransaction | undefined): Promise<{
        capability: Readonly<{}>;
        descriptor: {
            fileId: string;
            digest: string;
            sizeBytes: number;
            pageCount: number;
            rendererVersion: string;
        } | {
            fileId: string;
            kind: "RASTER";
            digest: string;
            sizeBytes: number;
            mimeType: "image/png" | "image/jpeg";
            extension: "png" | "jpg";
            width: number;
            height: number;
            producerVersion: "foxy-diagram-png-v1" | "foxy-image-original-v1";
        };
    }>;
    authorizeFile(capability: object, signal: AbortSignal, tx?: SqlTransaction | undefined): Promise<{
        fileId: string;
        digest: string;
        sizeBytes: number;
        pageCount: number;
        rendererVersion: string;
        publicationId: string;
        ownerId: string;
        classroomId: string;
        leaseNonce: string;
    } | {
        fileId: string;
        kind: "RASTER";
        digest: string;
        sizeBytes: number;
        mimeType: "image/png" | "image/jpeg";
        extension: "png" | "jpg";
        width: number;
        height: number;
        producerVersion: "foxy-diagram-png-v1" | "foxy-image-original-v1";
        publicationId: string;
        ownerId: string;
        classroomId: string;
        leaseNonce: string;
    }>;
    close(scope: object): void;
}
export interface FoxyPublicationFileAllocatorPort {
    ensureFile: (request: unknown, lease: FoxyPublicationLease, artifact: FoxyPublicationArtifact, signal: AbortSignal) => Promise<{
        fileId: string;
        created: boolean;
    } | null>;
}
