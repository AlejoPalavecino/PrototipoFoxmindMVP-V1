-- Additive: existing grades and historical publications retain their stored values.
ALTER TABLE activities ADD COLUMN objective text, ADD COLUMN teacher_comment text,
  ADD CONSTRAINT activities_objective_length CHECK (objective IS NULL OR char_length(objective) <= 1400),
  ADD CONSTRAINT activities_teacher_comment_length CHECK (teacher_comment IS NULL OR char_length(teacher_comment) <= 5000);
ALTER TABLE wall_posts ADD COLUMN title text,
  ADD CONSTRAINT wall_post_title_length CHECK (title IS NULL OR char_length(title) BETWEEN 1 AND 120);
ALTER TABLE attempt_grades ADD COLUMN rubric_snapshot jsonb, ADD COLUMN rubric_marks jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN suggested_grade numeric, ADD COLUMN final_grade_override numeric, ADD COLUMN calculated_grade numeric,
  ADD CONSTRAINT attempt_grade_rubric_snapshot_array CHECK (rubric_snapshot IS NULL OR jsonb_typeof(rubric_snapshot)='array'),
  ADD CONSTRAINT attempt_grade_rubric_marks_array CHECK (jsonb_typeof(rubric_marks)='array'),
  ADD CONSTRAINT attempt_grade_suggested_range CHECK (suggested_grade IS NULL OR (suggested_grade BETWEEN 0 AND 10 AND suggested_grade=round(suggested_grade,2))),
  ADD CONSTRAINT attempt_grade_calculated_range CHECK (calculated_grade IS NULL OR (calculated_grade BETWEEN 0 AND 10 AND calculated_grade=round(calculated_grade,2))),
  ADD CONSTRAINT attempt_grade_override_range CHECK (final_grade_override IS NULL OR (final_grade_override BETWEEN 0 AND 10 AND final_grade_override=round(final_grade_override,2)));
-- Rows predating these columns had only the stored final. Preserve that known base
-- before making published scoring evidence immutable; no final/publication is rewritten.
UPDATE attempt_grades SET calculated_grade=final_grade WHERE final_grade IS NOT NULL;
CREATE FUNCTION preserve_published_rubric() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.is_published AND (NEW.rubric_snapshot IS DISTINCT FROM OLD.rubric_snapshot
    OR NEW.rubric_marks IS DISTINCT FROM OLD.rubric_marks OR NEW.suggested_grade IS DISTINCT FROM OLD.suggested_grade
    OR NEW.final_grade_override IS DISTINCT FROM OLD.final_grade_override OR NEW.calculated_grade IS DISTINCT FROM OLD.calculated_grade) THEN
    RAISE EXCEPTION 'Published rubric snapshot is immutable';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER preserve_published_rubric BEFORE UPDATE ON attempt_grades FOR EACH ROW EXECUTE FUNCTION preserve_published_rubric();
