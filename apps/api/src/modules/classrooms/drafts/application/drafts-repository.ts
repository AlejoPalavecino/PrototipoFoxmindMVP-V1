import type { Transaction } from '../../access/public.ts';
import type { DraftRow } from '../../application/management-operations.ts';
export interface DraftsRepository {
  lockOwnedDraft(tx: Transaction, input: { draftId: string; ownerId: string }): Promise<DraftRow[]>;
  createDraft(tx: Transaction, input: { draftId: string; ownerId: string }): Promise<DraftRow[]>;
  listUnpublishedDrafts(tx: Transaction, input: { ownerId: string }): Promise<DraftRow[]>;
  savePayload(tx: Transaction, input: { draftId: string; payload: string }): Promise<DraftRow[]>;
  deleteDraft(tx: Transaction, input: { draftId: string }): Promise<{ id: string }[]>;
}
