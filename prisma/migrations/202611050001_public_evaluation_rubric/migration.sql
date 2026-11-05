-- Public criteria are independent from private AI grading instructions.
-- Existing activities keep an empty rubric; no historical private text is copied.
ALTER TABLE activities ADD COLUMN evaluation_rubric JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE activities ADD CONSTRAINT activities_evaluation_rubric_array CHECK (jsonb_typeof(evaluation_rubric) = 'array');
