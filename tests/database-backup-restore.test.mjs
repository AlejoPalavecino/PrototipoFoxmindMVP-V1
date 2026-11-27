import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readdir } from 'node:fs/promises';
import { createAgendaDatabaseFixture, withAgendaDatabase } from './agenda-database-helpers.test.mjs';
import { backupDatabase, restoreDatabase } from '../scripts/database-backup.mjs';

// B12: a backup taken from a migrated database restores into an empty database of a fresh cluster,
// with the same rows, the migration history and the application role grants.
const firstMigration = (await readdir('prisma/migrations')).filter(name => /^\d+_/u.test(name)).sort()[0];
const withEmptyDatabase = createAgendaDatabaseFixture({ beforeMigration: firstMigration });

async function rowCounts(pool) {
  const { rows } = await pool.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`);
  const counts = {};
  for (const { tablename } of rows) counts[tablename] = (await pool.query(`SELECT count(*)::int AS n FROM "${tablename}"`)).rows[0].n;
  return counts;
}

test('PostgreSQL: backup of an owned database restores into an empty fresh cluster (B12)', { timeout: 180000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'foxmind-backup-'));
  const file = join(directory, 'foxmind.dump');
  try {
    let source;
    await withAgendaDatabase(async ({ pool, container }) => {
      // The fixture applies migration files directly; record the history Prisma keeps in a real environment.
      await pool.query(`CREATE TABLE _prisma_migrations(id varchar(36) PRIMARY KEY, checksum varchar(64) NOT NULL,
        finished_at timestamptz, migration_name varchar(255) NOT NULL, logs text, rolled_back_at timestamptz,
        started_at timestamptz NOT NULL DEFAULT now(), applied_steps_count integer NOT NULL DEFAULT 0)`);
      const names = (await readdir('prisma/migrations')).filter(item => /^\d+_/u.test(item));
      for (const migration of names) await pool.query(`INSERT INTO _prisma_migrations(id,checksum,finished_at,migration_name,applied_steps_count)
        VALUES($1,'synthetic',now(),$2,1)`, [randomUUID(), migration]);
      for (const role of ['teacher', 'student']) {
        const id = randomUUID();
        await pool.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
          VALUES($1,now(),$2,$2,'Synthetic','Backup','no-login',now(),$3)`, [id, `${id}@example.invalid`, role]);
      }
      source = await rowCounts(pool);
      const result = await backupDatabase({ container, database: 'agenda_test', user: 'postgres', file });
      assert.ok(result.entries > 100, `dump lists ${result.entries} entries`);
    });
    assert.ok((await stat(file)).size > 0);
    assert.equal(source.users, 2);

    await withEmptyDatabase(async ({ pool, container }) => {
      assert.deepEqual(await rowCounts(pool), {}, 'target starts empty');
      const result = await restoreDatabase({ container, database: 'agenda_test', user: 'postgres', file });
      assert.equal(result.tables, Object.keys(source).length);
      assert.equal(result.migrations, source._prisma_migrations);
      assert.deepEqual(await rowCounts(pool), source);
      const grants = (await pool.query(`SELECT has_table_privilege('foxmind_app','users','SELECT,INSERT,UPDATE,DELETE') AS users,
        has_table_privilege('foxmind_app','_prisma_migrations','SELECT') AS history`)).rows[0];
      assert.deepEqual(grants, { users: true, history: false });
      await assert.rejects(restoreDatabase({ container, database: 'agenda_test', user: 'postgres', file }), /RESTORE_TARGET_NOT_EMPTY/u,
        'a restore never writes over an existing database');
    });
  } finally { await rm(directory, { recursive: true, force: true }); }
});
