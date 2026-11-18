import type { FoxyGroundingSnapshot, FoxyGroundingFile } from '../../../../../../src/core/domain/foxy/grounding.ts';
import type { EditFoxyResource, FoxyAnswer, FoxyPublicationManagement, FoxyPublicationState, FoxyVisualPublicationSummary, PrepareFoxyVisualPublication } from '../../../../../../src/core/domain/foxy/resource.ts';
import type { EditFoxyPrivateAsset, FoxyPrivateAssetEditReceipt, DiscardFoxyPrivateAsset, FoxyPrivateAssetDiscardReceipt, FoxyPrivateAssetInspection, FoxyPrivateAssetReadDescriptor } from '../../../../../../src/core/domain/foxy/asset.ts';
import type { CreateFoxyConversation, FoxyContext, SendFoxyMessage } from '../../../../../../src/core/domain/foxy/foxy-ai.ts';
import type { SqlTransaction } from '../../../../../../src/core/contracts/sql.ts';
import type { CreationKind, CreationStatus, CreationPageOptions } from '../domain/catalog-input.ts';
export interface FoxyActor {
    id: string;
    accountRole: 'teacher';
    now: Date;
}
export interface FoxyUnitOfWork {
    run<T>(request: unknown, write: boolean, operation: (tx: SqlTransaction, actor: FoxyActor) => Promise<T>): Promise<T>;
}
export interface FoxyDigest {
    (text: string): string;
}
export type FoxyConversation = {
    id: string;
    title: string;
    context: FoxyContext;
    revision: string;
};
export type FoxyCreationDestination = {
    kind: 'MATERIAL' | 'ACTIVITY';
    classroomId: string;
    classroomName: string;
    id: string | null;
    state: Exclude<CreationStatus, 'PRIVATE'>;
};
export type FoxyCreation = {
    id: string;
    kind: CreationKind;
    title: string;
    context: FoxyContext;
    conversationId: string;
    turnId: string | null;
    visualJobId: string | null;
    assetId: string | null;
    createdAt: string;
    status: CreationStatus;
    destinations: FoxyCreationDestination[];
};
type Metadata = {
    model: string;
    promptVersion?: string;
    schemaVersion: string;
};
type Page = {
    afterSequence: number;
    limit: number;
};
type Citation = {
    sourceId: string;
    documentKey: string | null;
    page: number | null;
};
export interface FoxyConversationRepositoryPort {
    create(tx: SqlTransaction, owner: string, input: CreateFoxyConversation, hash: string): Promise<{
        created: boolean;
        conversation: FoxyConversation;
    }>;
    get(tx: SqlTransaction, owner: string, id: string): Promise<FoxyConversation | null>;
    list(tx: SqlTransaction, owner: string, options: {
        limit: number;
    }): Promise<FoxyConversation[]>;
    listPage(tx: SqlTransaction, owner: string, options: {
        limit: number;
        after: {
            updatedAt: string;
            id: string;
        } | null;
        q?: string | undefined;
        context?: string | undefined;
    }): Promise<{
        items: FoxyConversation[];
        next: {
            updatedAt: string;
            id: string;
        } | null;
    }>;
    rename(tx: SqlTransaction, owner: string, id: string, revision: string, title: string): Promise<void>;
    remove(tx: SqlTransaction, owner: string, id: string, revision: string): Promise<void>;
}
export interface FoxyTurnRepositoryPort {
    cancel(tx: SqlTransaction, owner: string, conversationId: string, turnId: string): ReturnType<FoxyTurnRepositoryPort['get']>;
    replay(tx: SqlTransaction, owner: string, conversationId: string, requestId: string, hash: string): Promise<{
        created: boolean;
        turn: {
            id: string;
            sequence: number;
            state: string;
        };
        conversationRevision: string;
    } | null>;
    enqueue(tx: SqlTransaction, owner: string, conversationId: string, input: SendFoxyMessage, snapshot: FoxyGroundingSnapshot, hash: string, metadata: Metadata): Promise<{
        created: boolean;
        turn: {
            id: string;
            sequence: number;
            state: string;
        };
        conversationRevision: string;
    }>;
    get(tx: SqlTransaction, owner: string, conversationId: string, turnId: string): Promise<{
        classroomSources?: { revision: string; used: {sourceId:string;title:string}[]; excluded: {sourceId:string;title:string;reason:string}[] };
        id: string;
        sequence: number;
        state: string;
        purpose: string;
        message: string;
        answer: FoxyAnswer | null;
        errorCode: string | null;
        createdAt: string;
        citations: Citation[];
    } | null>;
    list(tx: SqlTransaction, owner: string, conversationId: string, page: Page): Promise<{
        classroomSources?: { revision: string; used: {sourceId:string;title:string}[]; excluded: {sourceId:string;title:string;reason:string}[] };
        id: string;
        sequence: number;
        state: string;
        purpose: string;
        message: string;
        answer: FoxyAnswer | null;
        errorCode: string | null;
        createdAt: string;
        citations: Citation[];
    }[]>;
}
export interface FoxyCreationRepositoryPort {
    listPage(tx: SqlTransaction, owner: string, input: CreationPageOptions): Promise<{
        items: FoxyCreation[];
        next: {
            createdAt: string;
            id: string;
        } | null;
    }>;
}
export interface FoxyPrivateAssetEditorialRepositoryPort {
    edit(tx: SqlTransaction, ownerId: string, assetId: string, command: EditFoxyPrivateAsset): Promise<FoxyPrivateAssetEditReceipt>;
}
export interface FoxyPrivateAssetDiscardRepositoryPort {
    discard(tx: SqlTransaction, ownerId: string, assetId: string, command: DiscardFoxyPrivateAsset): Promise<FoxyPrivateAssetDiscardReceipt>;
}
export interface FoxyPrivateAssetReadRepositoryPort {
    inspect(tx: SqlTransaction, ownerId: string, assetId: string): Promise<FoxyPrivateAssetInspection>;
    describe(tx: SqlTransaction, ownerId: string, assetId: string): Promise<FoxyPrivateAssetReadDescriptor>;
}
export interface FoxyPublicationManagementRepositoryPort {
    inspect: (tx: SqlTransaction, owner: string, publicationId: string) => Promise<FoxyPublicationManagement>;
    retry: (tx: SqlTransaction, actorId: string, publicationId: string, input: unknown) => Promise<{
        publicationId: string;
        action: "RETRY";
        publicationRevision: string;
    }>;
    discard(tx: SqlTransaction, actorId: string, publicationId: string, input: unknown): Promise<{
        publicationId: string;
        action: "DISCARD";
        publicationRevision: string;
    }>;
}
export interface FoxyPublicationRepositoryPort {
    get(tx: SqlTransaction, owner: string, publicationId: string): Promise<{
        id: string;
        resourceId: string;
        resourceRevision: string;
        classroomId: string;
        unitId: string | null;
        topicId: string | null;
        title: string;
        state: FoxyPublicationState;
        revision: string;
    } | null>;
    list(tx: SqlTransaction, owner: string, resourceId: string, page: {
        limit: number;
        afterId: string | null;
    }): Promise<{
        items: {
            id: string;
            resourceId: string;
            resourceRevision: string;
            classroomId: string;
            unitId: string | null;
            topicId: string | null;
            title: string;
            state: FoxyPublicationState;
            revision: string;
        }[];
        nextAfterId: string | null;
    }>;
    inspect(tx: SqlTransaction, owner: string, publicationId: string): Promise<{
        publication: FoxyVisualPublicationSummary;
        editorialSnapshot?: { title: string; description: string | null; revision: string | null };
        classroomRevision: string;
        classroomArchived: boolean;
        errorCode: string | null;
    } | {
        publication: {
            id: string;
            resourceId: string;
            resourceRevision: string;
            classroomId: string;
            unitId: string | null;
            topicId: string | null;
            title: string;
            state: FoxyPublicationState;
            revision: string;
        };
        classroomRevision: string;
        classroomArchived: boolean;
        errorCode: string | null;
    }>;
    prepare(tx: SqlTransaction, owner: string, resourceId: string, input: unknown): Promise<{
        created: boolean;
        publication: {
            id: string;
            resourceId: string;
            resourceRevision: string;
            classroomId: string;
            unitId: string | null;
            topicId: string | null;
            title: string;
            state: FoxyPublicationState;
            revision: string;
        };
    }>;
}
export interface FoxyPublicationConfirmationRepositoryPort {
    confirm(tx: SqlTransaction, request: unknown, actorId: string, publicationId: string, input: unknown): Promise<{
        publicationId: string;
        materialId: string;
        publicationRevision: string;
        classroomRevision: string;
    }>;
}
export interface FoxyVisualPublicationRepositoryPort {
    prepare(tx: SqlTransaction, ownerId: string, assetId: string, input: PrepareFoxyVisualPublication): Promise<{
        created: boolean;
        publication: FoxyVisualPublicationSummary;
    }>;
    list(tx: SqlTransaction, ownerId: string, assetId: string, page: {
        limit: number;
        afterId: string | null;
    }): Promise<{
        items: FoxyVisualPublicationSummary[];
        nextAfterId: string | null;
    }>;
}
export interface FoxyResourceRepositoryPort {
    get(tx: SqlTransaction, owner: string, id: string): Promise<{
        id: string;
        conversationId: string;
        sourceTurnId: string;
        title: string;
        markdown: string;
        revision: string;
    } | null>;
    fromTurn(tx: SqlTransaction, owner: string, conversationId: string, turnId: string): Promise<{
        created: boolean;
        resource: {
            id: string;
            conversationId: string;
            sourceTurnId: string;
            title: string;
            markdown: string;
            revision: string;
        };
    }>;
    edit(tx: SqlTransaction, owner: string, id: string, input: EditFoxyResource): Promise<{
        edited: boolean;
        resource: {
            id: string;
            conversationId: string;
            sourceTurnId: string;
            title: string;
            markdown: string;
            revision: string;
        };
    }>;
}


