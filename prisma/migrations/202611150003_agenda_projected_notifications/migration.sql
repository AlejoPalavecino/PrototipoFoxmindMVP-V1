BEGIN;
ALTER TABLE agenda_events ADD COLUMN reminder_minutes integer CHECK (reminder_minutes IN (0,5,15,30,60,1440)),
  ADD COLUMN reminder_time_zone text;

CREATE TABLE notification_projection_reads (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  notification_id text NOT NULL,
  read_at timestamptz(6) NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, notification_id)
);
COMMIT;
