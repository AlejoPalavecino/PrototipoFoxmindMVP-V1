-- Forward hardening after observed P4 SQL invariant RED; retain the applied custody migration unchanged.
ALTER TABLE file_custodies DROP CONSTRAINT custody_proof_check;
ALTER TABLE file_custodies ADD CONSTRAINT custody_proof_check CHECK (phase <> 'ready' OR
  (digest IS NOT NULL AND validated_digest IS NOT NULL AND scanned_digest IS NOT NULL
    AND validated_digest=digest AND scanned_digest=digest));

CREATE OR REPLACE FUNCTION require_ready_p4_file() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE safe BOOLEAN;
BEGIN
  SELECT (c.phase='ready' AND c.digest IS NOT NULL AND c.validated_digest=c.digest AND c.scanned_digest=c.digest
      AND f.validation_status='APPROVED' AND f.scan_status='CLEAN' AND f.validated_at IS NOT NULL AND f.scanned_at IS NOT NULL
      AND u.status='COMPLETED' AND u.completed_at IS NOT NULL)
    INTO safe FROM file_custodies c JOIN files f ON f.id=c.file_id LEFT JOIN uploads u ON u.file_id=c.file_id
    WHERE c.file_id=NEW.file_id FOR SHARE OF c;
  IF FOUND AND safe IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'P4 file is not ready' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
