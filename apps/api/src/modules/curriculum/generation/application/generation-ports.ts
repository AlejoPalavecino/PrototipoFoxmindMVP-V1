import type { Transaction } from '../../../classrooms/public.ts';
import type { ExtractionView } from '../../../../../../../src/core/domain/curriculum/ai.ts';
import type { ClassroomAiOptions, DraftRow, JobRow, ApprovedPlanSnapshot } from './ai-contracts.ts';

/** Operations share the caller's authorized transaction and persisted execution profile. */
export interface ClassroomGenerationPorts {
  authorized<T>(options: ClassroomAiOptions, request: unknown, draftId: string, write: boolean,
    operation: (tx: Transaction, current: DraftRow) => Promise<T>): Promise<T>;
  snapshot(options: ClassroomAiOptions, tx: Transaction, request: unknown, current: DraftRow, fileId: string): Promise<ApprovedPlanSnapshot>;
  revalidate(options: ClassroomAiOptions, tx: Transaction, request: unknown, current: DraftRow, row: JobRow): Promise<JobRow>;
  job(tx: Transaction, draftId: string, id: string): Promise<JobRow>;
  view(row: JobRow): ExtractionView;
  draftView(row: DraftRow): { id: string; revision: string; payload: Record<string, unknown>; publishedClassroomId: string | null };
  inputHash(operation: string, draftId: string, id: string, body: unknown): string;
  replay(tx: Transaction, ownerId: string, requestId: string, hash: string): Promise<string | null>;
  recordRequest(tx: Transaction, ownerId: string, requestId: string, operation: string, hash: string, extractionId: string): Promise<void>;
  newId(): string;
  findLatest(tx: Transaction, input: { draftId: string; fileId: string; digest: string; version: string }): Promise<JobRow[]>;
  findSuccessor(tx: Transaction, input: { extractionId: string }): Promise<JobRow[]>;
  updateDraft(tx: Transaction, input: { draftId: string; payload: string }): Promise<DraftRow[]>;
  markApplied(tx: Transaction, input: { extractionId: string; requestId: string; hash: string; revision: string }): Promise<JobRow[]>;
  insert(tx: Transaction, input: {
    id: string; ownerId: string; draftId: string; fileId: string; digest: string; revision: string;
    version: string; model: string; generation: number; previousId: string | null;
  }): Promise<JobRow[]>;
}
