BEGIN;
ALTER TABLE activities ADD COLUMN teacher_brief text
  CHECK (teacher_brief IS NULL OR char_length(btrim(teacher_brief)) BETWEEN 1 AND 1200);
ALTER TABLE activity_topics
  ADD CONSTRAINT activity_topics_activity_id_classroom_id_fkey
  FOREIGN KEY (activity_id, classroom_id) REFERENCES activities(id, classroom_id) ON DELETE RESTRICT ON UPDATE NO ACTION;
ALTER TABLE activity_topics DROP CONSTRAINT activity_topics_activity_id_unit_id_classroom_id_fkey;
COMMIT;
