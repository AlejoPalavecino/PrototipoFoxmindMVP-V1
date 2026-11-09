CREATE TABLE study_folders (
 id uuid PRIMARY KEY,
 owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','ACTIVE','ARCHIVED','DELETED')),
 revision bigint NOT NULL DEFAULT 1 CHECK(revision>0),
 state jsonb NOT NULL CHECK(jsonb_typeof(state)='object' AND state->>'version'='1'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX study_folders_owner_status_updated ON study_folders(owner_id,status,updated_at);
