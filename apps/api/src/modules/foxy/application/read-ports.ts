import type { FoxyContext, FoxySourceKind } from '../../../../../../src/core/domain/index.ts';
type Catalogue = {
    context: FoxyContext;
    units: {
        id: string;
        name: string;
        position: number;
        topics: {
            id: string;
            name: string;
            position: number;
            status: 'PENDING' | 'NEXT' | 'TAUGHT';
        }[];
    }[];
    classroomRevision: string | null;
    classroomTitle: string | null;
    archived: boolean;
    canGenerate: boolean;
};
export interface FoxyCatalogQueries {
    curriculum: (request: unknown, conversationId: string) => Promise<Catalogue>;
    sources: (request: unknown, conversationId: string, input: unknown) => Promise<{
        context: {
            kind: "GENERAL";
        };
        items: never[];
        next: null;
    } | {
        items: {
            kind: "ACTIVITY";
            sourceId: string;
            title: string;
            unitId: string | null;
            topicIds: string[];
            createdAt: string;
            publishedAt: string | null;
            documentCount: number;
            extension: null;
            sizeBytes: null;
            planVersion: null;
            currentPlan: null;
            available: boolean;
            reason: string | null;
        }[];
        next: {
            id: string;
            createdAt: string;
        } | null;
        context: {
            kind: "CLASSROOM";
            classroomId: string;
        };
    } | {
        items: {
            kind: FoxySourceKind;
            sourceId: string;
            title: string;
            extension: string | null;
            sizeBytes: string | null;
            unitId: string | null;
            topicIds: string[];
            planVersion: number | null;
            currentPlan: boolean | null;
            createdAt: string;
            publishedAt: null;
            documentCount: number;
            available: boolean;
            reason: string | null;
        }[];
        next: {
            id: string;
            createdAt: string;
        } | null;
        context: {
            kind: "CLASSROOM";
            classroomId: string;
        };
    }>;
}
export interface FoxyBinaryReader {
    readFile(request: unknown, id: string, mode: 'preview' | 'download', signal?: AbortSignal): Promise<{
        bytes: Uint8Array;
        headers: Record<string, string>;
    }>;
}
