ALTER TABLE foxy_turns
  ADD COLUMN answer JSONB,
  ADD COLUMN reference_map JSONB,
  ADD COLUMN source_report JSONB,
  ADD CONSTRAINT foxy_turn_terminal_payload CHECK (
    (state='READY' AND answer IS NOT NULL AND reference_map IS NOT NULL AND source_report IS NOT NULL)
    OR (state<>'READY' AND answer IS NULL AND reference_map IS NULL AND source_report IS NULL)
  );
