-- Additive upgrade: existing jobs keep NULL and are drained before profile changes.
CREATE FUNCTION foxmind_valid_ai_execution(p jsonb, expected_task text) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE k text;
BEGIN
  IF p IS NULL OR jsonb_typeof(p) <> 'object' THEN RETURN false; END IF;
  IF NOT p ?& ARRAY['format','task','provider','model','profileId','profileVersion','promptVersion','responseVersion',
    'maxInputTokens','maxOutputTokens','deadlineMs','maxDocumentBytes','inputUsdPerMillion','outputUsdPerMillion']
    OR p - ARRAY['format','task','provider','model','profileId','profileVersion','promptVersion','responseVersion',
      'maxInputTokens','maxOutputTokens','deadlineMs','maxDocumentBytes','inputUsdPerMillion','outputUsdPerMillion'] <> '{}'::jsonb THEN RETURN false; END IF;
  IF p->>'format' <> 'ai-execution-v1' OR p->>'task' <> expected_task OR p->>'provider' NOT IN ('gemini','anthropic') THEN RETURN false; END IF;
  FOREACH k IN ARRAY ARRAY['format','task','provider','model','profileId','profileVersion','promptVersion','responseVersion'] LOOP
    IF jsonb_typeof(p->k) <> 'string' OR length(p->>k) = 0 OR length(p->>k) > 150 THEN RETURN false; END IF;
  END LOOP;
  IF p->>'model' !~ '^[a-zA-Z0-9._/-]{1,150}$' OR p->>'profileId' !~ '^[a-z][a-z0-9-]{0,63}$'
    OR p->>'profileVersion' !~ '^[a-zA-Z0-9._-]{1,40}$' THEN RETURN false; END IF;
  FOREACH k IN ARRAY ARRAY['maxInputTokens','maxOutputTokens','deadlineMs','maxDocumentBytes'] LOOP
    IF jsonb_typeof(p->k) <> 'number' OR (p->>k)::numeric <= 0 OR (p->>k)::numeric > 9007199254740991
      OR trunc((p->>k)::numeric) <> (p->>k)::numeric THEN RETURN false; END IF;
  END LOOP;
  IF (p->>'deadlineMs')::numeric > 2147483647 OR (p->>'maxDocumentBytes')::numeric > (CASE WHEN expected_task='grading' THEN 400000000 ELSE 20000000 END) THEN RETURN false; END IF;
  FOREACH k IN ARRAY ARRAY['inputUsdPerMillion','outputUsdPerMillion'] LOOP
    IF jsonb_typeof(p->k) <> 'number' OR (p->>k)::numeric <= 0 OR (p->>k)::numeric > 9007199254740991 THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RETURN false;
END $$;

ALTER TABLE classroom_curriculum_extractions ADD COLUMN execution_profile jsonb;
ALTER TABLE activity_ai_generations ADD COLUMN execution_profile jsonb;
ALTER TABLE student_ai_reports ADD COLUMN execution_profile jsonb;
ALTER TABLE grading_ai_jobs ADD COLUMN execution_profile jsonb;
ALTER TABLE foxy_turns ADD COLUMN execution_profile jsonb;
ALTER TABLE study_ai_dispatches ADD COLUMN execution_profile jsonb;

ALTER TABLE classroom_curriculum_extractions ADD CONSTRAINT curriculum_execution_valid CHECK (execution_profile IS NULL OR foxmind_valid_ai_execution(execution_profile,'curriculum'));
ALTER TABLE activity_ai_generations ADD CONSTRAINT activities_execution_valid CHECK (execution_profile IS NULL OR foxmind_valid_ai_execution(execution_profile,'activities'));
ALTER TABLE student_ai_reports ADD CONSTRAINT analysis_execution_valid CHECK (execution_profile IS NULL OR foxmind_valid_ai_execution(execution_profile,'analysis'));
ALTER TABLE grading_ai_jobs ADD CONSTRAINT grading_execution_valid CHECK (execution_profile IS NULL OR foxmind_valid_ai_execution(execution_profile,'grading'));
ALTER TABLE foxy_turns ADD CONSTRAINT foxy_execution_valid CHECK (execution_profile IS NULL OR foxmind_valid_ai_execution(execution_profile,'foxy'));
ALTER TABLE study_ai_dispatches ADD CONSTRAINT study_execution_valid CHECK (execution_profile IS NULL OR foxmind_valid_ai_execution(execution_profile,'study'));

CREATE FUNCTION foxmind_valid_ai_profiles(p jsonb) RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE task text;
BEGIN
  IF p IS NULL OR jsonb_typeof(p) <> 'object' OR p - ARRAY['curriculum','activities','analysis','grading','foxy','study'] <> '{}'::jsonb THEN RETURN false; END IF;
  FOREACH task IN ARRAY ARRAY['curriculum','activities','analysis','grading','foxy','study'] LOOP
    IF NOT foxmind_valid_ai_execution(p->task,task) THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
