-- Forward-only correction of independently reproduced database contract gaps.
-- Existing invalid rows make validation fail; no stored text or history is rewritten.
BEGIN;

ALTER TABLE users
  DROP CONSTRAINT users_first_name_check,
  DROP CONSTRAINT users_last_name_check,
  ADD CONSTRAINT users_first_name_check CHECK (btrim(first_name) <> '' AND char_length(first_name) <= 80),
  ADD CONSTRAINT users_last_name_check CHECK (btrim(last_name) <> '' AND char_length(last_name) <= 80);
ALTER TABLE classrooms
  DROP CONSTRAINT classroom_name_check,
  DROP CONSTRAINT classroom_subject_check,
  DROP CONSTRAINT classroom_division_check,
  ADD CONSTRAINT classroom_name_check CHECK (btrim(name) <> '' AND char_length(name) <= 120),
  ADD CONSTRAINT classroom_subject_check CHECK (btrim(subject) <> '' AND char_length(subject) <= 120),
  ADD CONSTRAINT classroom_division_check CHECK (btrim(division) <> '' AND char_length(division) <= 60);
ALTER TABLE units
  DROP CONSTRAINT unit_fields_check,
  ADD CONSTRAINT unit_fields_check CHECK (btrim(name) <> '' AND char_length(name) <= 120 AND position >= 0);
ALTER TABLE topics
  DROP CONSTRAINT topic_fields_check,
  ADD CONSTRAINT topic_fields_check CHECK (btrim(name) <> '' AND char_length(name) <= 120 AND position >= 0);
ALTER TABLE materials
  DROP CONSTRAINT material_title_check,
  ADD CONSTRAINT material_title_check CHECK (btrim(title) <> '' AND char_length(title) <= 200);
ALTER TABLE activities
  DROP CONSTRAINT activity_title_check,
  ADD CONSTRAINT activity_title_check CHECK (title IS NULL OR (btrim(title) <> '' AND char_length(title) <= 200));
ALTER TABLE grade_corrections
  DROP CONSTRAINT correction_reason_check,
  ADD CONSTRAINT correction_reason_check CHECK (btrim(reason) <> '' AND char_length(reason) <= 5000);
ALTER TABLE wall_posts
  DROP CONSTRAINT post_body_check,
  ADD CONSTRAINT post_body_check CHECK (
    (removed_at IS NULL AND body IS NOT NULL AND btrim(body) <> '' AND char_length(body) <= 5000 AND removed_by_id IS NULL)
    OR (removed_at IS NOT NULL AND removed_by_id IS NOT NULL AND (body IS NULL OR char_length(body) <= 5000))
  );
ALTER TABLE wall_replies
  DROP CONSTRAINT reply_body_check,
  ADD CONSTRAINT reply_body_check CHECK (
    (removed_at IS NULL AND body IS NOT NULL AND btrim(body) <> '' AND char_length(body) <= 5000 AND removed_by_id IS NULL)
    OR (removed_at IS NOT NULL AND removed_by_id IS NOT NULL AND (body IS NULL OR char_length(body) <= 5000))
  );

-- Lock the attempt during publication so a concurrent status change cannot race it.
CREATE OR REPLACE FUNCTION check_grade_submission() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_published THEN
    PERFORM 1 FROM attempts WHERE id = NEW.attempt_id AND status = 'SUBMITTED' FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Grade publication requires a submitted attempt' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Check the reverse transition as well: published records must not point to a draft.
CREATE FUNCTION prevent_published_attempt_reversion() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status <> 'SUBMITTED' AND EXISTS (
    SELECT 1 FROM attempt_grades WHERE attempt_id = OLD.id AND is_published
  ) THEN
    RAISE EXCEPTION 'A published grade requires its attempt to remain submitted' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER published_attempt_status_guard BEFORE UPDATE OF status ON attempts
  FOR EACH ROW EXECUTE FUNCTION prevent_published_attempt_reversion();

COMMIT;
