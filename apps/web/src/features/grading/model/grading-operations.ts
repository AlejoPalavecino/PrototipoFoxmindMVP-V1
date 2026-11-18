import type { GradingData, GradeCorrectionsData, PublishedResultData, ProgressData } from '../../../../../../src/core/contracts/grading.ts';
import type { PrivateGradingInput, gradeCorrectionInput } from '../../../../../../src/core/domain/grading/grading.ts';
import type { GradingAiProposal } from '../../../../../../src/core/domain/grading/grading-ai.ts';

export interface GradingEditingOperations {
  load(signal?: AbortSignal): Promise<GradingData>;
  save(input: PrivateGradingInput, signal?: AbortSignal): Promise<GradingData>;
  fileUrl(id: string): string;
}
export interface GradingPublicationOperations {
  publish(revision: string, signal?: AbortSignal): Promise<GradingData>;
}
export interface GradingAiJob {
  id: string; state: string; snapshotHash: string | null; proposal: GradingAiProposal | null; error?: string | null;
}
export interface GradingAiDecision { requestId: string; revision: string }
export interface GradingAiApplication extends GradingAiDecision { snapshotHash: string; proposal: GradingAiProposal }
export interface GradingAiReviewOperations {
  load(signal?: AbortSignal): Promise<GradingAiJob | null>;
  apply(jobId: string, input: GradingAiApplication, signal?: AbortSignal): Promise<unknown>;
  discard(jobId: string, input: GradingAiDecision, signal?: AbortSignal): Promise<unknown>;
}
export interface GradeCorrectionsOperations {
  load(signal?: AbortSignal): Promise<GradeCorrectionsData>;
  correct(input: ReturnType<typeof gradeCorrectionInput>, signal?: AbortSignal): Promise<GradeCorrectionsData>;
}
export interface GradingResultsOperations {
  load(signal?: AbortSignal): Promise<PublishedResultData>;
  fileUrl(id: string): string;
}
export interface GradingProgressOperations {
  load(studentId?: string, signal?: AbortSignal): Promise<ProgressData>;
}
export interface StudentSummaryFinding { text: string; evidenceRefs: string[] }
export interface StudentSummary {
  state: 'PENDING' | 'RUNNING' | 'READY' | 'INSUFFICIENT_EVIDENCE' | 'STALE' | 'FAILED' | 'DISABLED';
  generatedAt: string | null;
  evidenceHash: string | null;
  evidenceReferences?: { ref: string; title: string }[];
  report: {
    overview: string;
    strengths: StudentSummaryFinding[];
    supportNeeds: StudentSummaryFinding[];
    recommendations: StudentSummaryFinding[];
    limitations: string[];
  } | null;
  error: string | null;
}
export interface StudentSummaryOperations {
  load(signal?: AbortSignal): Promise<StudentSummary>;
}
