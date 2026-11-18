import type { SqlTransaction } from '../../../../../src/core/contracts/sql.ts';

/** One integrity snapshot per UTC day, regardless of the number of API replicas. */
export async function runMonthlyIntegrityAudit(tx: SqlTransaction) {
  const [due] = await tx.query<{ due: boolean }>(`SELECT NOT EXISTS (
      SELECT 1 FROM ai_monthly_integrity_checks WHERE day=(statement_timestamp() AT TIME ZONE 'UTC')::date
    ) AND pg_try_advisory_xact_lock(78123004) AS due`);
  if (!due?.due) return null;
  const [check] = await tx.query<{ day: string; discrepancies: number }>(`INSERT INTO ai_monthly_integrity_checks(day,discrepancies)
    SELECT (statement_timestamp() AT TIME ZONE 'UTC')::date, count(*)::int FROM ai_monthly_operation_discrepancies
    ON CONFLICT (day) DO NOTHING RETURNING day::text,discrepancies`);
  return check ?? null;
}
