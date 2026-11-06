ALTER TABLE agenda_events DROP CONSTRAINT agenda_event_color;
ALTER TABLE agenda_events ADD CONSTRAINT agenda_event_color CHECK
  (color IS NULL OR color IN ('BLUE','GREEN','YELLOW','ORANGE','PINK','PURPLE','GRAPHITE'));
