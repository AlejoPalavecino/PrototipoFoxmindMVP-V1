ALTER TABLE activities ADD CONSTRAINT activities_id_unit_id_classroom_id_key UNIQUE (id, unit_id, classroom_id);
CREATE TABLE activity_topics (
  activity_id uuid NOT NULL,
  topic_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  classroom_id uuid NOT NULL,
  position integer NOT NULL CHECK (position >= 0 AND position < 100),
  PRIMARY KEY (activity_id, topic_id),
  UNIQUE (activity_id, position),
  FOREIGN KEY (activity_id, unit_id, classroom_id) REFERENCES activities(id, unit_id, classroom_id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  FOREIGN KEY (topic_id, unit_id, classroom_id) REFERENCES topics(id, unit_id, classroom_id) ON DELETE RESTRICT ON UPDATE NO ACTION
);
CREATE INDEX activity_topics_topic_id_idx ON activity_topics(topic_id);
CREATE INDEX activity_topics_unit_id_idx ON activity_topics(unit_id);
INSERT INTO activity_topics(activity_id, topic_id, unit_id, classroom_id, position)
SELECT id, topic_id, unit_id, classroom_id, 0 FROM activities WHERE topic_id IS NOT NULL;
