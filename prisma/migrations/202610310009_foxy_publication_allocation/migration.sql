ALTER TABLE foxy_publications ADD COLUMN lease_nonce uuid, ADD COLUMN lease_until timestamptz(6),
  ADD COLUMN file_id uuid UNIQUE, ADD COLUMN artifact_digest text, ADD COLUMN artifact_size_bytes integer,
  ADD COLUMN artifact_page_count integer, ADD COLUMN renderer_version text,
  ADD CONSTRAINT foxy_publications_file_fkey FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  ADD CONSTRAINT foxy_publications_lease_check CHECK ((lease_nonce IS NULL) = (lease_until IS NULL)),
  ADD CONSTRAINT foxy_publications_artifact_check CHECK (
    (file_id IS NULL AND artifact_digest IS NULL AND artifact_size_bytes IS NULL AND artifact_page_count IS NULL AND renderer_version IS NULL)
    OR (file_id IS NOT NULL AND artifact_digest IS NOT NULL AND artifact_size_bytes IS NOT NULL
      AND artifact_page_count IS NOT NULL AND renderer_version IS NOT NULL AND artifact_digest ~ '^[a-f0-9]{64}$' AND artifact_size_bytes BETWEEN 1 AND 20000000
      AND artifact_page_count BETWEEN 1 AND 100 AND renderer_version IN ('foxy-text-pdf-v1','foxy-pdf-v1')));
