-- Extend private series without rewriting existing events or changing their dates.
ALTER TABLE agenda_events DROP CONSTRAINT agenda_events_repeat_kind_check;
ALTER TABLE agenda_events ADD CONSTRAINT agenda_events_repeat_kind_check
  CHECK (repeat_kind IN ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY'));
ALTER TABLE agenda_events DROP CONSTRAINT agenda_event_repeat;
ALTER TABLE agenda_events ADD CONSTRAINT agenda_event_repeat CHECK (
  (repeat_kind = 'NONE' AND repeat_until IS NULL)
  OR (repeat_kind = 'DAILY' AND repeat_until IS NOT NULL
    AND repeat_until >= start_date AND repeat_until - start_date < 53)
  OR (repeat_kind = 'WEEKLY' AND repeat_until IS NOT NULL
    AND repeat_until >= start_date AND repeat_until - start_date < 371)
  OR (repeat_kind = 'MONTHLY' AND repeat_until IS NOT NULL
    AND repeat_until >= start_date AND repeat_until < start_date + INTERVAL '8 years')
);
