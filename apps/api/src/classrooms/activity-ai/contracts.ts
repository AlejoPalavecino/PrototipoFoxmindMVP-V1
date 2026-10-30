import type { ActivityGenerationView, ActivitySourceGrant, ActivitySourceSnapshot, ApprovedActivitySourceReader,
  StartActivityGeneration, ActivityProposal, ActivitySourceReport, StructuredActivityGenerationPort } from '../../../../../src/core/domain/index.ts';
import type { ClassroomAiConfiguration } from '../ai/index.ts';
import type { ClassroomCore } from '../core.ts';
import type { Transaction } from '../contracts.ts';

export interface AiActivitySource extends ApprovedActivitySourceReader {
  snapshot(tx: Transaction, request: unknown, classroomId: string, sourceId: string): Promise<ActivitySourceSnapshot>;
  snapshotWorker?(tx: Transaction, grant: ActivitySourceGrant, signal: AbortSignal): Promise<ActivitySourceSnapshot>;
}
export interface ActivityAiOptions {
  classrooms: Pick<ClassroomCore, 'ports' | 'classroom'>; reader: AiActivitySource; provider: StructuredActivityGenerationPort;
  configuration: ClassroomAiConfiguration;
}
export interface CurriculumSnapshot {
  teacherId: string; unit: { id: string; name: string }; topics: { id: string; name: string }[]; latestPlanId: string | null;
}
export interface JobRow {
  id: string; owner_id: string; classroom_id: string; unit_id: string; type: StartActivityGeneration['type'];
  base_revision: bigint | string; request_hash: string; input_payload: StartActivityGeneration;
  curriculum_snapshot: CurriculumSnapshot; source_snapshot: ActivitySourceSnapshot[]; source_report: ActivitySourceReport[];
  schema_version: string; prompt_version: string; model: string; generation: number; predecessor_id: string | null;
  state: ActivityGenerationView['state']; proposal: ActivityProposal | null; error_code: ActivityGenerationView['error']; missing_information: string[];
  created_at: Date; updated_at: Date; completed_at: Date | null; dispatch_count: number;
  lease_nonce: string | null; lease_until: Date | null; dispatch_started_at: Date | null;
  apply_request_id: string | null; apply_input_hash: string | null; applied_activity_id: string | null; applied_revision: bigint | string | null;
  reserved_microusd: bigint | string; usage_day: Date | null; input_tokens: bigint | string | null; output_tokens: bigint | string | null;
  expired?: boolean;
}
export const generationVersion = 'activity-proposal-v1';
