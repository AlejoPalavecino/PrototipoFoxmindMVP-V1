CREATE TABLE classroom_curriculum_extractions (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  draft_id uuid NOT NULL REFERENCES classroom_drafts(id) ON DELETE RESTRICT,
  file_id uuid NOT NULL REFERENCES files(id) ON DELETE RESTRICT,
  source_digest text NOT NULL CHECK (source_digest ~ '^[a-f0-9]{64}$'),
  base_revision bigint NOT NULL,
  schema_version text NOT NULL,
  prompt_version text NOT NULL,
  model text NOT NULL,
  generation integer NOT NULL DEFAULT 0,
  state text NOT NULL DEFAULT 'QUEUED' CHECK (state IN ('QUEUED','RUNNING','READY','FAILED','STALE','APPLIED')),
  proposal jsonb,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  completed_at timestamptz,
  next_attempt_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  dispatch_count integer NOT NULL DEFAULT 0 CHECK (dispatch_count >= 0),
  lease_nonce uuid,
  lease_until timestamptz,
  dispatch_started_at timestamptz,
  retry_of uuid UNIQUE REFERENCES classroom_curriculum_extractions(id) ON DELETE RESTRICT,
  apply_request_id uuid,
  apply_input_hash text,
  applied_revision bigint,
  input_tokens bigint,
  output_tokens bigint,
  reserved_microusd bigint NOT NULL DEFAULT 0 CHECK (reserved_microusd >= 0),
  usage_day date,
  UNIQUE(draft_id,file_id,source_digest,schema_version,prompt_version,generation),
  UNIQUE(owner_id,apply_request_id),
  CHECK ((state='RUNNING') = (lease_nonce IS NOT NULL AND lease_until IS NOT NULL))
);
CREATE INDEX classroom_curriculum_extractions_queue ON classroom_curriculum_extractions(state,next_attempt_at);
CREATE TABLE classroom_ai_requests (
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  request_id uuid NOT NULL,
  operation text NOT NULL CHECK (operation IN ('retry','apply')),
  input_hash text NOT NULL,
  extraction_id uuid NOT NULL REFERENCES classroom_curriculum_extractions(id) ON DELETE RESTRICT,
  PRIMARY KEY(owner_id,request_id)
);
CREATE TABLE ai_usage_daily (
  day date NOT NULL,
  scope text NOT NULL,
  capability text NOT NULL DEFAULT 'study-plan-v1',
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  reserved_microusd bigint NOT NULL DEFAULT 0 CHECK (reserved_microusd >= 0),
  consumed_microusd bigint NOT NULL DEFAULT 0 CHECK (consumed_microusd >= 0),
  input_tokens bigint NOT NULL DEFAULT 0,
  output_tokens bigint NOT NULL DEFAULT 0,
  PRIMARY KEY(day,scope,capability)
);
