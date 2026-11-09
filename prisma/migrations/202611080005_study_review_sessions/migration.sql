CREATE TABLE study_review_sessions (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  folder_id uuid NOT NULL REFERENCES study_folders(id) ON DELETE RESTRICT,
  exam_id uuid NOT NULL,
  agenda_event_id uuid REFERENCES agenda_events(id) ON DELETE SET NULL,
  event_revision bigint NOT NULL,
  event_snapshot jsonb NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  reminder_minutes integer CHECK(reminder_minutes IN (0,15,60,1440)),
  notify_at timestamptz,
  notified_at timestamptz,
  read_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK(ends_at>starts_at)
);
CREATE INDEX study_review_due ON study_review_sessions(notify_at) WHERE notified_at IS NULL AND cancelled_at IS NULL;
CREATE INDEX study_review_owner ON study_review_sessions(owner_id,notified_at);
