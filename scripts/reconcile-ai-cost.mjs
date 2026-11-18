import { readFile } from 'node:fs/promises';
import pg from 'pg';

function utc(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)
    || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value.replace('Z', '.000Z')) {
    throw new Error('Se requiere una fecha UTC completa, por ejemplo 2026-11-01T03:00:00Z.');
  }
  return value;
}

const key = row => JSON.stringify([row.provider, row.model]);

export function parseReceipt(input) {
  const fields = ['actualMicrousd','jobId','model','namespace','provider','reference'];
  if (!input || Object.keys(input).sort().join() !== fields.join()
    || ![input.provider,input.namespace,input.reference,input.model].every(v => typeof v === 'string' && /^[a-zA-Z0-9_.:/-]{1,180}$/.test(v))
    || typeof input.jobId !== 'string' || !/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(input.jobId)
    || typeof input.actualMicrousd !== 'string' || !/^(?:0|[1-9]\d{0,18})$/.test(input.actualMicrousd)
    || BigInt(input.actualMicrousd) > 9223372036854775807n) throw new Error('Recibo individual inválido.');
  return input;
}

/** Only an operator with attributable evidence can apply this explicit write. */
export async function applyReceipt(client, receipt) {
  const { settleAiMonthlyBudget } = await import('../apps/api/src/platform/ai/monthly-budget.ts');
  const { provider, reference, model, namespace, jobId, actualMicrousd } = parseReceipt(receipt);
  const args = [namespace,jobId];
  await client.query('BEGIN');
  try {
    const { rows: [job] } = await client.query(`SELECT owner_id, provider, model, status, expires_at <= statement_timestamp() AS expired
      FROM ai_monthly_reservations WHERE namespace=$1 AND job_id=$2::uuid`, args);
    if (!job || job.provider !== provider || job.model !== model || (job.status === 'RESERVED' && !job.expired)) {
      throw new Error('La operación no coincide con el recibo o continúa en curso.');
    }
    const tx = { query: async (sql, ...values) => (await client.query(sql, values)).rows };
    await settleAiMonthlyBudget(tx, { namespace,jobId,ownerId:job.owner_id }, BigInt(actualMicrousd));
    const { rows: [bill] } = await client.query(`SELECT status,(actor_microusd+platform_microusd)::text AS actual
      FROM ai_monthly_reservations WHERE namespace=$1 AND job_id=$2::uuid`, args);
    if (!['SETTLED','RECONCILED'].includes(bill.status) || bill.actual !== actualMicrousd) throw new Error('El importe confirmado difiere del recibo.');
    await client.query(`INSERT INTO ai_monthly_provider_receipts(provider,reference,namespace,job_id,actual_microusd)
      VALUES ($1,$2,$3,$4::uuid,$5::bigint) ON CONFLICT DO NOTHING`, [provider,reference,namespace,jobId,actualMicrousd]);
    const { rowCount } = await client.query(`SELECT 1 FROM ai_monthly_provider_receipts
      WHERE provider=$1 AND reference=$2 AND namespace=$3 AND job_id=$4::uuid AND actual_microusd=$5::bigint`,
    [provider,reference,namespace,jobId,actualMicrousd]);
    if (rowCount !== 1) throw new Error('Ese comprobante o trabajo ya se vinculó a otro registro.');
    await client.query('COMMIT');
    return { provider, reference, namespace, jobId, status: bill.status, actualMicrousd };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
}

export function parseStatement(input) {
  const start = utc(input?.start), end = utc(input?.end);
  if (start >= end || !Array.isArray(input.totals)) throw new Error('Período o totales inválidos.');
  const groups = new Set();
  for (const row of input.totals) {
    if (!row || ![row.provider, row.model].every(v => typeof v === 'string' && v.trim().length > 0)
      || typeof row.billedMicrousd !== 'string' || !/^(0|[1-9]\d*)$/.test(row.billedMicrousd)
      || groups.has(key(row))) throw new Error('Grupo duplicado o importe inválido en el reporte.');
    groups.add(key(row));
  }
  return { start, end, totals: input.totals };
}

export function compareProviderTotals(statement, recorded) {
  const billed = new Map(statement.map(row => [key(row), row.billedMicrousd]));
  const ledger = new Map(recorded.map(row => [key(row), row]));
  return [...new Set([...billed.keys(), ...ledger.keys()])].sort().map(group => {
    const [provider, model] = JSON.parse(group);
    const { actor = '0', platform = '0', estimated = '0', pending = '0' } = ledger.get(group) ?? {};
    const invoice = billed.get(group);
    return { provider, model, billedMicrousd: invoice ?? null, actorMicrousd: actor,
      confirmedPlatformMicrousd: platform, estimatedPlatformMicrousd: estimated, openReservationMicrousd: pending,
      differenceFromConfirmedMicrousd: invoice === undefined ? null : String(BigInt(invoice) - BigInt(actor) - BigInt(platform)) };
  });
}

export async function reconcile(client, statement) {
  const period = [statement.start, statement.end];
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try {
    const { rows } = await client.query(`SELECT provider, model, sum(actor_microusd)::text AS actor,
      coalesce(sum(platform_microusd) FILTER (WHERE status IN ('SETTLED','RECONCILED')),0)::text AS platform,
      coalesce(sum(platform_microusd) FILTER (WHERE status='EXPIRED'),0)::text AS estimated,
      coalesce(sum(reserved_microusd) FILTER (WHERE status IN ('RESERVED','PENDING')),0)::text AS pending
      FROM ai_monthly_reservations WHERE reserved_at >= $1 AND reserved_at < $2 GROUP BY provider,model`, period);
    const { rows: discrepancies } = await client.query(`SELECT namespace,job_id,owner_id
      FROM ai_monthly_operation_discrepancies WHERE reserved_at >= $1 AND reserved_at < $2
      ORDER BY namespace,job_id`, period);
    await client.query('COMMIT');
    return { start: statement.start, end: statement.end, totals: compareProviderTotals(statement.totals, rows), discrepancies };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

if (import.meta.main) {
  try {
    const write = process.argv[2] === '--apply-receipt';
    const path = process.argv[write ? 3 : 2];
    if (!path || process.argv.length !== (write ? 4 : 3) || !process.env.DATABASE_URL) throw new Error('Indicá la base y el archivo de entrada.');
    const input = JSON.parse(await readFile(path, 'utf8'));
    const client = new pg.Client({ connectionString: process.env.DATABASE_URL, application_name: 'foxmind-quota-reconciliation' });
    await client.connect();
    try {
      const report = write ? await applyReceipt(client, input) : await reconcile(client, parseStatement(input));
      process.stdout.write(JSON.stringify(report, null, 2) + '\n');
      if (!write && (report.discrepancies.length || report.totals.some(row => row.differenceFromConfirmedMicrousd !== '0'))) process.exitCode = 2;
    } finally { await client.end(); }
  } catch (error) {
    // Connection errors may contain connection details. Keep these out of operator logs.
    console.error('No se pudo conciliar el reporte.', error.code ?? error.name);
    process.exitCode = 1;
  }
}
