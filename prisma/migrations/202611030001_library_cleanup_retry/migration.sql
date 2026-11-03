ALTER TABLE materials
  ADD COLUMN deletion_retry_at TIMESTAMPTZ(6),
  ADD COLUMN deletion_retry_step INTEGER NOT NULL DEFAULT 0,
  ADD CONSTRAINT materials_deletion_retry_step_check CHECK (deletion_retry_step BETWEEN 0 AND 5);
