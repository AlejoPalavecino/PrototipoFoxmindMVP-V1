ALTER TABLE classroom_drafts ADD COLUMN deleted_at timestamptz(6);
ALTER TABLE classroom_drafts ADD CONSTRAINT classroom_draft_deleted_unpublished
  CHECK (deleted_at IS NULL OR published_classroom_id IS NULL);
