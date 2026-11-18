CREATE TABLE ai_monthly_reservations (
  namespace TEXT NOT NULL,
  job_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  period_start DATE NOT NULL CHECK (extract(day FROM period_start) = 1),
  operational_day DATE NOT NULL,
  capability TEXT NOT NULL CHECK (btrim(capability) <> ''),
  provider TEXT NOT NULL CHECK (btrim(provider) <> ''),
  model TEXT NOT NULL CHECK (btrim(model) <> ''),
  pricing JSONB NOT NULL CHECK (jsonb_typeof(pricing) = 'object'
    AND pricing ?& ARRAY['inputUsdPerMillion', 'outputUsdPerMillion']
    AND jsonb_typeof(pricing->'inputUsdPerMillion') = 'number'
    AND jsonb_typeof(pricing->'outputUsdPerMillion') = 'number'
    AND (pricing->>'inputUsdPerMillion')::numeric >= 0
    AND (pricing->>'outputUsdPerMillion')::numeric >= 0),
  reserved_at TIMESTAMPTZ(6) NOT NULL,
  expires_at TIMESTAMPTZ(6) NOT NULL,
  reserved_microusd BIGINT NOT NULL CHECK (reserved_microusd > 0),
  actor_microusd BIGINT NOT NULL DEFAULT 0 CHECK (actor_microusd >= 0 AND actor_microusd <= reserved_microusd),
  platform_microusd BIGINT NOT NULL DEFAULT 0 CHECK (platform_microusd >= 0),
  status TEXT NOT NULL CHECK (status IN ('RESERVED', 'PENDING', 'SETTLED', 'EXPIRED', 'RECONCILED')),
  PRIMARY KEY (namespace, job_id),
  UNIQUE (namespace, job_id, owner_id),
  CHECK (expires_at > reserved_at),
  CHECK (period_start = date_trunc('month', reserved_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::date),
  CHECK ((status IN ('RESERVED', 'PENDING') AND actor_microusd = 0 AND platform_microusd = 0)
    OR (status = 'EXPIRED' AND actor_microusd = 0 AND platform_microusd = reserved_microusd)
    OR (status = 'RECONCILED' AND actor_microusd = 0)
    OR (status = 'SETTLED' AND (platform_microusd = 0 OR actor_microusd = reserved_microusd)))
);

CREATE INDEX ai_monthly_reservations_owner_id_period_start_idx ON ai_monthly_reservations(owner_id, period_start);
CREATE INDEX ai_monthly_reservations_expiry_idx ON ai_monthly_reservations(expires_at, namespace, job_id)
  INCLUDE (owner_id) WHERE status IN ('RESERVED', 'PENDING');
CREATE INDEX ai_monthly_reservations_owner_expiry_idx ON ai_monthly_reservations(owner_id, expires_at)
  WHERE status IN ('RESERVED', 'PENDING');

CREATE TABLE ai_monthly_budget_movements (
  id BIGSERIAL PRIMARY KEY,
  namespace TEXT NOT NULL,
  job_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  event TEXT NOT NULL CHECK (event IN ('RESERVED', 'PENDING', 'SETTLED', 'EXPIRED', 'RECONCILED')),
  occurred_at TIMESTAMPTZ(6) NOT NULL DEFAULT clock_timestamp(),
  reserved_delta_microusd BIGINT NOT NULL,
  actor_delta_microusd BIGINT NOT NULL,
  platform_delta_microusd BIGINT NOT NULL,
  CONSTRAINT ai_monthly_budget_movements_reservation_fkey
    FOREIGN KEY (namespace, job_id, owner_id) REFERENCES ai_monthly_reservations (namespace, job_id, owner_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CHECK ((event = 'RESERVED' AND reserved_delta_microusd > 0 AND actor_delta_microusd = 0 AND platform_delta_microusd = 0)
    OR (event = 'PENDING' AND reserved_delta_microusd = 0 AND actor_delta_microusd = 0 AND platform_delta_microusd = 0)
    OR (event = 'SETTLED' AND reserved_delta_microusd < 0 AND actor_delta_microusd BETWEEN 0 AND -reserved_delta_microusd AND platform_delta_microusd >= 0)
    OR (event = 'EXPIRED' AND reserved_delta_microusd < 0 AND actor_delta_microusd = 0 AND platform_delta_microusd = -reserved_delta_microusd)
    OR (event = 'RECONCILED' AND reserved_delta_microusd = 0 AND actor_delta_microusd = 0))
);

CREATE INDEX ai_monthly_budget_movements_owner_id_id_idx ON ai_monthly_budget_movements(owner_id, id);
CREATE UNIQUE INDEX ai_monthly_budget_movements_namespace_job_id_event_key ON ai_monthly_budget_movements(namespace, job_id, event);
