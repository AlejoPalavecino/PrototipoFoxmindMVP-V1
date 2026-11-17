import type { ActivitySummary } from '../../../../../../src/core/contracts/activities.ts';
import type { FileState, Material } from '../../../../../../src/core/contracts/materials.ts';
export interface MaterialMetadata {
    title: string;
    unitId: string | null;
    topicId: string | null;
    body?: string | null;
    description?: string | null;
    activityIds?: string[];
    resourceUse?: Material['resourceUse'];
    contentKind?: Material['contentKind'];
}
export type MaterialChange = ({
    action: 'publish';
    fileId: string;
} & MaterialMetadata) | ({
    action: 'revise';
    id: string;
    fileId: string;
} & MaterialMetadata) | ({
    action: 'edit';
    id: string;
} & Partial<MaterialMetadata>) | ({
    action: 'organize';
    id: string;
} & Partial<MaterialMetadata>) | {
    action: 'delete';
    id: string;
    confirm: true;
};
export interface MaterialLookup {
    /** A supplied collection, including an empty one, avoids a library request. */
    materials?: readonly Material[];
    signal?: AbortSignal;
}
export interface MaterialsOperations {
    list(classroomId: string, signal?: AbortSignal): Promise<Material[]>;
    findMaterial(classroomId: string, materialId: string, lookup?: MaterialLookup): Promise<Material | undefined>;
    listActivities(classroomId: string, signal?: AbortSignal): Promise<ActivitySummary[]>;
    change(classroomId: string, revision: string, operation: MaterialChange, signal?: AbortSignal): Promise<void>;
    upload(classroomId: string, file: File): Promise<FileState>;
    fileStatus(fileId: string, signal?: AbortSignal): Promise<FileState>;
    fileUrl(fileId: string, preview?: boolean): string;
}
