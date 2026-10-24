ALTER TABLE agenda_events ADD COLUMN color TEXT;
ALTER TABLE agenda_events ADD CONSTRAINT agenda_event_color
  CHECK (color IS NULL OR color IN
    ('BLUE', 'GREEN', 'YELLOW', 'ORANGE', 'PINK', 'PURPLE'));
