
import type { DraftRow } from '../../application/management-operations.ts';
import type { DraftsRepository } from '../application/drafts-repository.ts';
export function createDraftsRepository(): DraftsRepository { return {
  async lockOwnedDraft(tx, input) { return tx.query<DraftRow>('SELECT * FROM classroom_drafts WHERE id=$1::uuid AND owner_id=$2::uuid AND deleted_at IS NULL FOR UPDATE', input.draftId, input.ownerId); },
  async createDraft(tx, input) { return tx.query<DraftRow>(`INSERT INTO classroom_drafts(id,owner_id,updated_at)
        VALUES($1::uuid,$2::uuid,clock_timestamp()) RETURNING *`, input.draftId, input.ownerId); },
  async listUnpublishedDrafts(tx, input) { return tx.query<DraftRow>(`SELECT * FROM classroom_drafts
      WHERE owner_id=$1::uuid AND published_classroom_id IS NULL AND deleted_at IS NULL ORDER BY updated_at DESC,id`, input.ownerId); },
  async savePayload(tx, input) { return tx.query<DraftRow>(`UPDATE classroom_drafts SET payload=$2::jsonb,revision=revision+1,updated_at=clock_timestamp()
        WHERE id=$1::uuid RETURNING *`, input.draftId, input.payload); },
  async deleteDraft(tx, input) { return tx.query<{ id: string }>(`UPDATE classroom_drafts SET deleted_at=clock_timestamp(),
        revision=revision+1,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id`, input.draftId); },
}; }
