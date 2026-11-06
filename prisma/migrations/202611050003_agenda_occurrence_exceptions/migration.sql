ALTER TABLE agenda_events ADD COLUMN exceptions jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE agenda_events ADD CONSTRAINT agenda_event_exceptions_array
  CHECK (jsonb_typeof(exceptions) = 'array' AND jsonb_array_length(exceptions) <= 53);
