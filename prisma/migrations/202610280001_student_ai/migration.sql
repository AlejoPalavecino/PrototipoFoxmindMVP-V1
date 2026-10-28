CREATE TABLE student_ai_reports (
  id uuid PRIMARY KEY, enrollment_id uuid NOT NULL REFERENCES enrollments(id),
  classroom_id uuid NOT NULL REFERENCES classrooms(id), owner_id uuid NOT NULL REFERENCES users(id),
  evidence_hash text NOT NULL, state text NOT NULL DEFAULT 'QUEUED', report jsonb,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  lease_nonce uuid, lease_until timestamptz, dispatch_count integer NOT NULL DEFAULT 0,
  dispatch_started_at timestamptz, attempt_count integer NOT NULL DEFAULT 1, reserved_microusd bigint NOT NULL DEFAULT 0, usage_day date,
  input_tokens bigint, output_tokens bigint, error_code text,
  UNIQUE(enrollment_id, evidence_hash)
);
CREATE INDEX student_ai_reports_enrollment_idx ON student_ai_reports(enrollment_id, created_at DESC);

