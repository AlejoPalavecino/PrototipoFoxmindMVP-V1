-- Add an editorial overlay; generated payload and its original revision stay immutable.
ALTER TABLE foxy_visual_assets
 ADD COLUMN editorial_revision bigint NOT NULL DEFAULT 0,
 ADD COLUMN editorial_title text,
 ADD COLUMN editorial_description text,
 ADD CONSTRAINT foxy_visual_editorial_check CHECK (
   (editorial_revision=0 AND editorial_title IS NULL AND editorial_description IS NULL)
   OR (editorial_revision>0 AND editorial_title IS NOT NULL AND editorial_description IS NOT NULL
     AND char_length(btrim(editorial_title)) BETWEEN 1 AND 200 AND char_length(editorial_title)<=200
     AND char_length(editorial_description)<=12000));
CREATE FUNCTION guard_foxy_visual_editorial() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN
   IF NEW.editorial_revision<>0 OR NEW.editorial_title IS NOT NULL OR NEW.editorial_description IS NOT NULL
   THEN RAISE EXCEPTION 'editorial overlay starts empty' USING ERRCODE='23514'; END IF;
 ELSIF ROW(NEW.editorial_revision,NEW.editorial_title,NEW.editorial_description)
   IS DISTINCT FROM ROW(OLD.editorial_revision,OLD.editorial_title,OLD.editorial_description) THEN
   IF OLD.state<>'READY' OR NEW.state<>'READY' OR NEW.revision<>OLD.revision OR NEW.editorial_revision<>OLD.editorial_revision+1
   THEN RAISE EXCEPTION 'invalid editorial revision' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER foxy_visual_editorial_guard BEFORE INSERT OR UPDATE ON foxy_visual_assets
 FOR EACH ROW EXECUTE FUNCTION guard_foxy_visual_editorial();

ALTER TABLE foxy_private_asset_commands DROP CONSTRAINT foxy_private_asset_commands_action_check;
ALTER TABLE foxy_private_asset_commands ADD COLUMN editorial_revision bigint,
 ADD CONSTRAINT foxy_private_asset_commands_action_check CHECK (
   (action='DISCARD' AND editorial_revision IS NULL) OR (action='EDIT' AND editorial_revision IS NOT NULL AND editorial_revision>0));

-- Legacy publications/receipts are kept byte-for-byte; NULL denotes a pre-overlay snapshot.
ALTER TABLE foxy_publications ADD COLUMN source_editorial_revision bigint,
 ADD COLUMN snapshot_description text,
 ADD CONSTRAINT foxy_publication_editorial_check CHECK (
   (source_editorial_revision IS NULL AND snapshot_description IS NULL)
   OR (source_kind='VISUAL' AND source_editorial_revision IS NOT NULL AND source_editorial_revision>=0
     AND snapshot_description IS NOT NULL AND char_length(snapshot_description)<=12000));
CREATE UNIQUE INDEX foxy_publications_visual_editorial_unique
 ON foxy_publications(owner_id,source_asset_id,source_asset_revision,source_editorial_revision,classroom_id)
 WHERE source_kind='VISUAL' AND source_editorial_revision IS NOT NULL AND state<>'DISCARDED';
CREATE FUNCTION preserve_foxy_publication_editorial() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF ROW(NEW.source_editorial_revision,NEW.snapshot_description)
   IS DISTINCT FROM ROW(OLD.source_editorial_revision,OLD.snapshot_description)
 THEN RAISE EXCEPTION 'publication editorial snapshot is immutable' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER foxy_publication_editorial_immutable BEFORE UPDATE ON foxy_publications
 FOR EACH ROW EXECUTE FUNCTION preserve_foxy_publication_editorial();

-- A deduplicated PREPARE still needs an immutable request receipt, even after later edits.
ALTER TABLE foxy_publication_command_requests DROP CONSTRAINT foxy_command_action_check,
 ADD CONSTRAINT foxy_command_action_check CHECK(action IN ('PREPARE','RETRY','DISCARD'));
