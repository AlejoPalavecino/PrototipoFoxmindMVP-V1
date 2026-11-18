import type { StudyInput, StudyResult } from '../../../../../../src/core/domain/study/engine.ts';
import type { AiBudgetRejectionCode, AiMonthlyQuotaRejection } from '../../../../../../src/core/contracts/ai-quota.ts';
import type { StudyFeedbackInput, StudyFeedbackResult, StudyGenerationIntent, StudySource, StudyReviewWindow, StudyAgendaConflict } from '../domain/state.ts';
export { STUDY_GENERATION_PENDING_MS, projectFolder, projectFolderSummary } from '../domain/state.ts';
export type { StudySource, StudyMaterial, StudyPlanOrigin, StudyFolder, StudyFolderSummary, StudySummaryRow, StudyPreferences, StudyGenerationIntent, StoredStudyPractice, StudyFeedbackInput, StudyFeedbackResult, StudyState, StudyReviewWindow, StudyAgendaConflict, FolderRow } from '../domain/state.ts';
export interface StudyGenerationView extends StudyGenerationIntent {
    status: 'PENDING' | 'COMPLETE' | 'FAILED' | 'CANCELLED' | 'INSUFFICIENT';
    reason?: 'INTERRUPTED';
    errorCode?: AiBudgetRejectionCode;
    quota?: AiMonthlyQuotaRejection;
    missingInformation?: string[];
}
export interface StudyQuery {
    query<T = Record<string, unknown>>(sql: string, ...values: unknown[]): Promise<T[]>;
}
export interface StudyDatabase {
    $transaction<T>(operation: (raw: {
        $queryRawUnsafe<T = unknown>(sql: string, ...values: unknown[]): Promise<T>;
    }) => Promise<T>, options?: { maxWait: number; timeout: number }): Promise<T>;
}
export type StudyAuthentication = (tx: StudyQuery, request: unknown, write: boolean) => Promise<string>;
export type StudyImageRaster = { mimeType: 'image/png' | 'image/jpeg'; bytes: Uint8Array };
export interface StudyImages {
    generate?(input: { message: string }, context: { ownerId: string; requestId: string; folderId: string; authorize?: () => Promise<void> }): Promise<StudyImageRaster>;
    store(tx: StudyQuery, ownerId: string, folderId: string, id: string, raster: StudyImageRaster): Promise<void>;
    read(tx: StudyQuery, ownerId: string, folderId: string, id: string): Promise<StudyImageRaster | undefined>;
}
export interface StudyOptions {
    database: StudyDatabase;
    authenticate: StudyAuthentication;
    images?: StudyImages;
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
    feedback?: (input: StudyFeedbackInput, context?: {
        ownerId: string;
        requestId: string;
        authorize?: () => Promise<void>;
    }) => Promise<StudyFeedbackResult>;
}
export interface StudyDocumentRead {
    version: string;
    load(): Promise<{ text: string; document?: StudySource['document'] }>;
}
