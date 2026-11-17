import type { Actor, Transaction } from '../../../classrooms/public.ts';
import type { ActivityGenerationApplied, ActivityGenerationCatalog, ActivityGenerationView, ActivitySourceSnapshot, StartActivityGeneration, ApplyActivityGeneration } from '../../../../../../../src/core/domain/activities/activity-generation.ts';
import type { ActivityAiOptions, ActivityAiOperation, CurriculumSnapshot, JobRow } from './ai-contracts.ts';

export interface ActivityGenerationPorts {
  authorized<T>(options: ActivityAiOptions, request: unknown, classroomId: string, write: boolean,
    operation: ActivityAiOperation<T>, lockIntent?: 'read' | 'write'): Promise<T>;
  job(tx: Transaction, classroomId: string, id: string): Promise<JobRow>;
  view(row: JobRow): ActivityGenerationView;
  currentView(options: ActivityAiOptions, tx: Transaction, request: unknown, row: JobRow): Promise<ActivityGenerationView>;
  candidates(tx: Transaction, classroomId: string): Promise<ActivityGenerationCatalog['sources']>;
  inputHash(operation: string, classroomId: string, id: string | null, body: unknown): string;
  replay(tx: Transaction, ownerId: string, requestId: string, hash: string): Promise<string | null>;
  recordRequest(tx: Transaction, ownerId: string, requestId: string, operation: string, hash: string, generationId: string): Promise<void>;
  requireUnknownAcknowledgement(tx: Transaction, ownerId: string, classroomId: string, body: StartActivityGeneration,
    acknowledgement?: { predecessorId: string; possibleCharge: boolean }): Promise<void>;
  curriculum(tx: Transaction, classroomId: string, body: StartActivityGeneration): Promise<CurriculumSnapshot>;
  snapshots(options: ActivityAiOptions, tx: Transaction, request: unknown, classroomId: string, body: StartActivityGeneration): Promise<ActivitySourceSnapshot[]>;
  applyProposal(options: ActivityAiOptions, tx: Transaction, request: unknown, row: JobRow,
    actor: Actor, revision: bigint, body: ApplyActivityGeneration, hash: string): Promise<ActivityGenerationApplied>;
  newId(): string;
  listJobs(tx: Transaction, input: { classroomId: string; ownerId: string }): Promise<JobRow[]>;
  insert(tx: Transaction, input: {
    id: string; ownerId: string; classroomId: string; unitId: string; type: StartActivityGeneration['type'];
    revision: string; hash: string; body: string; curriculum: string; sources: string;
    version: string; model: string; generation: number; predecessorId: string | null;
  }): Promise<JobRow[]>;
}
