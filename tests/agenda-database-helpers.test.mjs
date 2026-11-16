import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';

// No retained URLs, files or volumes. The only mutable resource has this random ownership label.
export function createAgendaDatabaseFixture({ spawn = spawnSync, beforeMigration } = {}) {
return async function withAgendaDatabase(operation) {
  const owner = randomBytes(10).toString('hex'), name = `foxmind-agenda-${owner}`, password = randomBytes(24).toString('hex');
  let attempted = false, pool;
  const docker = (...args) => {
    const result = spawn('docker', args, { env: { ...process.env, POSTGRES_PASSWORD: password },
      encoding: 'utf8', windowsHide: true, timeout: 20000 });
    if (result.error || result.status !== 0) throw new Error(`Agenda owned Docker ${args[0]} unavailable`);
    return result.stdout.trim();
  };
  try {
    attempted = true;
    docker('run', '-d', '--rm', '--pull=never', '--name', name, '--label', `foxmind.agenda.owner=${owner}`,
      '--memory=512m', '--cpus=1', '--pids-limit=128', '-p', '127.0.0.1::5432', '--tmpfs', '/var/lib/postgresql/data',
      '-e', 'POSTGRES_PASSWORD', '-e', 'POSTGRES_DB=agenda_test', 'postgres:17.10-bookworm');
    const port = Number(docker('inspect', '--format', '{{(index (index .NetworkSettings.Ports "5432/tcp") 0).HostPort}}', name));
    pool = new pg.Pool({ host: '127.0.0.1', port, user: 'postgres', password, database: 'agenda_test', max: 5, application_name: 'foxmind-api-ai-execution-v1',
      connectionTimeoutMillis: 1000, statement_timeout: 5000, idle_in_transaction_session_timeout: 6000 });
    let ready = false;
    for (let n = 0; n < 70; n++) {
      try { await pool.query('SELECT 1'); ready = true; break; } catch { await delay(200); }
    }
    if (!ready) throw new Error('Agenda owned database readiness timeout');
    const migrations = (await readdir('prisma/migrations')).filter(x => /^\d+_/.test(x)).sort();
    if (beforeMigration !== undefined && !migrations.includes(beforeMigration)) throw new Error('Unknown agenda fixture migration boundary');
    for (const migration of migrations.filter(name => beforeMigration === undefined || name < beforeMigration))
      await pool.query(await readFile(`prisma/migrations/${migration}/migration.sql`, 'utf8'));
    const transaction = async callback => {
      const connection = await pool.connect(); await connection.query('BEGIN');
      try {
        const query = async (sql, ...values) => (await connection.query(sql, values)).rows;
        const database = { $transaction: async run => run({ $queryRawUnsafe: query,
          $executeRawUnsafe: async (sql, ...values) => (await connection.query(sql, values)).rowCount }) };
        return await callback({ connection, database, query });
      } finally { await connection.query('ROLLBACK'); connection.release(); }
    };
    return await operation({ pool, transaction,
      databaseUrl: `postgresql://postgres:${password}@127.0.0.1:${port}/agenda_test` });
  } finally {
    try { await pool?.end(); } finally {
      if (attempted) {
        const result = spawn('docker', ['inspect', '--format', '{{index .Config.Labels "foxmind.agenda.owner"}}', name],
          { encoding: 'utf8', windowsHide: true, timeout: 20000 });
        if (result.error) throw new Error('Agenda database cleanup inspection unavailable');
        if (result.status === 0) {
          if (result.stdout.trim() !== owner) throw new Error('Agenda database cleanup ownership mismatch');
          docker('rm', '-f', name);
        } else if (!/No such (?:object|container)/i.test(result.stderr ?? '')) {
          throw new Error('Agenda database cleanup inspection unavailable');
        }
      }
    }
  }
};
}
export const withAgendaDatabase = createAgendaDatabaseFixture();
