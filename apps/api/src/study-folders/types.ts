import type { FolderFields } from '../../../../src/core/domain/study-folders.ts';
export interface StudyQuery {
    query<T = Record<string, unknown>>(sql: string, ...values: unknown[]): Promise<T[]>;
}
export interface StudyDatabase {
    $transaction<T>(operation: (raw: {
        $queryRawUnsafe<T = unknown>(sql: string, ...values: unknown[]): Promise<T>;
    }) => Promise<T>, options?: { maxWait: number; timeout: number }): Promise<T>;
}
export type StudyAuthentication = (tx: StudyQuery, request: unknown, write: boolean) => Promise<string>;
export interface StudySource {
    kind?: 'PLAN' | 'MATERIAL';
    readable?: boolean;
    id: string;
    version: string;
    title: string;
    origin: 'OWN' | 'CLASSROOM';
    fileId: string;
    text: string;
    available: boolean;
    ownerId?: string;
    folderId?: string;
    classroomId?: string;
    document?: {
        kind: 'pdf';
        bytes: Uint8Array;
    } | {
        kind: 'text';
        text: string;
    };
}
export interface StudyMaterial {
    id: string;
    fileId: string;
    title: string;
    topicIds: string[];
}
export interface StudyFolder extends FolderFields {
    id: string;
    ownerId: string;
    status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'DELETED';
    revision: string;
    materials: StudyMaterial[];
    createdAt: string;
    updatedAt: string;
}
export type StudyFolderSummary = Omit<StudyFolder, 'units' | 'materials'>;
export type StudySummaryRow = Omit<FolderRow, 'state'> & {fields: Omit<FolderFields, 'units'>};
export function projectFolderSummary(r: StudySummaryRow): StudyFolderSummary {
    return {id:r.id,ownerId:r.owner_id,status:r.status,revision:String(r.revision),...r.fields,
        createdAt:r.created_at.toISOString(),updatedAt:r.updated_at.toISOString()};
}
export interface StudyPreferences {
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    questionCount: number;
    topicIds: string[];
    lastTool: 'NOTE' | 'OUTLINE' | 'QUIZ' | 'EXERCISE' | 'MOCK_EXAM';
}
export interface StudyState {
    version: 1;
    fields: FolderFields;
    materials: StudyMaterial[];
    conversations: Record<string, unknown>[];
    creations: Record<string, unknown>[];
    practices: Record<string, unknown>[];
    exams: Record<string, unknown>[];
    memory: Record<string, unknown> & {preferences?: StudyPreferences};
    receipts: Record<string, {
        hash: string;
        result: unknown;
        pendingAt?: string;
    }>;
}
export interface StudyOptions {
    database: StudyDatabase;
    authenticate: StudyAuthentication;
    files?: {
        assertOwn(tx: StudyQuery, ownerId: string, folderId: string, fileId: string, purpose: 'plan' | 'material'): Promise<void>;
        readText?(tx: StudyQuery, source: StudySource): Promise<string>;
        readSource?(tx: StudyQuery, source: StudySource): Promise<{
            text: string;
            document?: StudySource['document'];
        }>;
    };
    agenda?: {
        confirm(tx: StudyQuery, ownerId: string, folderId: string, exam: unknown, sessions: unknown[], requestId: string): Promise<unknown>;
        cancel(tx: StudyQuery, ownerId: string, folderId: string): Promise<void>;
    };
    generate?: (input: unknown, context?: {
        ownerId: string;
        requestId: string;
        authorize?: () => Promise<void>;
    }) => Promise<unknown>;
    feedback?: (input: {
        practice: unknown;
        answers: unknown;
        sources: StudySource[];
    }, context?: {
        ownerId: string;
        requestId: string;
        authorize?: () => Promise<void>;
    }) => Promise<unknown>;
}
export interface FolderRow {
    id: string;
    owner_id: string;
    status: StudyFolder['status'];
    revision: bigint;
    state: StudyState;
    created_at: Date;
    updated_at: Date;
}
export function projectFolder(r: FolderRow): StudyFolder { return { id: r.id, ownerId: r.owner_id, status: r.status, revision: String(r.revision), ...r.state.fields, materials: r.state.materials, createdAt: r.created_at.toISOString(), updatedAt: r.updated_at.toISOString() }; }
