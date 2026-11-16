import type { ActivityGenerationView, ActivitySourceGrant, ActivitySourceSnapshot, ApprovedActivitySourceReader,
  StartActivityGeneration, ActivityProposal, ActivitySourceReport, StructuredActivityGenerationPort } from '../../../../../../../src/core/domain/index.ts';
import type { ClassroomAiConfiguration } from '../../../curriculum/public.ts';
import type { AiExecutionSnapshot } from '../../../../../../../src/core/contracts/ai-execution.ts';
import type { Actor, Transaction } from '../../../classrooms/public.ts';

export interface AiActivitySource extends ApprovedActivitySourceReader {
  snapshot(tx: Transaction, request: unknown, classroomId: string, sourceId: string): Promise<ActivitySourceSnapshot>;
  snapshotWorker?(tx: Transaction, grant: ActivitySourceGrant, signal: AbortSignal): Promise<ActivitySourceSnapshot>;
}
export type ActivityAiOperation<T> = (tx: Transaction,
  room: { id: string; teacher_id: string; revision: bigint; archived_at: Date | null }, actor: Actor) => Promise<T>;
export interface ActivityAiAccess {
  transaction<T>(operation: (tx: Transaction) => Promise<T>): Promise<T>;
  authorized<T>(request: unknown, classroomId: string, write: boolean, operation: ActivityAiOperation<T>, lockIntent?: 'read' | 'write'): Promise<T>;
}
export interface ActivityAiOptions {
  access: ActivityAiAccess; reader: AiActivitySource; provider: StructuredActivityGenerationPort;
  configuration: ClassroomAiConfiguration;
  providerForExecution?: (configuration: ClassroomAiConfiguration) => StructuredActivityGenerationPort;
}
export interface CurriculumSnapshot {
  teacherId: string; unit: { id: string; name: string }; topics: { id: string; name: string }[]; latestPlanId: string | null;
}
export interface JobRow {
  execution_profile?: AiExecutionSnapshot | null;
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
