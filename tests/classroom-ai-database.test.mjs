import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { setTimeout as pause } from 'node:timers/promises';
import { readdir, readFile } from 'node:fs/promises';
import pg from 'pg';
import { AsyncLocalStorage } from 'node:async_hooks';

// Owned disposable PostgreSQL only. Never consumes DATABASE_URL or retained volumes.
export async function withAiDatabase(run) {
  const owner = randomBytes(12).toString('hex'), name = `foxmind-ai-test-${owner}`;
  const password = randomBytes(32).toString('hex');
  let pool, created = false;
  const docker = (...args) => {
    const result = spawnSync('docker', args, { encoding: 'utf8', windowsHide: true, timeout: 20000,
      env: { ...process.env, POSTGRES_PASSWORD: password } });
    if (result.error || result.status !== 0) throw new Error(`AI owned Docker ${args[0]} failed (sanitized)`);
    return result.stdout.trim();
  };
  try {
    docker('run', '-d', '--rm', '--pull=never', '--name', name, '--label', `foxmind.ai.owner=${owner}`,
      '--memory=512m', '--cpus=1', '--pids-limit=128', '-p', '127.0.0.1::5432',
      '--tmpfs', '/var/lib/postgresql/data', '-e', 'POSTGRES_PASSWORD', '-e', 'POSTGRES_DB=classroom_ai_test', 'postgres:17.10-bookworm');
    created = true;
    const port = Number(docker('inspect', '--format', '{{(index (index .NetworkSettings.Ports "5432/tcp") 0).HostPort}}', name));
    pool = new pg.Pool({ host: '127.0.0.1', port, user: 'postgres', password, database: 'classroom_ai_test',
      max: 10, connectionTimeoutMillis: 2000, statement_timeout: 5000, idle_in_transaction_session_timeout: 6000 });
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { await pool.query('SELECT 1'); ready = true; break; } catch { await pause(100); }
    }
    if (!ready) throw new Error('AI owned database readiness unavailable');
    for (const migration of (await readdir('prisma/migrations')).filter(name => /^\d+_/.test(name)).sort()) {
      await pool.query(await readFile(`prisma/migrations/${migration}/migration.sql`, 'utf8'));
    }
    const database = transactionDatabase(pool);
    return await run({ pool, database, databaseUrl: `postgresql://postgres:${password}@127.0.0.1:${port}/classroom_ai_test` });
  } finally {
    await pool?.end();
    if (created) {
      if (docker('inspect', '--format', '{{index .Config.Labels "foxmind.ai.owner"}}', name) !== owner) throw new Error('AI fixture ownership mismatch');
      docker('rm', '--force', name);
    }
  }
}

export function transactionDatabase(pool, active = { count: 0 }) {
  const context = new AsyncLocalStorage();
  Object.defineProperty(active, 'count', { configurable: true, get: () => context.getStore() ? 1 : 0 });
  return { $transaction: async operation => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await context.run(true, () => operation({ $queryRawUnsafe: async (sql, ...args) => (await client.query(sql, args)).rows }));
      await client.query('COMMIT'); return result;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  } };
}

export async function aiFixture(pool, { verified = true, ownerId = randomUUID(), bytes = Buffer.from('synthetic-plan'),
  units = [{ name: 'Manual', topics: [{ name: 'Docente' }] }] } = {}) {
  const strangerId = randomUUID(), draftId = randomUUID(), fileId = randomUUID();
  for (const id of [ownerId, strangerId]) await pool.query(`INSERT INTO users
    (id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at)
    VALUES($1,now(),$2,$2,'Synthetic','Teacher','fixture-only',CASE WHEN $3 THEN now() ELSE NULL END)
    ON CONFLICT(id) DO NOTHING`, [id, `${id}@example.test`, verified]);
  const payload = { name: 'Fotografía', subject: 'Arte', division: 'A', academicYear: 2026,
    timezone: 'UTC', coverKey: 'explore', planFileId: fileId, units };
  await pool.query(`INSERT INTO classroom_drafts(id,owner_id,updated_at,revision,payload)
    VALUES($1,$2,now(),1,$3::jsonb)`, [draftId, ownerId, JSON.stringify(payload)]);
  const digest = createHash('sha256').update(bytes).digest('hex');
  await pool.query(`INSERT INTO files(id,updated_at,classroom_draft_id,uploaded_by_id,storage_key,
    original_name,extension,detected_mime_type,size_bytes,validation_status,scan_status,validated_at,scanned_at)
    VALUES($1,now(),$2,$3,$4,'synthetic.pdf','pdf','application/pdf',$5,'APPROVED','CLEAN',now(),now())`,
  [fileId, draftId, ownerId, `p4/${fileId}/blob`, bytes.length]);
  await pool.query(`INSERT INTO uploads(id,updated_at,file_id,status,reserved_bytes,completed_at)
    VALUES($1,now(),$2,'COMPLETED',$3,now())`, [randomUUID(), fileId, bytes.length]);
  await pool.query(`INSERT INTO file_custodies(file_id,purpose,phase,digest,validated_digest,scanned_digest)
    VALUES($1,'plan','ready',$2,$2,$2)`, [fileId, digest]);
  return { ownerId, strangerId, draftId, fileId, digest, payload,
    request: { actor: ownerId }, start: { revision: '1', planFileId: fileId } };
}

// For single-transaction service cases, each case rolls back all fixtures and writes.
export async function rollbackCase(pool, operation) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const localPool = { query: (...args) => client.query(...args) };
    const database = { $transaction: async fn => {
      await client.query('SAVEPOINT ai_case');
      try {
        const result = await fn({ $queryRawUnsafe: async (sql, ...args) => (await client.query(sql, args)).rows });
        await client.query('RELEASE SAVEPOINT ai_case'); return result;
      } catch (error) { await client.query('ROLLBACK TO SAVEPOINT ai_case'); throw error; }
    } };
    await operation({ pool: localPool, database });
  } finally { await client.query('ROLLBACK'); client.release(); }
}
