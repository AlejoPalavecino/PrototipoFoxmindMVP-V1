CREATE TABLE teacher_writing_reports (
  id uuid PRIMARY KEY,
  enrollment_id uuid NOT NULL REFERENCES enrollments(id),
  classroom_id uuid NOT NULL REFERENCES classrooms(id),
  owner_id uuid NOT NULL REFERENCES users(id),
  membership_period_id uuid NOT NULL REFERENCES membership_periods(id),
  evidence_hash text NOT NULL,
  state text NOT NULL DEFAULT 'QUEUED' CHECK (state IN ('QUEUED','RUNNING','READY','FAILED','STALE')),
  report jsonb,
  reference_map jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  lease_nonce uuid,
  lease_until timestamptz,
  dispatch_count integer NOT NULL DEFAULT 0,
  dispatch_started_at timestamptz,
  reserved_microusd bigint NOT NULL DEFAULT 0,
  usage_day date,
  input_tokens bigint,
  output_tokens bigint,
  error_code text,
  execution_profile jsonb CHECK (execution_profile IS NULL OR foxmind_valid_ai_execution(execution_profile,'analysis')),
  UNIQUE(owner_id, membership_period_id, evidence_hash),
  CHECK ((state='READY') = (report IS NOT NULL)),
  CHECK ((state='RUNNING') = (lease_nonce IS NOT NULL AND lease_until IS NOT NULL))
);
CREATE INDEX teacher_writing_queue_idx ON teacher_writing_reports(state,created_at);
CREATE TRIGGER teacher_writing_execution_guard BEFORE INSERT OR UPDATE ON teacher_writing_reports
  FOR EACH ROW EXECUTE FUNCTION foxmind_ai_job_profile_guard('analysis');
CREATE OR REPLACE FUNCTION foxmind_ai_legacy_pending() RETURNS boolean LANGUAGE sql VOLATILE AS $$
  SELECT EXISTS (
    SELECT 1 FROM classroom_curriculum_extractions WHERE execution_profile IS NULL AND state IN ('QUEUED','RUNNING')
    UNION ALL SELECT 1 FROM activity_ai_generations WHERE execution_profile IS NULL AND state IN ('QUEUED','RUNNING')
    UNION ALL SELECT 1 FROM student_ai_reports WHERE execution_profile IS NULL AND state IN ('QUEUED','RUNNING')
    UNION ALL SELECT 1 FROM teacher_writing_reports WHERE execution_profile IS NULL AND state IN ('QUEUED','RUNNING')
    UNION ALL SELECT 1 FROM grading_ai_jobs WHERE execution_profile IS NULL AND state IN ('QUEUED','RUNNING')
    UNION ALL SELECT 1 FROM foxy_turns WHERE execution_profile IS NULL AND state IN ('QUEUED','RUNNING')
    UNION ALL SELECT 1 FROM study_ai_dispatches WHERE execution_profile IS NULL AND state IN ('QUEUED','RUNNING')
  )
$$;
