import type { ActivityQuestion, ActivityType, DeadlineResolution } from '../../../../../../src/core/contracts/activities.ts';
import type { ActivityGenerationApplied, ActivityGenerationCatalog, ActivityGenerationResponse, ActivityProposal, StartActivityGeneration } from '../../../../../../src/core/domain/activities/activity-generation.ts';
import type { EvaluationRubric } from '../../../../../../src/core/domain/grading/evaluation-rubric.ts';

export type ActivityDeadline = { local: string; offsetMinutes?: number | null } | null;
export interface ActivityMetadata {
  title: string;
  unitIds: string[];
  topicIds: string[];
}
export interface ActivityDraftPayload extends ActivityMetadata {
  objective: string | null;
  teacherComment: string | null;
  instructions: string;
  attachmentRequired: boolean;
  aiGradingRubric: string;
  evaluationRubric: EvaluationRubric;
  instructionFileIds: string[];
  materialIds: string[];
  deadline: ActivityDeadline;
  allowLate: boolean;
  questions: ActivityQuestion[];
}
export interface ActivityRevision { revision: string }
export interface PersistedActivity extends ActivityRevision { id: string }
export type GenerationStartRequest = Omit<StartActivityGeneration, 'unitId'>;

export interface ActivityGenerationOperations {
  sources(signal?: AbortSignal): Promise<ActivityGenerationCatalog>;
  list(signal?: AbortSignal): Promise<{ jobs: ActivityGenerationResponse[] }>;
  get(id: string, signal?: AbortSignal): Promise<ActivityGenerationResponse>;
  start(input: GenerationStartRequest, signal?: AbortSignal): Promise<ActivityGenerationResponse>;
  regenerate(id: string, input: GenerationStartRequest, acknowledgePossibleCharge: boolean, signal?: AbortSignal): Promise<ActivityGenerationResponse>;
  apply(id: string, revision: string, requestId: string, proposal: ActivityProposal, signal?: AbortSignal): Promise<ActivityGenerationApplied>;
}

/** Authoring receives capabilities; session, CSRF and transport remain in composition. */
export interface ActivityAuthoringOperations {
  createDraft(revision: string, type: ActivityType, signal?: AbortSignal): Promise<PersistedActivity>;
  saveDraft(revision: string, id: string, payload: ActivityDraftPayload, signal?: AbortSignal): Promise<ActivityRevision>;
  updateMetadata(revision: string, id: string, metadata: ActivityMetadata, signal?: AbortSignal): Promise<ActivityRevision>;
  publish(revision: string, id: string, signal?: AbortSignal): Promise<ActivityRevision>;
  updateDeadline(revision: string, id: string, deadline: ActivityDeadline, allowLate: boolean, signal?: AbortSignal): Promise<ActivityRevision>;
  resolveDeadline(local: string, signal?: AbortSignal): Promise<DeadlineResolution>;
  generation: ActivityGenerationOperations;
}
