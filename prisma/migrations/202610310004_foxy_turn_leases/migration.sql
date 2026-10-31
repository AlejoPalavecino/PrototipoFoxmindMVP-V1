ALTER TABLE foxy_turns
  ADD COLUMN lease_nonce UUID,
  ADD COLUMN lease_until TIMESTAMPTZ,
  ADD COLUMN dispatch_started_at TIMESTAMPTZ,
  ADD COLUMN error_code TEXT,
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  ADD CONSTRAINT foxy_turn_lease_state CHECK ((state = 'RUNNING' AND lease_nonce IS NOT NULL AND lease_until IS NOT NULL)
    OR (state <> 'RUNNING' AND lease_nonce IS NULL AND lease_until IS NULL));
CREATE INDEX foxy_turn_queue_idx ON foxy_turns (created_at, id) WHERE state = 'QUEUED';
