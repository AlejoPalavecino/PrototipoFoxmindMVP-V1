import type { StudyInput, StudyResult, StudyPractice, StudyAnswers, generateDevelopmentFeedback } from '../../../../../../src/core/domain/study/engine.ts';
import type { StudySource, StudyReviewWindow, StudyAgendaConflict } from '../domain/state.ts';
export { STUDY_GENERATION_PENDING_MS, projectFolder, projectFolderSummary } from '../domain/state.ts';
export type { StudySource, StudyMaterial, StudyPlanOrigin, StudyFolder, StudyFolderSummary, StudySummaryRow, StudyPreferences, StudyGenerationIntent, StudyGenerationView, StoredStudyPractice, StudyFeedbackInput, StudyFeedbackResult, StudyState, StudyReviewWindow, StudyAgendaConflict, FolderRow } from '../domain/state.ts';
export interface StudyQuery {
    query<T = Record<string, unknown>>(sql: string, ...values: unknown[]): Promise<T[]>;
}
export interface StudyDatabase {
    $transaction<T>(operation: (raw: {
        $queryRawUnsafe<T = unknown>(sql: string, ...values: unknown[]): Promise<T>;
    }) => Promise<T>, options?: { maxWait: number; timeout: number }): Promise<T>;
}
export type StudyAuthentication = (tx: StudyQuery, request: unknown, write: boolean) => Promise<string>;
export interface StudyOptions {
    database: StudyDatabase;
    authenticate: StudyAuthentication;
    files?: {
        prepareRead?(tx: StudyQuery, source: StudySource, docxPreview?: boolean): Promise<StudyDocumentRead>;
        assertOwn(tx: StudyQuery, ownerId: string, folderId: string, fileId: string, purpose: 'plan' | 'material'): Promise<void>;
        readText?(tx: StudyQuery, source: StudySource): Promise<string>;
        previewDocx?(tx: StudyQuery, source: StudySource): Promise<string>;
        chatSources?(tx: StudyQuery, ownerId: string, folderId: string, conversationId?: string): Promise<StudySource[]>;
        readSource?(tx: StudyQuery, source: StudySource): Promise<{
            text: string;
            document?: StudySource['document'];
        }>;
    };
    agenda?: {
        conflicts?(tx: StudyQuery, ownerId: string, timeZone: string, sessions: StudyReviewWindow[]): Promise<StudyAgendaConflict[]>;
        confirm(tx: StudyQuery, ownerId: string, folderId: string, exam: unknown, sessions: unknown[], requestId: string): Promise<unknown>;
        cancel(tx: StudyQuery, ownerId: string, folderId: string): Promise<void>;
    };
    generate?: (input: StudyInput, context?: {
        ownerId: string;
        requestId: string;
        authorize?: () => Promise<void>;
    }) => Promise<StudyResult>;
    feedback?: (input: {
        practice: StudyPractice;
        answers: StudyAnswers;
        sources: StudySource[];
    }, context?: {
        ownerId: string;
        requestId: string;
        authorize?: () => Promise<void>;
    }) => Promise<Awaited<ReturnType<typeof generateDevelopmentFeedback>>>;
}
export interface StudyDocumentRead {
    version: string;
    load(): Promise<{ text: string; document?: StudySource['document'] }>;
}
