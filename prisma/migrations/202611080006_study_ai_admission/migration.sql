CREATE TABLE study_ai_dispatches (
 id uuid PRIMARY KEY,
 owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 request_id uuid NOT NULL,
 state text NOT NULL DEFAULT 'RUNNING' CHECK(state IN ('RUNNING','DONE','FAILED')),
 lease_until timestamptz NOT NULL,
 reserved_microusd bigint NOT NULL DEFAULT 0,
 usage_day date,
 input_tokens bigint,
 output_tokens bigint,
 dispatch_started_at timestamptz,
 dispatch_count integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(owner_id,request_id)
);
CREATE INDEX study_ai_running ON study_ai_dispatches(owner_id,lease_until) WHERE state='RUNNING';
