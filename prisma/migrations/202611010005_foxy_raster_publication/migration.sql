ALTER TABLE foxy_publications ALTER COLUMN resource_id DROP NOT NULL, ALTER COLUMN resource_revision DROP NOT NULL,
 ALTER COLUMN snapshot_markdown DROP NOT NULL;
ALTER TABLE foxy_publications ADD COLUMN source_kind text NOT NULL DEFAULT 'TEXT', ADD COLUMN source_asset_id uuid,
 ADD COLUMN source_asset_revision bigint, ADD COLUMN snapshot_visual jsonb,
 ADD COLUMN artifact_mime_type text, ADD COLUMN artifact_width integer, ADD COLUMN artifact_height integer;
UPDATE foxy_publications SET artifact_mime_type='application/pdf' WHERE file_id IS NOT NULL;
CREATE FUNCTION default_foxy_pdf_artifact_mime() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.source_kind='TEXT' AND NEW.file_id IS NOT NULL AND NEW.artifact_mime_type IS NULL THEN NEW.artifact_mime_type := 'application/pdf'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER foxy_pdf_artifact_mime BEFORE INSERT OR UPDATE ON foxy_publications FOR EACH ROW EXECUTE FUNCTION default_foxy_pdf_artifact_mime();
ALTER TABLE foxy_publications DROP CONSTRAINT foxy_publications_revision_check, DROP CONSTRAINT foxy_publications_artifact_check;
ALTER TABLE foxy_publications ADD CONSTRAINT foxy_publications_asset_fkey FOREIGN KEY(source_asset_id,owner_id)
 REFERENCES foxy_visual_assets(id,owner_id) ON DELETE RESTRICT ON UPDATE NO ACTION,
 ADD CONSTRAINT foxy_publications_revision_check CHECK(revision>=0 AND (resource_revision IS NULL OR resource_revision>=0) AND (source_asset_revision IS NULL OR source_asset_revision>=0)),
 ADD CONSTRAINT foxy_publications_source_check CHECK (
  (source_kind='TEXT' AND resource_id IS NOT NULL AND resource_revision IS NOT NULL AND snapshot_markdown IS NOT NULL AND source_asset_id IS NULL AND source_asset_revision IS NULL AND snapshot_visual IS NULL)
  OR (source_kind='VISUAL' AND resource_id IS NULL AND resource_revision IS NULL AND snapshot_markdown IS NULL AND source_asset_id IS NOT NULL AND source_asset_revision IS NOT NULL AND snapshot_visual IS NOT NULL
    AND COALESCE(jsonb_typeof(snapshot_visual)='object' AND jsonb_typeof(snapshot_visual->'kind')='string' AND jsonb_typeof(snapshot_visual->'assetId')='string'
      AND jsonb_typeof(snapshot_visual->'assetRevision')='string' AND jsonb_typeof(snapshot_visual->'digest')='string' AND jsonb_typeof(snapshot_visual->'sizeBytes')='number'
      AND jsonb_typeof(snapshot_visual->'mimeType')='string' AND jsonb_typeof(snapshot_visual->'width')='number' AND jsonb_typeof(snapshot_visual->'height')='number'
      AND jsonb_typeof(snapshot_visual->'producerVersion')='string' AND snapshot_visual->>'kind'='VISUAL' AND snapshot_visual->>'assetId'=source_asset_id::text AND snapshot_visual->>'assetRevision'=source_asset_revision::text
      AND (snapshot_visual->>'digest') ~ '^[a-f0-9]{64}$' AND (snapshot_visual->>'sizeBytes') ~ '^[1-9][0-9]{0,7}$'
      AND (snapshot_visual->>'mimeType') IN ('image/png','image/jpeg') AND (snapshot_visual->>'width') ~ '^[1-9][0-9]{0,3}$' AND (snapshot_visual->>'height') ~ '^[1-9][0-9]{0,3}$'
      AND snapshot_visual->>'producerVersion' IN ('foxy-image-original-v1','foxy-diagram-png-v1')
      AND (snapshot_visual->>'producerVersion'<>'foxy-diagram-png-v1' OR snapshot_visual->>'mimeType'='image/png')
      AND snapshot_visual - ARRAY['kind','assetId','assetRevision','digest','sizeBytes','mimeType','width','height','producerVersion'] = '{}'::jsonb
      AND CASE WHEN (snapshot_visual->>'sizeBytes') ~ '^[1-9][0-9]{0,7}$' AND (snapshot_visual->>'width') ~ '^[1-9][0-9]{0,3}$' AND (snapshot_visual->>'height') ~ '^[1-9][0-9]{0,3}$'
        THEN (snapshot_visual->>'sizeBytes')::bigint<=10485760 AND (snapshot_visual->>'width')::bigint<=4096 AND (snapshot_visual->>'height')::bigint<=4096
          AND (snapshot_visual->>'width')::bigint*(snapshot_visual->>'height')::bigint<=4000000 ELSE false END,false))),
 ADD CONSTRAINT foxy_publications_artifact_check CHECK (COALESCE((
  (file_id IS NULL AND artifact_digest IS NULL AND artifact_size_bytes IS NULL AND artifact_page_count IS NULL AND renderer_version IS NULL AND artifact_mime_type IS NULL AND artifact_width IS NULL AND artifact_height IS NULL)
  OR (source_kind='TEXT' AND file_id IS NOT NULL AND artifact_digest IS NOT NULL AND artifact_size_bytes IS NOT NULL AND artifact_page_count IS NOT NULL AND renderer_version IS NOT NULL
    AND artifact_mime_type='application/pdf' AND artifact_width IS NULL AND artifact_height IS NULL AND artifact_digest ~ '^[a-f0-9]{64}$' AND artifact_size_bytes BETWEEN 1 AND 20000000 AND artifact_page_count BETWEEN 1 AND 100 AND renderer_version IN ('foxy-text-pdf-v1','foxy-pdf-v1'))
  OR (source_kind='VISUAL' AND file_id IS NOT NULL AND artifact_digest IS NOT NULL AND artifact_size_bytes IS NOT NULL AND artifact_page_count IS NULL AND renderer_version IS NOT NULL
    AND artifact_mime_type IS NOT NULL AND artifact_width IS NOT NULL AND artifact_height IS NOT NULL AND artifact_digest ~ '^[a-f0-9]{64}$' AND artifact_size_bytes BETWEEN 1 AND 10485760
    AND artifact_mime_type IN ('image/png','image/jpeg') AND artifact_width BETWEEN 1 AND 4096 AND artifact_height BETWEEN 1 AND 4096 AND artifact_width::bigint*artifact_height<=4000000
    AND renderer_version IN ('foxy-image-original-v1','foxy-diagram-png-v1') AND (renderer_version<>'foxy-diagram-png-v1' OR artifact_mime_type='image/png')
    AND COALESCE(artifact_digest=snapshot_visual->>'digest' AND artifact_size_bytes::text=snapshot_visual->>'sizeBytes' AND artifact_mime_type=snapshot_visual->>'mimeType'
      AND artifact_width::text=snapshot_visual->>'width' AND artifact_height::text=snapshot_visual->>'height' AND renderer_version=snapshot_visual->>'producerVersion',false))),false));
