-- A narrowly scoped forward exception to immutable file scope, preserving all bytes/identity.
CREATE OR REPLACE FUNCTION preserve_file_custody_identity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE destination classrooms%ROWTYPE; source classroom_drafts%ROWTYPE; safe BOOLEAN; used BIGINT;
BEGIN
  IF TG_TABLE_NAME = 'files' THEN
    IF NOT EXISTS(SELECT 1 FROM file_custodies WHERE file_id=OLD.id) THEN RETURN NEW; END IF;
    IF ROW(NEW.id,NEW.uploaded_by_id,NEW.storage_key,NEW.size_bytes,NEW.extension,NEW.original_name)
      IS DISTINCT FROM ROW(OLD.id,OLD.uploaded_by_id,OLD.storage_key,OLD.size_bytes,OLD.extension,OLD.original_name) THEN
      RAISE EXCEPTION 'P4 file identity is immutable' USING ERRCODE='23514';
    END IF;
    IF ROW(NEW.classroom_id,NEW.classroom_draft_id) IS DISTINCT FROM ROW(OLD.classroom_id,OLD.classroom_draft_id) THEN
      IF OLD.classroom_id IS NOT NULL OR OLD.classroom_draft_id IS NULL
        OR NEW.classroom_id IS NULL OR NEW.classroom_draft_id IS NOT NULL THEN
        RAISE EXCEPTION 'P4 file scope is immutable outside draft publication' USING ERRCODE='23514';
      END IF;
      SELECT * INTO destination FROM classrooms WHERE id=NEW.classroom_id FOR UPDATE;
      SELECT * INTO source FROM classroom_drafts WHERE id=OLD.classroom_draft_id FOR UPDATE;
      IF source.published_classroom_id IS DISTINCT FROM NEW.classroom_id
        OR source.owner_id IS DISTINCT FROM destination.teacher_id OR source.owner_id IS DISTINCT FROM OLD.uploaded_by_id
        OR destination.archived_at IS NOT NULL THEN
        RAISE EXCEPTION 'P4 draft publication mismatch' USING ERRCODE='23514';
      END IF;
      SELECT (c.purpose='plan' AND c.target_id IS NULL AND c.phase='ready' AND c.digest IS NOT NULL
        AND c.validated_digest=c.digest AND c.scanned_digest=c.digest AND u.status='COMPLETED' AND u.completed_at IS NOT NULL
        AND NEW.validation_status='APPROVED' AND NEW.scan_status='CLEAN' AND NEW.validated_at IS NOT NULL AND NEW.scanned_at IS NOT NULL)
        INTO safe FROM file_custodies c JOIN uploads u ON u.file_id=c.file_id WHERE c.file_id=OLD.id FOR SHARE OF c,u;
      IF safe IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'P4 draft plan is not ready' USING ERRCODE='23514'; END IF;
      SELECT COALESCE(SUM(f.size_bytes),0)::bigint INTO used FROM files f LEFT JOIN uploads u ON u.file_id=f.id
        WHERE f.classroom_id=NEW.classroom_id AND (u.id IS NULL OR u.status='COMPLETED' OR u.reservation_released_at IS NULL);
      IF destination.storage_quota_bytes IS NULL OR used+NEW.size_bytes>destination.storage_quota_bytes THEN
        RAISE EXCEPTION 'P4 classroom quota exceeded' USING ERRCODE='23514';
      END IF;
    END IF;
  ELSE
    IF ROW(NEW.file_id,NEW.purpose,NEW.target_id) IS DISTINCT FROM ROW(OLD.file_id,OLD.purpose,OLD.target_id)
      OR (OLD.digest IS NOT NULL AND NEW.digest IS DISTINCT FROM OLD.digest) THEN
      RAISE EXCEPTION 'P4 custody identity is immutable' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
