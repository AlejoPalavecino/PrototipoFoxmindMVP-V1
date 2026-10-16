import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as pause } from 'node:timers/promises';
import { createFileInfrastructure } from '../apps/api/src/files/configuration.ts';
import { p4Local, p4LocalConfiguration } from '../scripts/p4-local.mjs';
import pg from 'pg';

test('dedicated local volumes retain object bytes and PostgreSQL state across actual container restart', { timeout: 90000 }, async () => {
  const configuration = await p4LocalConfiguration(), infrastructure = createFileInfrastructure(configuration);
  const key = `p4/${randomUUID()}/blob`, bytes = Buffer.from('P4 owned persistent-service probe'), marker = randomUUID();
  let client;
  const connect = async () => {
    const candidate = new pg.Client({ connectionString: configuration.databaseUrl, connectionTimeoutMillis: 1000, query_timeout: 1500 });
    try { await candidate.connect(); return candidate; } catch { await candidate.end().catch(() => {}); throw new Error('P4 database readiness pending'); }
  };
  try {
    await p4Local('check'); await p4Local('migrate'); await p4Local('drift'); client = await connect();
    const migrations = await client.query('SELECT count(*)::int AS count FROM _prisma_migrations WHERE finished_at IS NOT NULL');
    assert.equal(migrations.rows[0].count, 5);
    await client.query('CREATE TABLE IF NOT EXISTS p4_runtime_probe(id UUID PRIMARY KEY)');
    await client.query('INSERT INTO p4_runtime_probe(id) VALUES($1)', [marker]);
    await infrastructure.storage.put(key, bytes); await client.end(); client = undefined;
    await p4Local('restart-storage');
    const deadline = Date.now() + 30000; let ready = false;
    while (Date.now() < deadline) {
      try { client = await connect(); await infrastructure.storage.get(key, bytes.length); ready = true; break; }
      catch { await client?.end().catch(() => {}); client = undefined; await pause(200); }
    }
    assert.equal(ready, true, 'Restarted services must become usable');
    assert.deepEqual(await infrastructure.storage.get(key, bytes.length), bytes);
    assert.equal((await client.query('SELECT id FROM p4_runtime_probe WHERE id=$1', [marker])).rowCount, 1);
    await infrastructure.scanner.scan(bytes);
    await client.query('DELETE FROM p4_runtime_probe WHERE id=$1', [marker]);
    await client.query('DROP TABLE p4_runtime_probe');
    await infrastructure.storage.remove(key);
  } finally {
    await client?.end(); infrastructure.close(); await p4Local('stop');
  }
});
