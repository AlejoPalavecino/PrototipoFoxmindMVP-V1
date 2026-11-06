-- Each revision keeps its file and all prior academic/citation references immutable.
CREATE TABLE material_revisions (
  previous_id UUID PRIMARY KEY,
  current_id UUID NOT NULL UNIQUE,
  classroom_id UUID NOT NULL,
  classroom_revision BIGINT NOT NULL,
  command_hash CHAR(64) NOT NULL CHECK(command_hash ~ '^[a-f0-9]{64}$'),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT material_revision_distinct CHECK(previous_id <> current_id),
  CONSTRAINT material_revision_previous FOREIGN KEY(previous_id,classroom_id) REFERENCES materials(id,classroom_id) ON DELETE RESTRICT,
  CONSTRAINT material_revision_current FOREIGN KEY(current_id,classroom_id) REFERENCES materials(id,classroom_id) ON DELETE RESTRICT
);
