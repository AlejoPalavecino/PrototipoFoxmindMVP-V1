-- Permit tagged PDFs while retaining accepted historical versions and artifact immutability.
ALTER TABLE foxy_publications DROP CONSTRAINT foxy_publications_artifact_check,
 ADD CONSTRAINT foxy_publications_artifact_check CHECK (COALESCE((
  (file_id IS NULL AND artifact_digest IS NULL AND artifact_size_bytes IS NULL AND artifact_page_count IS NULL AND renderer_version IS NULL AND artifact_mime_type IS NULL AND artifact_width IS NULL AND artifact_height IS NULL)
  OR (source_kind='TEXT' AND file_id IS NOT NULL AND artifact_digest IS NOT NULL AND artifact_size_bytes IS NOT NULL AND artifact_page_count IS NOT NULL AND renderer_version IS NOT NULL
    AND artifact_mime_type='application/pdf' AND artifact_width IS NULL AND artifact_height IS NULL AND artifact_digest ~ '^[a-f0-9]{64}$' AND artifact_size_bytes BETWEEN 1 AND 20000000 AND artifact_page_count BETWEEN 1 AND 100 AND renderer_version IN ('foxy-text-pdf-v1','foxy-pdf-v1','foxy-pdf-v2'))
  OR (source_kind='VISUAL' AND file_id IS NOT NULL AND artifact_digest IS NOT NULL AND artifact_size_bytes IS NOT NULL AND artifact_page_count IS NULL AND renderer_version IS NOT NULL
    AND artifact_mime_type IS NOT NULL AND artifact_width IS NOT NULL AND artifact_height IS NOT NULL AND artifact_digest ~ '^[a-f0-9]{64}$' AND artifact_size_bytes BETWEEN 1 AND 10485760
    AND artifact_mime_type IN ('image/png','image/jpeg') AND artifact_width BETWEEN 1 AND 4096 AND artifact_height BETWEEN 1 AND 4096 AND artifact_width::bigint*artifact_height<=4000000
    AND renderer_version IN ('foxy-image-original-v1','foxy-diagram-png-v1') AND (renderer_version<>'foxy-diagram-png-v1' OR artifact_mime_type='image/png')
    AND COALESCE(artifact_digest=snapshot_visual->>'digest' AND artifact_size_bytes::text=snapshot_visual->>'sizeBytes' AND artifact_mime_type=snapshot_visual->>'mimeType'
      AND artifact_width::text=snapshot_visual->>'width' AND artifact_height::text=snapshot_visual->>'height' AND renderer_version=snapshot_visual->>'producerVersion',false))),false));