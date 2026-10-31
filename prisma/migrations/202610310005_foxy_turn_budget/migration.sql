ALTER TABLE foxy_turns
  ADD COLUMN dispatch_count INTEGER NOT NULL DEFAULT 0 CHECK (dispatch_count >= 0),
  ADD COLUMN reserved_microusd BIGINT NOT NULL DEFAULT 0 CHECK (reserved_microusd >= 0),
  ADD COLUMN usage_day DATE,
  ADD COLUMN input_tokens BIGINT,
  ADD COLUMN output_tokens BIGINT,
  ADD COLUMN input_usd_per_million DOUBLE PRECISION,
  ADD COLUMN output_usd_per_million DOUBLE PRECISION;
