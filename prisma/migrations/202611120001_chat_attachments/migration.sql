CREATE TABLE chat_attachments (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  conversation_id uuid NOT NULL,
  folder_id uuid REFERENCES study_folders(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  extension text NOT NULL CHECK (extension IN ('pdf', 'docx')),
  size_bytes integer NOT NULL CHECK (size_bytes BETWEEN 1 AND 20000000),
  digest text NOT NULL CHECK (digest ~ '^[a-f0-9]{64}$'),
  save_to_folder boolean NOT NULL CHECK (NOT save_to_folder OR folder_id IS NOT NULL),
  ready_at timestamptz,
  removed_at timestamptz,
  cleaned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX chat_attachments_scope_idx ON chat_attachments(owner_id, conversation_id, folder_id);
