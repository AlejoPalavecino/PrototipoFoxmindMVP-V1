import type { DocumentExtension } from '../../../../../../../src/core/domain/documents/document-formats.ts';
import type { SqlDatabase } from '../../../../../../../src/core/contracts/sql.ts';
import type { AiExecutionSettings, AiExecutionSnapshot } from '../../../../../../../src/core/contracts/ai-execution.ts';
import type { Transaction } from '../../../classrooms/public.ts';
import type { ApprovedPlanReader, StructuredExtractionPort, ExtractionView } from '../../../../../../../src/core/domain/curriculum/ai.ts';
import type { ExtractedCurriculum } from '../../../../../../../src/core/domain/curriculum/plan.ts';

export interface ClassroomAiConfiguration extends AiExecutionSettings {
 model: string; maxConcurrency: number; maxDispatches: number; deadlineMs: number; maxJobAgeMs: number;
 maxInputTokens: number; maxOutputTokens: number; inputUsdPerMillion: number; outputUsdPerMillion: number;
 dailyBudgetUsd: number; dailyActorBudgetUsd?: number; dailyActorRequests: number; dailyGlobalRequests: number;
}
export interface ApprovedPlanSnapshot { fileId: string; digest: string; extension: DocumentExtension; sizeBytes: number }
export interface AiPlanSource extends ApprovedPlanReader {
  snapshot(tx: Transaction, request: unknown, draftId: string, fileId: string): Promise<ApprovedPlanSnapshot>;
  snapshotWorker?(tx: Transaction, input: PlanGrant, signal: AbortSignal): Promise<ApprovedPlanSnapshot>;
}
export interface PlanGrant { ownerId: string; draftId: string; fileId: string; digest: string }
export interface ClassroomAiOptions {
  database: SqlDatabase; authenticate(tx: Transaction, request: unknown, write: boolean): Promise<string>;
  reader: AiPlanSource; provider: StructuredExtractionPort; configuration: ClassroomAiConfiguration;
  providerForExecution?: (configuration: ClassroomAiConfiguration) => StructuredExtractionPort;
}
export interface DraftRow {
  id: string; owner_id: string; revision: bigint | string; payload: Record<string, unknown>;
  published_classroom_id: string | null;
}
export interface JobRow {
  execution_profile?: AiExecutionSnapshot | null;
  id: string; owner_id: string; draft_id: string; file_id: string; source_digest: string;
  base_revision: bigint | string; state: ExtractionView['state']; proposal: ExtractedCurriculum | null;
  error_code: ExtractionView['error']; generation: number; dispatch_count: number;
  lease_nonce: string | null; lease_until: Date | null; dispatch_started_at: Date | null;
  retry_of: string | null; apply_request_id: string | null; apply_input_hash: string | null;
  applied_revision: bigint | string | null; created_at: Date; expired?: boolean;
}
export interface QueueResult { created: boolean; view: ExtractionView }
export const version = 'study-plan-v1';