END $$;
CREATE TABLE ai_execution_policy (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  baseline_profiles jsonb NOT NULL CHECK (foxmind_valid_ai_profiles(baseline_profiles)),
  active_profiles jsonb NOT NULL CHECK (foxmind_valid_ai_profiles(active_profiles)),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE FUNCTION foxmind_ai_legacy_pending() RETURNS boolean LANGUAGE sql VOLATILE AS $$
  SELECT EXISTS (
    SELECT 1 FROM classroom_curriculum_extractions WHERE execution_profile IS NULL AND state IN ('QUEUED','RUNNING')
    UNION ALL SELECT 1 FROM activity_ai_generations WHERE execution_profile IS NULL AND state IN ('QUEUED','RUNNING')
    UNION ALL SELECT 1 FROM student_ai_reports WHERE execution_profile IS NULL AND state IN ('QUEUED','RUNNING')
    UNION ALL SELECT 1 FROM grading_ai_jobs WHERE execution_profile IS NULL AND state IN ('QUEUED','RUNNING')
    UNION ALL SELECT 1 FROM foxy_turns WHERE execution_profile IS NULL AND state IN ('QUEUED','RUNNING')
    UNION ALL SELECT 1 FROM study_ai_dispatches WHERE execution_profile IS NULL AND state IN ('QUEUED','RUNNING')
  )
$$;
CREATE FUNCTION foxmind_ai_profile_policy_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(78123003);
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'AI_EXECUTION_POLICY_IMMUTABLE' USING ERRCODE='23514'; END IF;
  IF TG_OP = 'UPDATE' AND OLD.baseline_profiles IS DISTINCT FROM NEW.baseline_profiles THEN
    RAISE EXCEPTION 'AI_EXECUTION_BASELINE_IMMUTABLE' USING ERRCODE='23514';
  END IF;
  IF (TG_OP = 'INSERT' OR NEW.active_profiles IS DISTINCT FROM NEW.baseline_profiles) AND foxmind_ai_legacy_pending() THEN
    RAISE EXCEPTION 'AI_LEGACY_PENDING' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER ai_profile_policy_guard BEFORE INSERT OR UPDATE OR DELETE ON ai_execution_policy
  FOR EACH ROW EXECUTE FUNCTION foxmind_ai_profile_policy_guard();

CREATE FUNCTION foxmind_ai_job_profile_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE policy ai_execution_policy;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.execution_profile IS DISTINCT FROM NEW.execution_profile THEN
      RAISE EXCEPTION 'AI_EXECUTION_PROFILE_IMMUTABLE' USING ERRCODE='23514';
    END IF;
    IF NEW.execution_profile IS NOT NULL AND current_setting('application_name',true) IS DISTINCT FROM 'foxmind-api-ai-execution-v1' THEN
      RAISE EXCEPTION 'AI_EXECUTOR_VERSION_REQUIRED' USING ERRCODE='23514';
    END IF;
    IF NEW.execution_profile IS NULL AND NEW.state IN ('QUEUED','RUNNING') AND OLD.state NOT IN ('QUEUED','RUNNING') THEN
      PERFORM pg_advisory_xact_lock(78123003);
      IF EXISTS(SELECT 1 FROM ai_execution_policy WHERE singleton) THEN
        RAISE EXCEPTION 'AI_LEGACY_PENDING' USING ERRCODE='23514';
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  PERFORM pg_advisory_xact_lock(78123003);
  SELECT * INTO policy FROM ai_execution_policy WHERE singleton;
  IF FOUND THEN
    IF NEW.execution_profile IS NULL THEN
      RAISE EXCEPTION 'AI_LEGACY_PENDING' USING ERRCODE='23514';
    ELSE
      IF current_setting('application_name',true) IS DISTINCT FROM 'foxmind-api-ai-execution-v1' THEN
        RAISE EXCEPTION 'AI_EXECUTOR_VERSION_REQUIRED' USING ERRCODE='23514';
      END IF;
      IF NEW.execution_profile IS DISTINCT FROM policy.active_profiles->TG_ARGV[0] THEN
        RAISE EXCEPTION 'AI_EXECUTION_PROFILE_CONFLICT' USING ERRCODE='23514';
      END IF;
      IF NEW.execution_profile IS DISTINCT FROM policy.baseline_profiles->TG_ARGV[0] AND foxmind_ai_legacy_pending() THEN
        RAISE EXCEPTION 'AI_LEGACY_PENDING' USING ERRCODE='23514';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER curriculum_execution_guard BEFORE INSERT OR UPDATE ON classroom_curriculum_extractions FOR EACH ROW EXECUTE FUNCTION foxmind_ai_job_profile_guard('curriculum');
CREATE TRIGGER activities_execution_guard BEFORE INSERT OR UPDATE ON activity_ai_generations FOR EACH ROW EXECUTE FUNCTION foxmind_ai_job_profile_guard('activities');
CREATE TRIGGER analysis_execution_guard BEFORE INSERT OR UPDATE ON student_ai_reports FOR EACH ROW EXECUTE FUNCTION foxmind_ai_job_profile_guard('analysis');
CREATE TRIGGER grading_execution_guard BEFORE INSERT OR UPDATE ON grading_ai_jobs FOR EACH ROW EXECUTE FUNCTION foxmind_ai_job_profile_guard('grading');
CREATE TRIGGER foxy_execution_guard BEFORE INSERT OR UPDATE ON foxy_turns FOR EACH ROW EXECUTE FUNCTION foxmind_ai_job_profile_guard('foxy');
CREATE TRIGGER study_execution_guard BEFORE INSERT OR UPDATE ON study_ai_dispatches FOR EACH ROW EXECUTE FUNCTION foxmind_ai_job_profile_guard('study');
