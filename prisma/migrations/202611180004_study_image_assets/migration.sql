CREATE TABLE study_image_assets (
 id uuid PRIMARY KEY,
 folder_id uuid NOT NULL REFERENCES study_folders(id) ON DELETE RESTRICT,
 owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 mime_type text NOT NULL CHECK (mime_type IN ('image/png', 'image/jpeg')),
 bytes bytea NOT NULL CHECK (octet_length(bytes) BETWEEN 1 AND 10485760),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX study_image_assets_by_owner ON study_image_assets(owner_id, folder_id);
