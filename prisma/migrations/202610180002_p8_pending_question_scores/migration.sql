-- A private manual correction may preserve feedback while its score is pending.
-- NULL/NULL is pending; 0/1 remains a real earned zero. Existing values are untouched.
ALTER TABLE question_grades
  ALTER COLUMN earned_numerator DROP NOT NULL,
  ALTER COLUMN earned_denominator DROP NOT NULL,
  DROP CONSTRAINT rational_score_check;
ALTER TABLE question_grades ADD CONSTRAINT rational_score_check CHECK (
  (earned_numerator IS NULL AND earned_denominator IS NULL)
  OR (earned_numerator IS NOT NULL AND earned_denominator IS NOT NULL
    AND earned_numerator >= 0 AND earned_numerator = trunc(earned_numerator)
    AND earned_numerator NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)
    AND earned_denominator > 0 AND earned_denominator = trunc(earned_denominator)
    AND earned_denominator NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric))
);
