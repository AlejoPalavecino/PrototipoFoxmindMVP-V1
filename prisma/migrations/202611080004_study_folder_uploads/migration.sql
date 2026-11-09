CREATE TABLE study_folder_uploads (
  id uuid PRIMARY KEY,
  folder_id uuid NOT NULL REFERENCES study_folders(id) ON DELETE RESTRICT,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  purpose text NOT NULL CHECK(purpose IN ('plan','material')),
  original_name text NOT NULL,
  extension text NOT NULL,
  size_bytes bigint NOT NULL CHECK(size_bytes BETWEEN 1 AND 50000000),
  storage_key text NOT NULL UNIQUE,
  phase text NOT NULL DEFAULT 'STARTED' CHECK(phase IN ('STARTED','PROCESSING','READY','REJECTED','ERROR')),
  mime text,
  digest text,
  validated_digest text,
  scanned_digest text,
  operation_id uuid,
  rejection_code text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT study_upload_ready CHECK(phase <> 'READY' OR (digest ~ '^[a-f0-9]{64}$' AND validated_digest=digest AND scanned_digest=digest))
);
CREATE INDEX study_upload_owner_folder ON study_folder_uploads(owner_id,folder_id);
