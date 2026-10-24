import type { ClassroomPorts, Transaction } from '../contracts.ts';
import type { AiConfiguration } from '../../ai/index.ts';
import type { ApprovedPlanReader, StructuredExtractionPort, ExtractionView, ExtractedCurriculum } from '../../../../../src/core/domain/index.ts';

export type ClassroomAiConfiguration = Omit<AiConfiguration, 'backend' | 'apiKey'>;
export interface ApprovedPlanSnapshot { fileId: string; digest: string; extension: 'pdf' | 'docx'; sizeBytes: number }
export interface AiPlanSource extends ApprovedPlanReader {
  snapshot(tx: Transaction, request: unknown, draftId: string, fileId: string): Promise<ApprovedPlanSnapshot>;
  snapshotWorker?(tx: Transaction, input: PlanGrant, signal: AbortSignal): Promise<ApprovedPlanSnapshot>;
}
export interface PlanGrant { ownerId: string; draftId: string; fileId: string; digest: string }
export interface ClassroomAiOptions {
  database: ClassroomPorts['database']; authenticate: ClassroomPorts['authenticate'];
  reader: AiPlanSource; provider: StructuredExtractionPort; configuration: ClassroomAiConfiguration;
}
export interface DraftRow {
  id: string; owner_id: string; revision: bigint | string; payload: Record<string, unknown>;
  published_classroom_id: string | null;
}
export interface JobRow {
  id: string; owner_id: string; draft_id: string; file_id: string; source_digest: string;
  base_revision: bigint | string; state: ExtractionView['state']; proposal: ExtractedCurriculum | null;
  error_code: ExtractionView['error']; generation: number; dispatch_count: number;
  lease_nonce: string | null; lease_until: Date | null; dispatch_started_at: Date | null;
  retry_of: string | null; apply_request_id: string | null; apply_input_hash: string | null;
  applied_revision: bigint | string | null; created_at: Date; expired?: boolean;
}
export interface QueueResult { created: boolean; view: ExtractionView }
export const version = 'study-plan-v1';
