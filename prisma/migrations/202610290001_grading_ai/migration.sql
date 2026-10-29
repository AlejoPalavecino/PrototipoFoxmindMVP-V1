ALTER TABLE classrooms ADD COLUMN ai_grading_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN ai_grading_epoch bigint NOT NULL DEFAULT 0;
ALTER TABLE activities ADD COLUMN ai_grading_rubric text NOT NULL DEFAULT '';
ALTER TABLE activities ADD CONSTRAINT activities_ai_grading_rubric_length CHECK (char_length(ai_grading_rubric) <= 5000);
CREATE TABLE grading_ai_jobs (
  id uuid PRIMARY KEY,
  classroom_id uuid NOT NULL REFERENCES classrooms(id),
  activity_id uuid NOT NULL,
  attempt_id uuid NOT NULL,
  owner_id uuid NOT NULL REFERENCES users(id),
  origin text NOT NULL DEFAULT 'AUTO',
  rubric_snapshot text NOT NULL,
  epoch bigint NOT NULL,
  snapshot_hash text,
  proposal jsonb,
  state text NOT NULL DEFAULT 'QUEUED',
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  lease_nonce uuid, lease_until timestamptz,
  dispatch_count integer NOT NULL DEFAULT 0, dispatch_started_at timestamptz,
  reserved_microusd bigint NOT NULL DEFAULT 0, usage_day date,
  input_tokens bigint, output_tokens bigint, error_code text,
  CONSTRAINT grading_ai_jobs_activity_fk FOREIGN KEY (activity_id, classroom_id) REFERENCES activities(id, classroom_id),
  CONSTRAINT grading_ai_jobs_attempt_fk FOREIGN KEY (attempt_id, activity_id) REFERENCES attempts(id, activity_id),
  CONSTRAINT grading_ai_jobs_origin_check CHECK (origin IN ('AUTO', 'MANUAL')),
  CONSTRAINT grading_ai_jobs_state_check CHECK (state IN ('QUEUED', 'RUNNING', 'READY', 'FAILED', 'STALE', 'APPLIED', 'DISCARDED')),
  CONSTRAINT grading_ai_jobs_rubric_length CHECK (char_length(rubric_snapshot) <= 5000)
);
CREATE UNIQUE INDEX grading_ai_jobs_auto_attempt_unique ON grading_ai_jobs(attempt_id) WHERE origin='AUTO';
CREATE INDEX grading_ai_jobs_state_created_idx ON grading_ai_jobs(state, created_at);
