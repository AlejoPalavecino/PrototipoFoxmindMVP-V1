-- Additive P4 metadata; preserve account/session rows and all earlier migrations.
CREATE TABLE file_custodies (
  file_id UUID PRIMARY KEY REFERENCES files(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  purpose TEXT NOT NULL CHECK (purpose IN ('plan','instructions','material','attachment')),
  target_id UUID,
  phase TEXT NOT NULL DEFAULT 'reserved' CHECK (phase IN ('reserved','receiving','inspecting','ready','rejected','deleting','deleted')),
  digest TEXT CHECK (digest IS NULL OR digest ~ '^[a-f0-9]{64}$'),
  validated_digest TEXT CHECK (validated_digest IS NULL OR validated_digest ~ '^[a-f0-9]{64}$'),
  scanned_digest TEXT CHECK (scanned_digest IS NULL OR scanned_digest ~ '^[a-f0-9]{64}$'),
  operation_id UUID,
  lease_until TIMESTAMPTZ(6),
  CONSTRAINT custody_target_check CHECK (purpose NOT IN ('instructions','attachment') OR target_id IS NOT NULL),
  CONSTRAINT custody_lease_check CHECK ((operation_id IS NULL) = (lease_until IS NULL)),
  CONSTRAINT custody_proof_check CHECK (phase <> 'ready' OR
    (digest IS NOT NULL AND validated_digest = digest AND scanned_digest = digest))
);
CREATE INDEX file_custodies_phase_lease_until_idx ON file_custodies(phase,lease_until);

CREATE FUNCTION preserve_file_custody_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'files' THEN
    IF EXISTS(SELECT 1 FROM file_custodies WHERE file_id=OLD.id) AND
      ROW(NEW.id,NEW.classroom_id,NEW.classroom_draft_id,NEW.uploaded_by_id,NEW.storage_key,NEW.size_bytes,NEW.extension,NEW.original_name)
      IS DISTINCT FROM ROW(OLD.id,OLD.classroom_id,OLD.classroom_draft_id,OLD.uploaded_by_id,OLD.storage_key,OLD.size_bytes,OLD.extension,OLD.original_name) THEN
      RAISE EXCEPTION 'P4 file identity is immutable' USING ERRCODE='23514';
    END IF;
  ELSE
    IF ROW(NEW.file_id,NEW.purpose,NEW.target_id) IS DISTINCT FROM ROW(OLD.file_id,OLD.purpose,OLD.target_id)
      OR (OLD.digest IS NOT NULL AND NEW.digest IS DISTINCT FROM OLD.digest) THEN
      RAISE EXCEPTION 'P4 custody identity is immutable' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER files_p4_identity BEFORE UPDATE ON files FOR EACH ROW EXECUTE FUNCTION preserve_file_custody_identity();
CREATE TRIGGER custody_p4_identity BEFORE UPDATE ON file_custodies FOR EACH ROW EXECUTE FUNCTION preserve_file_custody_identity();

-- Domain writers cannot link an incomplete/quarantined P4 file and race incomplete-upload cleanup.
CREATE FUNCTION require_ready_p4_file() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE state TEXT;
BEGIN
  SELECT phase INTO state FROM file_custodies WHERE file_id=NEW.file_id FOR SHARE;
  IF FOUND AND state <> 'ready' THEN
    RAISE EXCEPTION 'P4 file is not ready' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER plan_p4_ready BEFORE INSERT OR UPDATE OF file_id ON study_plan_versions FOR EACH ROW EXECUTE FUNCTION require_ready_p4_file();
CREATE TRIGGER material_p4_ready BEFORE INSERT OR UPDATE OF file_id ON materials FOR EACH ROW EXECUTE FUNCTION require_ready_p4_file();
CREATE TRIGGER instruction_p4_ready BEFORE INSERT OR UPDATE OF file_id ON activity_instruction_files FOR EACH ROW EXECUTE FUNCTION require_ready_p4_file();
CREATE TRIGGER attachment_p4_ready BEFORE INSERT OR UPDATE OF file_id ON attempt_attachments FOR EACH ROW EXECUTE FUNCTION require_ready_p4_file();
