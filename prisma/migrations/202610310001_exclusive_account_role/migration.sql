-- Existing accounts require an explicit product decision; no role is inferred.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM users) THEN
    RAISE EXCEPTION 'exclusive account roles require an empty users table or an explicit migration decision';
  END IF;
END $$;

ALTER TABLE users ADD COLUMN account_role TEXT NOT NULL;
ALTER TABLE users ADD CONSTRAINT users_account_role_check CHECK (account_role IN ('teacher', 'student'));

CREATE FUNCTION preserve_account_role() RETURNS trigger AS $$
BEGIN
  IF NEW.account_role IS DISTINCT FROM OLD.account_role THEN
    RAISE EXCEPTION 'account role is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER users_account_role_immutable BEFORE UPDATE OF account_role ON users
  FOR EACH ROW EXECUTE FUNCTION preserve_account_role();

CREATE FUNCTION require_teacher_account() RETURNS trigger AS $$
DECLARE role_value TEXT;
BEGIN
  IF TG_TABLE_NAME = 'classroom_drafts' THEN
    SELECT account_role INTO role_value FROM users WHERE id = NEW.owner_id FOR SHARE;
  ELSE
    SELECT account_role INTO role_value FROM users WHERE id = NEW.teacher_id FOR SHARE;
  END IF;
  IF role_value IS DISTINCT FROM 'teacher' THEN
    RAISE EXCEPTION 'classroom owner must have teacher account role';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER classroom_drafts_account_role BEFORE INSERT OR UPDATE OF owner_id ON classroom_drafts
  FOR EACH ROW EXECUTE FUNCTION require_teacher_account();
CREATE TRIGGER classrooms_account_role BEFORE INSERT OR UPDATE OF teacher_id ON classrooms
  FOR EACH ROW EXECUTE FUNCTION require_teacher_account();

CREATE FUNCTION require_student_account() RETURNS trigger AS $$
DECLARE role_value TEXT;
BEGIN
  SELECT account_role INTO role_value FROM users WHERE id = NEW.student_id FOR SHARE;
  IF role_value IS DISTINCT FROM 'student' THEN
    RAISE EXCEPTION 'enrollment requires student account role';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER enrollments_account_role BEFORE INSERT OR UPDATE OF student_id ON enrollments
  FOR EACH ROW EXECUTE FUNCTION require_student_account();
