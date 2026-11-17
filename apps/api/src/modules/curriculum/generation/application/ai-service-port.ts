import type { ActivityGenerationCatalog, ActivityGenerationView } from '../../../../../../../src/core/domain/activities/activity-generation.ts';
import type { ExtractionView } from '../../../../../../../src/core/domain/curriculum/ai.ts';
import type { QueueResult } from './ai-contracts.ts';
export interface ClassroomAiServicePort {
    start: (request: unknown, draftId: string, input: unknown) => Promise<QueueResult>;
    get: (request: unknown, draftId: string, id: string) => Promise<ExtractionView>;
    retry: (request: unknown, draftId: string, id: string, input: unknown) => Promise<QueueResult>;
    apply: (request: unknown, draftId: string, id: string, input: unknown) => Promise<{
        extractionId: string;
        appliedRevision: string;
        draft: {
            id: string;
            revision: string;
            payload: Record<string, unknown>;
            publishedClassroomId: string | null;
        };
    }>;
}
