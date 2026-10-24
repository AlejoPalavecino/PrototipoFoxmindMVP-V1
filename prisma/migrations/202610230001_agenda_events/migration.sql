CREATE TABLE agenda_events (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE NO ACTION,
  title TEXT NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 160),
  description TEXT NOT NULL CHECK (length(description) <= 4000),
  category TEXT NOT NULL CHECK (category IN ('CLASS', 'ACTIVITY', 'EVALUATION')),
  schedule_kind TEXT NOT NULL CHECK (schedule_kind IN ('TIMED', 'ALL_DAY')),
  start_date DATE NOT NULL,
  end_date_exclusive DATE NOT NULL,
  start_local TEXT,
  end_local TEXT,
  time_zone TEXT,
  start_offset_minutes INTEGER,
  end_offset_minutes INTEGER,
  start_at TIMESTAMPTZ(6),
  end_at TIMESTAMPTZ(6),
  repeat_kind TEXT NOT NULL CHECK (repeat_kind IN ('NONE', 'WEEKLY')),
  repeat_until DATE,
  revision BIGINT NOT NULL DEFAULT 0 CHECK (revision >= 0),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT agenda_event_dates CHECK (end_date_exclusive > start_date),
  CONSTRAINT agenda_event_schedule CHECK (
    (schedule_kind = 'ALL_DAY' AND start_local IS NULL AND end_local IS NULL
      AND time_zone IS NULL AND start_offset_minutes IS NULL AND end_offset_minutes IS NULL
      AND start_at IS NULL AND end_at IS NULL)
    OR (schedule_kind = 'TIMED' AND start_local IS NOT NULL AND end_local IS NOT NULL
      AND time_zone IS NOT NULL AND length(time_zone) > 0
      AND start_at IS NOT NULL AND end_at IS NOT NULL AND end_at > start_at
      AND start_local ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$'
      AND end_local ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$'
      AND end_local > start_local
      AND start_date = (start_at AT TIME ZONE time_zone)::date
      AND start_local::timestamp = start_at AT TIME ZONE time_zone
      AND end_local::timestamp = end_at AT TIME ZONE time_zone
      AND (start_offset_minutes IS NULL OR start_offset_minutes BETWEEN -1440 AND 1440)
      AND (end_offset_minutes IS NULL OR end_offset_minutes BETWEEN -1440 AND 1440)
    )
  ),
  CONSTRAINT agenda_event_repeat CHECK (
    (repeat_kind = 'NONE' AND repeat_until IS NULL)
    OR (repeat_kind = 'WEEKLY' AND repeat_until IS NOT NULL
      AND repeat_until >= start_date AND repeat_until - start_date < 371)
  )
);
CREATE INDEX agenda_events_owner_start_idx ON agenda_events(owner_id, start_date);
