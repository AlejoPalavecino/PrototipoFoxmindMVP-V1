CREATE VIEW ai_monthly_operation_discrepancies AS
SELECT r.namespace, r.job_id, r.owner_id, r.reserved_at
FROM ai_monthly_reservations r
LEFT JOIN ai_monthly_budget_movements m ON (m.namespace, m.job_id) = (r.namespace, r.job_id)
GROUP BY r.namespace, r.job_id
HAVING count(m.id) = 0 OR bool_or(m.owner_id <> r.owner_id)
  OR sum(m.reserved_delta_microusd) <> CASE WHEN r.status IN ('RESERVED','PENDING') THEN r.reserved_microusd ELSE 0 END
  OR sum(m.actor_delta_microusd) <> r.actor_microusd
  OR sum(m.platform_delta_microusd) <> r.platform_microusd;

CREATE TABLE ai_monthly_integrity_checks (
  day DATE PRIMARY KEY,
  checked_at TIMESTAMPTZ(6) NOT NULL DEFAULT statement_timestamp(),
  discrepancies INTEGER NOT NULL CHECK (discrepancies >= 0)
);

CREATE TABLE ai_monthly_provider_receipts (
  provider TEXT NOT NULL,
  reference TEXT NOT NULL,
  namespace TEXT NOT NULL,
  job_id UUID NOT NULL,
  actual_microusd BIGINT NOT NULL CHECK (actual_microusd >= 0),
  applied_at TIMESTAMPTZ(6) NOT NULL DEFAULT statement_timestamp(),
  PRIMARY KEY (provider,reference),
  UNIQUE (namespace,job_id),
  FOREIGN KEY (namespace,job_id) REFERENCES ai_monthly_reservations(namespace,job_id) ON DELETE RESTRICT ON UPDATE CASCADE
);
