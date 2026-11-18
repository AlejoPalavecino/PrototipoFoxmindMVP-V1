import type { StudyInput, StudyResult, StudyPractice, StudyAnswers, PracticeResult, SourceRef, planExam, generateDevelopmentFeedback } from '../../../../../../src/core/domain/study/engine.ts';
import type { FolderFields } from '../../../../../../src/core/domain/study/folders.ts';
export interface StudySource {
    kind?: 'PLAN' | 'MATERIAL';
    extension?: string;
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
    conversationId?: string;
    fromChatCopy?: boolean;
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
export type StudyPlanOrigin = { classroomId: string; classroomRevision: string };
export interface StudyFolder extends FolderFields {
    planOrigin?: StudyPlanOrigin;
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
function projectFields<T extends Pick<FolderFields, 'subject' | 'wizardStep'>>(fields: T, draft: boolean) {
    const { wizardStep, ...rest } = fields;
    return { ...rest, subject: fields.subject ?? '', ...(draft ? { wizardStep: wizardStep ?? 0 } : {}) };
}
export function projectFolderSummary(r: StudySummaryRow): StudyFolderSummary {
    return {id:r.id,ownerId:r.owner_id,status:r.status,revision:String(r.revision),...projectFields(r.fields, r.status === 'DRAFT'),
        createdAt:r.created_at.toISOString(),updatedAt:r.updated_at.toISOString()};
}
export interface StudyPreferences {
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    questionCount: number;
    topicIds: string[];
    lastTool: 'NOTE' | 'OUTLINE' | 'QUIZ' | 'EXERCISE' | 'MOCK_EXAM';
}
export const STUDY_GENERATION_PENDING_MS = 600000;
export interface StudyGenerationIntent {
    requestId: string;
    kind: StudyPreferences['lastTool'];
    topicIds: string[];
    sourceIds?: string[];
    questionCount: number;
    difficulty: StudyPreferences['difficulty'];
}
export interface StudyGenerationView extends StudyGenerationIntent {
    status: 'PENDING' | 'COMPLETE' | 'FAILED' | 'CANCELLED' | 'INSUFFICIENT';
    reason?: 'INTERRUPTED';
    missingInformation?: string[];
}
export type StoredStudyPractice = {
    id: string; kind: string; title: string; version: number; status: string;
    sourceRefs: SourceRef[]; privatePractice: StudyPractice; answers: StudyAnswers;
    conversationId?: string; previousPracticeId?: string; attemptNumber?: number;
    result?: PracticeResult; feedback?: Awaited<ReturnType<typeof generateDevelopmentFeedback>> | { status: 'PENDING' };
    finalizedAt?: string;
};
export type StudyFeedbackInput = { practice: StudyPractice; answers: StudyAnswers; sources: StudySource[]; history?: StudyInput['history'] };
export type StudyFeedbackResult = Awaited<ReturnType<typeof generateDevelopmentFeedback>>;
/** Known fields of persisted v1 records; optional turn IDs preserve earlier valid history. */
export type StoredStudyTurn = { id?: string; role: string; text?: string; sourceRefs?: SourceRef[];
    attachmentIds?: string[]; generation?: StudyGenerationIntent; generationRequestId?: string; creationId?: string; practiceId?: string };
export type StoredStudyConversation = { id: string; title: string; turns: StoredStudyTurn[] };
export type StoredStudyCreation = { id: string; kind: string; title: string; markdown: string; sourceRefs: SourceRef[]; revision: number; conversationId?: string };
export type StudyReviewSession = ReturnType<typeof planExam>['sessions'][number] & {
    reminderMinutes?: number | null;
    activity?: string;
};
export type StoredStudyExam = { id: string; title: string; examAt: string; timeZone: string; sessions: StudyReviewSession[]; warnings: string[]; conflicts?: StudyAgendaConflict[] };
export interface StudyState {
    version: 1;
    fields: FolderFields;
    planOrigin?: StudyPlanOrigin;
    materials: StudyMaterial[];
    conversations: StoredStudyConversation[];
    creations: StoredStudyCreation[];
    practices: StoredStudyPractice[];
    exams: StoredStudyExam[];
    memory: Record<string, unknown> & {preferences?: StudyPreferences};
    receipts: Record<string, {
        hash: string;
        result: unknown;
        pendingAt?: string;
    }>;
}
export type StudyReviewWindow = { id:string; startAt:string; endAt:string };
export type StudyAgendaConflict = { sessionId:string; occurrenceId:string; title:string };
export interface FolderRow {
    id: string;
    owner_id: string;
    status: StudyFolder['status'];
    revision: bigint;
    state: StudyState;
    created_at: Date;
    updated_at: Date;
}
export function projectFolder(r: FolderRow): StudyFolder { return { id: r.id, ownerId: r.owner_id, status: r.status, revision: String(r.revision), ...projectFields(r.state.fields, r.status === 'DRAFT'), ...(r.state.planOrigin ? { planOrigin: r.state.planOrigin } : {}), materials: r.state.materials, createdAt: r.created_at.toISOString(), updatedAt: r.updated_at.toISOString() }; }
