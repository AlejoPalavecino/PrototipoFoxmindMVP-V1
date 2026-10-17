BEGIN;
ALTER TABLE classrooms ADD COLUMN revision bigint NOT NULL DEFAULT 0;
ALTER TABLE classrooms ADD CONSTRAINT p5_revision_nonnegative CHECK (revision >= 0);
CREATE FUNCTION p5_classroom_identity_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.teacher_id IS DISTINCT FROM OLD.teacher_id OR NEW.timezone IS DISTINCT FROM OLD.timezone THEN
    RAISE EXCEPTION 'Classroom owner and timezone are immutable' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER p5_classroom_identity_guard BEFORE UPDATE ON classrooms
  FOR EACH ROW EXECUTE FUNCTION p5_classroom_identity_immutable();
COMMIT;
