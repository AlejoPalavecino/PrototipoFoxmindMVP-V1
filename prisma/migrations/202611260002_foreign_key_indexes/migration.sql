-- B6 of the 2026-11-26 audit: index only the foreign keys that runtime SQL actually reads or that a parent delete scans.
-- The other unindexed foreign keys are a reviewed list in tests/foreign-key-indexes-database.test.mjs.
-- Plain CREATE INDEX (not CONCURRENTLY) because Prisma runs each migration in a transaction; it blocks writes to each
-- table while it builds, which is acceptable for the current data volume.

-- File reference checks before deleting or reusing a stored file.
CREATE INDEX IF NOT EXISTS materials_file_id_idx ON materials(file_id);
CREATE INDEX IF NOT EXISTS study_plan_versions_file_id_idx ON study_plan_versions(file_id);
CREATE INDEX IF NOT EXISTS activity_instruction_files_file_id_idx ON activity_instruction_files(file_id);

-- Deleting a question or one of its options checks answers, question grades and selections.
CREATE INDEX IF NOT EXISTS answers_question_id_idx ON answers(question_id);
CREATE INDEX IF NOT EXISTS question_grades_question_id_idx ON question_grades(question_id);
CREATE INDEX IF NOT EXISTS answer_selections_option_id_idx ON answer_selections(option_id);

-- Deleting an agenda event clears its review sessions (ON DELETE SET NULL).
CREATE INDEX IF NOT EXISTS study_review_sessions_agenda_event_id_idx ON study_review_sessions(agenda_event_id);

-- Grading looks up the job of an attempt; the existing unique index only covers automatic jobs.
CREATE INDEX IF NOT EXISTS grading_ai_jobs_attempt_id_idx ON grading_ai_jobs(attempt_id);
