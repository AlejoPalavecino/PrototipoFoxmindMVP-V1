import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import pg from 'pg';
import { withAiDatabase, aiFixture } from './classroom-ai-database.test.mjs';

test('C3 additive AI migration preserves populated P0-P9 drafts, approved plans and identities', { timeout: 120000 }, async () => {
  await withAiDatabase(async ({ pool }) => {
    await pool.query('CREATE DATABASE classroom_ai_upgrade_test');
    const db = new pg.Client({ ...pool.options, password: pool.options.password, database: 'classroom_ai_upgrade_test' });
    await db.connect();
    try {
      const names = (await readdir('prisma/migrations')).filter(name => /^\d+_/.test(name)).sort();
      assert.equal(names.length, 10); assert.equal(names.at(-1), '202610230001_classroom_ai');
      for (const name of names.slice(0, 9)) await db.query(await readFile(`prisma/migrations/${name}/migration.sql`, 'utf8'));
      await aiFixture(db);
      const tables = (await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(row => row.tablename);
      const snapshot = async () => JSON.stringify(await Promise.all(tables.map(async table =>
        (await db.query(`SELECT to_jsonb(t) AS value FROM ${table} t ORDER BY to_jsonb(t)::text`)).rows)));
      const before = await snapshot();
      await db.query(await readFile(`prisma/migrations/${names.at(-1)}/migration.sql`, 'utf8'));
      assert.equal(await snapshot(), before);
      for (const table of ['classroom_curriculum_extractions', 'ai_usage_daily', 'classroom_ai_requests'])
        assert.equal((await db.query(`SELECT count(*)::int n FROM ${table}`)).rows[0].n, 0);
    } finally { await db.end(); }
  });
});
