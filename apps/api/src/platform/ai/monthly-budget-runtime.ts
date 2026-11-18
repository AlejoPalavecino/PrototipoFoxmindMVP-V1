import type { SqlDatabase, SqlTransaction } from '../../../../../src/core/contracts/sql.ts';
import { sweepAiMonthlyBudget } from './monthly-budget.ts';
import { runMonthlyIntegrityAudit } from './monthly-audit.ts';

export function startAiMonthlyBudgetRuntime(database: SqlDatabase) {
  let cursor: Awaited<ReturnType<typeof sweepAiMonthlyBudget>> = null;
  let pending: Promise<void> | undefined;
  let nextAuditAt = 0;
  const transaction = <T>(operation: (tx: SqlTransaction) => Promise<T>) => database.$transaction(raw => operation({
    query: <Row>(sql: string, ...values: unknown[]) => raw.$queryRawUnsafe<Row[]>(sql, ...values),
  }), { maxWait: 1500, timeout: 3500 });
  async function tick() {
    try {
      cursor = await transaction(tx => sweepAiMonthlyBudget(tx, cursor));
    } catch {
      console.warn('Monthly AI budget expiration unavailable');
    }
    const now = Date.now();
    if (now < nextAuditAt) return;
    nextAuditAt = now + 3_600_000;
    try {
      const result = await transaction(runMonthlyIntegrityAudit);
      if (result && Number(result.discrepancies) > 0) console.warn('Monthly AI budget integrity discrepancies', Number(result.discrepancies));
    } catch {
      console.warn('Monthly AI budget integrity audit unavailable');
    }
  }
  const timer = setInterval(() => {
    if (pending) return;
    pending = tick().finally(() => { pending = undefined; });
  }, 5000);
  timer.unref();
  return async function close() {
    clearInterval(timer);
    await pending;
  };
}
