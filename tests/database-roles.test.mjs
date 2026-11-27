import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { withAgendaDatabase } from './agenda-database-helpers.test.mjs';

// A login that only inherits the application role, as production and local:up provision it.
const migration = 'prisma/migrations/202611260001_application_role/migration.sql';
async function applicationLogin(pool, databaseUrl) {
  const name = 'foxmind_app_test_' + randomBytes(4).toString('hex'), password = randomBytes(24).toString('hex');
  await pool.query(`CREATE ROLE ${name} LOGIN PASSWORD '${password}' IN ROLE foxmind_app`);
  const url = new URL(databaseUrl); url.username = name; url.password = password;
  return { name, url: url.toString() };
}

test('the application role reads and writes every table but cannot change the schema', { timeout: 120000 }, async () => {
  await withAgendaDatabase(async ({ pool, databaseUrl }) => {
    const [{ count }] = (await pool.query("SELECT count(*)::int AS count FROM pg_roles WHERE rolname='foxmind_app' AND NOT rolcanlogin")).rows;
    assert.equal(count, 1, 'migrations create foxmind_app without login');
    const missing = (await pool.query(`SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind IN ('r','p','v') AND c.relname<>'_prisma_migrations'
      AND NOT (has_table_privilege('foxmind_app', c.oid, 'SELECT') AND has_table_privilege('foxmind_app', c.oid, 'INSERT')
        AND has_table_privilege('foxmind_app', c.oid, 'UPDATE') AND has_table_privilege('foxmind_app', c.oid, 'DELETE'))
      ORDER BY 1`)).rows.map(row => row.relname);
    assert.deepEqual(missing, [], 'every table and view grants row access to the application');
    // Prisma's history table exists before migrations run; replaying the idempotent migration then hides it.
    await pool.query('CREATE TABLE _prisma_migrations(id text PRIMARY KEY)');
    await pool.query(await readFile(migration, 'utf8'));
    await pool.query(await readFile(migration, 'utf8'));
    const login = await applicationLogin(pool, databaseUrl);
    const app = new pg.Client({ connectionString: login.url });
    await app.connect();
    try {
      const user = '11111111-1111-4111-8111-111111111111';
      await app.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,account_role)
        VALUES($1,now(),'role@example.test','role@example.test','Rol','Sintético','fixture','student')`, [user]);
      assert.equal((await app.query('UPDATE users SET first_name=$2 WHERE id=$1', [user, 'Otro'])).rowCount, 1);
      assert.equal((await app.query('DELETE FROM users WHERE id=$1', [user])).rowCount, 1);
      for (const statement of ['CREATE TABLE intruder(id int)', 'ALTER TABLE users ADD COLUMN intruder int', 'TRUNCATE users',
        'DROP TABLE users', "DELETE FROM _prisma_migrations", 'CREATE ROLE intruder', 'CREATE FUNCTION intruder() RETURNS int LANGUAGE sql AS $$SELECT 1$$']) {
        await assert.rejects(app.query(statement), { code: '42501' }, statement);
      }
    } finally { await app.end(); }
    // Objects created later by the migrating role inherit the same grants.
    await pool.query('CREATE TABLE later_feature(id int PRIMARY KEY)');
    const [{ later }] = (await pool.query("SELECT has_table_privilege('foxmind_app','later_feature','INSERT') AND has_table_privilege('foxmind_app','later_feature','DELETE') AS later")).rows;
    assert.equal(later, true);
  });
});

test('production startup accepts the application login and refuses the migrating superuser', { timeout: 120000 }, async () => {
  await import('reflect-metadata');
  const { PrismaService } = await import('../.build/api/apps/api/src/platform/database/prisma.service.js');
  const { assertLeastPrivilege } = await import('../.build/api/apps/api/src/platform/database/least-privilege.js');
  await withAgendaDatabase(async ({ pool, databaseUrl }) => {
    const login = await applicationLogin(pool, databaseUrl);
    for (const [url, allowed] of [[databaseUrl, false], [login.url, true]]) {
      const database = new PrismaService(url);
      try {
        if (allowed) await assertLeastPrivilege(database);
        else await assert.rejects(assertLeastPrivilege(database), error => /application role/.test(error.message));
      } finally { await database.onModuleDestroy(); }
    }
    // A login that also owns objects (for example, the migrating role itself) is refused as well.
    await pool.query(`CREATE ROLE owner_${login.name} NOLOGIN; GRANT owner_${login.name} TO ${login.name}; CREATE TABLE owned_by_app(id int); ALTER TABLE owned_by_app OWNER TO owner_${login.name}`);
    const database = new PrismaService(login.url);
    try { await assert.rejects(assertLeastPrivilege(database), /application role/); }
    finally { await database.onModuleDestroy(); }
  });
});