import type { StartFoxyVisual, FoxyVisualKind, FoxyAspectRatio } from '../../../../../../src/core/domain/foxy/visual.ts';
import type { VisualProfile } from '../domain/visual-profile.ts';
type PrivateVisualJob = {
    id: string; conversationId: string; prompt: string; kind: FoxyVisualKind; aspectRatio: FoxyAspectRatio;
    state: string; assetId: string; errorCode: string | null; createdAt: string;
};
type VisualJobReceipt = { created: boolean; job: PrivateVisualJob; conversationRevision: string };
export interface FoxyVisualRepositoryPort {
    cancel(tx: SqlTransaction, owner: string, conversationId: string, jobId: string): Promise<PrivateVisualJob | null>;
    replay(tx: SqlTransaction, owner: string, conversationId: string, input: StartFoxyVisual): Promise<VisualJobReceipt | null>;
    enqueue(tx: SqlTransaction, owner: string, conversationId: string, input: StartFoxyVisual, snapshot: FoxyGroundingSnapshot,
        profile: VisualProfile, quota: bigint): Promise<VisualJobReceipt>;
    get(tx: SqlTransaction, owner: string, conversationId: string, jobId: string): Promise<PrivateVisualJob | null>;
    list(tx: SqlTransaction, owner: string, conversationId: string, page: { limit: number; afterId: string | null }):
        Promise<{ items: PrivateVisualJob[]; nextAfterId: string | null }>;
}
