ALTER TABLE foxy_publications DROP CONSTRAINT foxy_publications_state_check;
ALTER TABLE foxy_publications ADD COLUMN discarded_at timestamptz(6), ADD COLUMN cleanup_error_code text;
ALTER TABLE foxy_publications ADD CONSTRAINT foxy_publications_state_check CHECK (state IN ('PREPARING','READY','FAILED','PUBLISHED','DISCARDED')),
  ADD CONSTRAINT foxy_publications_discard_check CHECK ((state='DISCARDED') = (discarded_at IS NOT NULL) AND (state<>'DISCARDED' OR (material_id IS NULL AND lease_nonce IS NULL AND lease_until IS NULL))),
  ADD CONSTRAINT foxy_publications_cleanup_error_check CHECK (cleanup_error_code IS NULL OR cleanup_error_code IN ('STORAGE_UNAVAILABLE','REFERENCE_CONFLICT'));
CREATE TABLE foxy_publication_command_requests (
  owner_id uuid NOT NULL, request_id uuid NOT NULL, publication_id uuid NOT NULL, action text NOT NULL,
  input_hash text NOT NULL, publication_revision bigint NOT NULL, created_at timestamptz(6) NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(owner_id,request_id),
  CONSTRAINT foxy_command_publication_fkey FOREIGN KEY(publication_id,owner_id) REFERENCES foxy_publications(id,owner_id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT foxy_command_action_check CHECK(action IN ('RETRY','DISCARD')),
  CONSTRAINT foxy_command_hash_check CHECK(input_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT foxy_command_revision_check CHECK(publication_revision >= 0)
);
CREATE FUNCTION preserve_foxy_discard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.state='DISCARDED' AND (NEW.state <> 'DISCARDED' OR NEW.discarded_at IS DISTINCT FROM OLD.discarded_at OR
    ROW(NEW.id,NEW.owner_id,NEW.resource_id,NEW.resource_revision,NEW.snapshot_title,NEW.snapshot_markdown,NEW.classroom_id,NEW.unit_id,NEW.topic_id,NEW.title,NEW.file_id,NEW.artifact_digest,NEW.artifact_size_bytes,NEW.artifact_page_count,NEW.renderer_version)
    IS DISTINCT FROM ROW(OLD.id,OLD.owner_id,OLD.resource_id,OLD.resource_revision,OLD.snapshot_title,OLD.snapshot_markdown,OLD.classroom_id,OLD.unit_id,OLD.topic_id,OLD.title,OLD.file_id,OLD.artifact_digest,OLD.artifact_size_bytes,OLD.artifact_page_count,OLD.renderer_version)) THEN
    RAISE EXCEPTION 'Discarded publication is immutable' USING ERRCODE='23514';
  END IF; RETURN NEW;
END $$;
CREATE TRIGGER foxy_discard_terminal BEFORE UPDATE ON foxy_publications FOR EACH ROW EXECUTE FUNCTION preserve_foxy_discard();
CREATE FUNCTION preserve_foxy_discard_custody() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_now timestamptz := clock_timestamp();
BEGIN
  IF NOT EXISTS(SELECT 1 FROM foxy_publications WHERE file_id=OLD.file_id AND state='DISCARDED') THEN RETURN NEW; END IF;
  IF OLD.phase='deleted' THEN
    IF NEW.phase<>'deleted' OR NEW.operation_id IS NOT NULL OR NEW.lease_until IS NOT NULL THEN
      RAISE EXCEPTION 'Deleted custody is terminal' USING ERRCODE='23514';
    END IF; RETURN NEW;
  END IF;
  IF OLD.phase<>'deleting' OR NEW.phase NOT IN ('deleting','deleted') THEN
    RAISE EXCEPTION 'Discarded custody is terminal' USING ERRCODE='23514';
  END IF;
  IF NEW.phase='deleted' THEN
    IF OLD.operation_id IS NULL OR OLD.lease_until IS NULL OR OLD.lease_until<=v_now OR NEW.operation_id IS NOT NULL OR NEW.lease_until IS NOT NULL
      OR NOT EXISTS(SELECT 1 FROM files WHERE id=OLD.file_id AND blob_deleted_at IS NOT NULL) THEN
      RAISE EXCEPTION 'Deletion acknowledgement requires an active claim' USING ERRCODE='23514';
    END IF; RETURN NEW;
  END IF;
  IF ROW(NEW.operation_id,NEW.lease_until) IS NOT DISTINCT FROM ROW(OLD.operation_id,OLD.lease_until) THEN RETURN NEW; END IF;
  IF OLD.lease_until IS NOT NULL AND OLD.lease_until>v_now THEN
    IF NEW.operation_id IS DISTINCT FROM OLD.operation_id OR NEW.lease_until IS NULL OR NEW.lease_until<OLD.lease_until THEN
      RAISE EXCEPTION 'Active deletion claim is fenced' USING ERRCODE='23514';
    END IF;
  ELSIF NEW.operation_id IS NULL OR NEW.operation_id IS NOT DISTINCT FROM OLD.operation_id OR NEW.lease_until IS NULL OR NEW.lease_until<statement_timestamp()+interval '90 seconds' THEN
    RAISE EXCEPTION 'New deletion claim requires quiet lease' USING ERRCODE='23514';
  ELSE
    NEW.lease_until := GREATEST(NEW.lease_until,v_now+interval '90 seconds');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER foxy_discard_custody BEFORE UPDATE ON file_custodies FOR EACH ROW EXECUTE FUNCTION preserve_foxy_discard_custody();
CREATE OR REPLACE FUNCTION preserve_p6_blob_removal() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.blob_deleted_at IS NOT NULL AND NEW.blob_deleted_at IS DISTINCT FROM OLD.blob_deleted_at THEN RAISE EXCEPTION 'Removed blob cannot be restored'; END IF;
  IF OLD.blob_deleted_at IS NULL AND NEW.blob_deleted_at IS NOT NULL AND (
    NOT (EXISTS(SELECT 1 FROM materials WHERE file_id=OLD.id AND deleted_at IS NOT NULL)
      OR EXISTS(SELECT 1 FROM foxy_publications WHERE file_id=OLD.id AND state='DISCARDED' AND material_id IS NULL))
    OR EXISTS(SELECT 1 FROM materials WHERE file_id=OLD.id AND deleted_at IS NULL)
    OR EXISTS(SELECT 1 FROM study_plan_versions WHERE file_id=OLD.id)
    OR EXISTS(SELECT 1 FROM activity_instruction_files WHERE file_id=OLD.id)
    OR EXISTS(SELECT 1 FROM attempt_attachments WHERE file_id=OLD.id)
    OR EXISTS(SELECT 1 FROM foxy_publications p WHERE p.file_id=OLD.id AND p.state<>'DISCARDED'
      AND NOT (p.state='PUBLISHED' AND EXISTS(SELECT 1 FROM materials m WHERE m.id=p.material_id AND m.file_id=OLD.id AND m.deleted_at IS NOT NULL)))) THEN RAISE EXCEPTION 'Referenced file cannot be removed'; END IF;
  RETURN NEW;
END $$;
CREATE FUNCTION preserve_foxy_command_receipt() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Foxy command receipt is immutable' USING ERRCODE='23514';
END $$;
CREATE TRIGGER foxy_command_receipt_immutable BEFORE UPDATE OR DELETE ON foxy_publication_command_requests FOR EACH ROW EXECUTE FUNCTION preserve_foxy_command_receipt();
