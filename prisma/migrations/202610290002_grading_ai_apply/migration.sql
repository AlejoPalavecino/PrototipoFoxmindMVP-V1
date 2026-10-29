ALTER TABLE grading_ai_jobs ADD COLUMN apply_request_id uuid, ADD COLUMN apply_input_hash text;
ALTER TABLE grading_ai_jobs ADD CONSTRAINT grading_ai_apply_identity_check CHECK (
  (apply_request_id IS NULL AND apply_input_hash IS NULL) OR
  (apply_request_id IS NOT NULL AND apply_input_hash ~ '^[a-f0-9]{64}$')
);
