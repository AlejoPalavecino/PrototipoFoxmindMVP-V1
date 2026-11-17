import type { Transaction } from '../../access/public.ts';

export interface InvitationBatchRepository {
  distinctMailboxes(tx: Transaction, input: { emails: string }): Promise<{ email: string }[]>;
  createReceipt(tx: Transaction, input: { classroomId: string; requestId: string; envelope: string }): Promise<{ request_id: string }[]>;
  updateReceipt(tx: Transaction, input: { classroomId: string; requestId: string; envelope: string }): Promise<{ request_id: string }[]>;
  normalizeMailbox(tx: Transaction, input: { email: string }): Promise<{ normalized: string }[]>;
  readReceipt(tx: Transaction, input: { classroomId: string; requestId: string }): Promise<{ receipt_envelope: string }[]>;
}