CREATE FUNCTION preserve_foxy_publication_source() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF ROW(NEW.source_kind,NEW.source_asset_id,NEW.source_asset_revision,NEW.snapshot_visual,NEW.resource_id,NEW.resource_revision,NEW.snapshot_title,NEW.snapshot_markdown)
  IS DISTINCT FROM ROW(OLD.source_kind,OLD.source_asset_id,OLD.source_asset_revision,OLD.snapshot_visual,OLD.resource_id,OLD.resource_revision,OLD.snapshot_title,OLD.snapshot_markdown)
 THEN RAISE EXCEPTION 'Publication source is immutable' USING ERRCODE='23514'; END IF;
 IF OLD.file_id IS NOT NULL AND ROW(NEW.file_id,NEW.artifact_digest,NEW.artifact_size_bytes,NEW.artifact_page_count,NEW.renderer_version,NEW.artifact_mime_type,NEW.artifact_width,NEW.artifact_height)
  IS DISTINCT FROM ROW(OLD.file_id,OLD.artifact_digest,OLD.artifact_size_bytes,OLD.artifact_page_count,OLD.renderer_version,OLD.artifact_mime_type,OLD.artifact_width,OLD.artifact_height)
 THEN RAISE EXCEPTION 'Publication artifact is immutable' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER foxy_publication_source_immutable BEFORE UPDATE ON foxy_publications FOR EACH ROW EXECUTE FUNCTION preserve_foxy_publication_source();
