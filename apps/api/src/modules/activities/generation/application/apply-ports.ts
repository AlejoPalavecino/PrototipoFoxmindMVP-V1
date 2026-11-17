import type { Transaction } from '../../../classrooms/public.ts';
import type { ActivityDraftWriterPort } from '../../authoring/public.ts';
import type { ActivityAiOptions, JobRow } from './ai-contracts.ts';

export interface ActivityApplyPorts {
  replay(tx: Transaction, ownerId: string, requestId: string, hash: string): Promise<string | null>;
  recordRequest(tx: Transaction, ownerId: string, requestId: string, operation: string, hash: string, generationId: string): Promise<void>;
  revalidate(options: ActivityAiOptions, tx: Transaction, request: unknown, row: JobRow): Promise<boolean>;
  createDraft: ActivityDraftWriterPort;
  advanceRevision(tx: Transaction, input: { classroomId: string }): Promise<{ revision: bigint }[]>;
  markApplied(tx: Transaction, input: {
    id: string; proposal: string; requestId: string; hash: string; activityId: string; revision: string;
  }): Promise<JobRow[]>;
}
