CREATE TABLE study_shared_strategies (
  id uuid PRIMARY KEY,
  folder_id uuid NOT NULL UNIQUE REFERENCES study_folders(id) ON DELETE RESTRICT,
  classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE RESTRICT,
  membership_period_id uuid NOT NULL REFERENCES membership_periods(id) ON DELETE RESTRICT,
  text text NOT NULL CHECK (char_length(text) BETWEEN 1 AND 1000 AND text ~ '[^[:space:]]'),
  shared_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX study_shared_strategies_by_audience ON study_shared_strategies(classroom_id, membership_period_id);
CREATE INDEX study_shared_strategies_by_period ON study_shared_strategies(membership_period_id);

CREATE FUNCTION verify_study_strategy_audience() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM study_folders f
    JOIN classrooms c ON c.id=NEW.classroom_id AND c.archived_at IS NULL
    JOIN enrollments e ON e.classroom_id=c.id AND e.student_id=f.owner_id
    JOIN membership_periods p ON p.id=NEW.membership_period_id AND p.enrollment_id=e.id
      AND p.classroom_id=c.id AND p.ended_at IS NULL
    WHERE f.id=NEW.folder_id AND f.status='ACTIVE'
      AND lower(f.state #>> '{fields,linkedClassroomId}')=c.id::text
    FOR SHARE OF f,c,p
  ) THEN
    RAISE EXCEPTION 'Study strategy audience is not current' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER study_strategy_current_audience
  BEFORE INSERT OR UPDATE ON study_shared_strategies
  FOR EACH ROW EXECUTE FUNCTION verify_study_strategy_audience();

CREATE FUNCTION revoke_study_strategy_on_folder_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM study_shared_strategies WHERE folder_id=NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER study_strategy_folder_change
  AFTER UPDATE OF state,status ON study_folders
  FOR EACH ROW WHEN (
    (OLD.status='ACTIVE' AND NEW.status<>'ACTIVE')
    OR lower(OLD.state #>> '{fields,linkedClassroomId}') IS DISTINCT FROM lower(NEW.state #>> '{fields,linkedClassroomId}')
  )
  EXECUTE FUNCTION revoke_study_strategy_on_folder_change();

CREATE FUNCTION revoke_study_strategies_on_classroom_archive() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM study_shared_strategies WHERE classroom_id=NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER study_strategy_classroom_archive
  AFTER UPDATE OF archived_at ON classrooms
  FOR EACH ROW WHEN (OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL)
  EXECUTE FUNCTION revoke_study_strategies_on_classroom_archive();

CREATE FUNCTION revoke_study_strategies_on_membership_end() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM study_shared_strategies WHERE membership_period_id=NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER study_strategy_membership_end
  AFTER UPDATE OF ended_at ON membership_periods
  FOR EACH ROW WHEN (OLD.ended_at IS NULL AND NEW.ended_at IS NOT NULL)
  EXECUTE FUNCTION revoke_study_strategies_on_membership_end();
