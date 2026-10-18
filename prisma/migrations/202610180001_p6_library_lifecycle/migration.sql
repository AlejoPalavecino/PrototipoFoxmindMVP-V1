-- Existing materials/files remain active. Only explicit confirmed unlinked deletion creates a tombstone.
ALTER TABLE materials ADD COLUMN deleted_at TIMESTAMPTZ(6), ADD COLUMN deletion_claim_token UUID,
  ADD COLUMN deletion_lease_until TIMESTAMPTZ(6), ADD COLUMN deletion_error_code TEXT;
ALTER TABLE files ADD COLUMN blob_deleted_at TIMESTAMPTZ(6);
CREATE INDEX materials_deleted_at_deletion_lease_until_idx ON materials(deleted_at,deletion_lease_until);

CREATE FUNCTION preserve_p6_material() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.file_id IS DISTINCT FROM OLD.file_id OR NEW.classroom_id IS DISTINCT FROM OLD.classroom_id
    OR NEW.created_by_id IS DISTINCT FROM OLD.created_by_id OR (OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS DISTINCT FROM OLD.deleted_at) THEN
    RAISE EXCEPTION 'Material identity is immutable';
  END IF;
  IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL AND EXISTS(SELECT 1 FROM activity_materials WHERE material_id=OLD.id) THEN
    RAISE EXCEPTION 'Linked material cannot be deleted';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER material_p6_identity BEFORE UPDATE ON materials FOR EACH ROW EXECUTE FUNCTION preserve_p6_material();

CREATE FUNCTION require_active_p6_material() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE removed TIMESTAMPTZ;
BEGIN
  SELECT deleted_at INTO removed FROM materials WHERE id=NEW.material_id FOR SHARE;
  IF removed IS NOT NULL THEN RAISE EXCEPTION 'Deleted material cannot be linked'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER activity_material_p6_active BEFORE INSERT OR UPDATE OF material_id ON activity_materials FOR EACH ROW EXECUTE FUNCTION require_active_p6_material();

CREATE FUNCTION preserve_p6_blob_removal() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.blob_deleted_at IS NOT NULL AND NEW.blob_deleted_at IS DISTINCT FROM OLD.blob_deleted_at THEN
    RAISE EXCEPTION 'Removed blob cannot be restored';
  END IF;
  IF OLD.blob_deleted_at IS NULL AND NEW.blob_deleted_at IS NOT NULL AND (
    NOT EXISTS(SELECT 1 FROM materials WHERE file_id=OLD.id AND deleted_at IS NOT NULL)
    OR EXISTS(SELECT 1 FROM materials WHERE file_id=OLD.id AND deleted_at IS NULL)
    OR EXISTS(SELECT 1 FROM study_plan_versions WHERE file_id=OLD.id)
    OR EXISTS(SELECT 1 FROM activity_instruction_files WHERE file_id=OLD.id)
    OR EXISTS(SELECT 1 FROM attempt_attachments WHERE file_id=OLD.id)) THEN
    RAISE EXCEPTION 'Referenced file cannot be removed';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER file_p6_removal BEFORE UPDATE OF blob_deleted_at ON files FOR EACH ROW EXECUTE FUNCTION preserve_p6_blob_removal();
