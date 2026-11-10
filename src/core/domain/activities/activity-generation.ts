import type { PlanDocument, ExtractionError, ExtractionState } from '../curriculum/ai.ts';

export const activityGenerationSchemaVersion = 'activity-proposal-v1' as const;
export type ActivityGenerationType = 'ASSIGNMENT' | 'QUESTIONNAIRE' | 'EVALUATION';
export type ActivityGenerationWarning = 'DOCX_IMAGES_OMITTED' | 'GROUNDING_REQUIRES_REVIEW' | 'PARTIAL_CONTENT';
export interface ActivityGenerationCounts { assignment: number; development: number; singleChoice: number; multipleChoice: number }
export interface StartActivityGeneration {
  revision: string; requestId: string; type: ActivityGenerationType; unitId: string; topicIds: string[];
  sourceIds: string[]; objective: string; groupLevel: string; difficulty: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
  durationMinutes: number; context: string; counts: ActivityGenerationCounts; acknowledgedWarnings: ActivityGenerationWarning[];
}
export interface ActivityQuestion {
  type: 'DEVELOPMENT' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE'; prompt: string; points: string;
  scoringRule: 'EXACT' | 'PARTIAL' | null; options: { text: string; correct: boolean }[];
}
export interface ActivityEvidence { item: 'assignment' | 'question'; index: number; references: { sourceId: string; page: number | null }[] }
export interface ActivityProposal {
  evaluationRubric?: import('../grading/evaluation-rubric.ts').EvaluationRubric;
  schemaVersion: typeof activityGenerationSchemaVersion; type: ActivityGenerationType; title: string; objective: string;
  instructions: string; assignmentPrompts: string[]; questions: ActivityQuestion[]; evidence: ActivityEvidence[];
  warnings: ActivityGenerationWarning[];
}
export interface ActivityProposalConstraints {
  type: ActivityGenerationType; counts: ActivityGenerationCounts; sourceIds: string[]; context: string;
  pdfPageCounts: Record<string, number>;
}
export interface ApplyActivityGeneration { revision: string; requestId: string; proposal: ActivityProposal }
export interface ActivityGenerationSource { sourceId: string; document: PlanDocument; pageCount: number | null; warnings: ActivityGenerationWarning[] }
export interface ActivityGenerationInput {
  type: ActivityGenerationType; unit: { id: string; name: string }; topics: { id: string; name: string }[];
  objective: string; groupLevel: string; difficulty: StartActivityGeneration['difficulty']; durationMinutes: number;
  context: string; counts: ActivityGenerationCounts; sources: ActivityGenerationSource[];
  schemaVersion: typeof activityGenerationSchemaVersion; signal: AbortSignal;
}
export interface StructuredActivityGenerationPort {
  countActivityTokens(input: ActivityGenerationInput): Promise<number>;
  generateActivity(input: ActivityGenerationInput): Promise<{ json: unknown; inputTokens: number | null; outputTokens: number | null }>;
}
export interface ActivityGenerationView {
  id: string; classroomId: string; baseRevision: string; state: ExtractionState;
  type: ActivityGenerationType; unitId: string; topicIds: string[]; createdAt: Date;
  proposal: ActivityProposal | null; error: ExtractionError | 'SOURCE_UNAVAILABLE' | 'INSUFFICIENT_CONTENT' | null;
  retryable: boolean; appliedActivityId: string | null; missingInformation: string[]; sourceReport: ActivitySourceReport[];
}
export type ActivityGenerationResponse = Omit<ActivityGenerationView, 'createdAt'> & { createdAt: string };
export interface ActivityGenerationApplied { generationId: string; activityId: string; revision: string }
export interface ActivitySourceReport { sourceId: string; status: 'READ'; pageCount: number | null; warnings: ActivityGenerationWarning[] }
export interface ActivitySourceGrant { ownerId: string; classroomId: string; sourceId: string; fileId: string; digest: string }
export interface ActivitySourceSnapshot { sourceId: string; fileId: string; digest: string; extension: 'pdf' | 'docx'; sizeBytes: number }
export interface ApprovedActivitySourceReader { read(grant: ActivitySourceGrant, signal: AbortSignal): Promise<ActivityGenerationSource> }
export interface ActivitySourceCandidate {
  sourceId: string; fileId: string; title: string; kind: 'plan' | 'material'; extension: string; sizeBytes: number;
  unitId: string | null; topicId: string | null; available: boolean; reason: 'UNSUPPORTED_FORMAT' | 'AI_INPUT_LIMIT' | 'FILE_NOT_READY' | null;
}
export interface ActivityGenerationCatalog { revision: string; sources: ActivitySourceCandidate[] }
