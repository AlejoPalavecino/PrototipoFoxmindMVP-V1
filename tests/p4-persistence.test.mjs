import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as pause } from 'node:timers/promises';
import { createFileInfrastructure } from '../apps/api/src/modules/files/infrastructure/configuration.ts';
import { p4Local, p4LocalConfiguration } from '../scripts/p4-local.mjs';
import pg from 'pg';
import { readdir } from 'node:fs/promises';
import { cleanupProbe } from '../scripts/p4-probe-cleanup.mjs';

test('dedicated local volumes retain object bytes and PostgreSQL state across actual container restart', { timeout: 90000 }, async () => {
  const configuration = await p4LocalConfiguration(), infrastructure = createFileInfrastructure(configuration);
  const key = `p4/${randomUUID()}/blob`, bytes = Buffer.from('P4 owned persistent-service probe'), marker = randomUUID();
  const probeTable = `p4_probe_${marker.replaceAll('-', '')}`;
  let client, ownsTable = false, ownsObject = false;
  const connect = async () => {
    const candidate = new pg.Client({ connectionString: configuration.databaseUrl, connectionTimeoutMillis: 1000, query_timeout: 1500 });
    try { await candidate.connect(); return candidate; } catch { await candidate.end().catch(() => {}); throw new Error('P4 database readiness pending'); }
  };
  try {
    await p4Local('check'); await p4Local('migrate'); await p4Local('drift'); client = await connect();
    const migrations = await client.query('SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name');
    const expected = (await readdir('prisma/migrations')).filter(name => /^\d+_/.test(name)).sort();
    assert.deepEqual(migrations.rows.map(row => row.migration_name), expected);
    await client.query(`CREATE TABLE ${probeTable}(id UUID PRIMARY KEY)`); ownsTable = true;
    await client.query(`INSERT INTO ${probeTable}(id) VALUES($1)`, [marker]);
    ownsObject = true; await infrastructure.storage.put(key, bytes); await client.end(); client = undefined;
    await p4Local('restart-storage');
    const deadline = Date.now() + 30000; let ready = false;
    while (Date.now() < deadline) {
      try { client = await connect(); await infrastructure.storage.get(key, bytes.length); ready = true; break; }
      catch { await client?.end().catch(() => {}); client = undefined; await pause(200); }
    }
    assert.equal(ready, true, 'Restarted services must become usable');
    assert.deepEqual(await infrastructure.storage.get(key, bytes.length), bytes);
    assert.equal((await client.query(`SELECT id FROM ${probeTable} WHERE id=$1`, [marker])).rowCount, 1);
    await infrastructure.scanner.scan(bytes);
  } finally {
    try {
      await cleanupProbe([
        { name: 'database', async run() { if (ownsTable) { client ??= await connect(); await client.query(`DROP TABLE ${probeTable}`); } } },
        { name: 'object', async run() { if (ownsObject) await infrastructure.storage.remove(key); } },
      ]);
    } finally {
      try { await client?.end(); } finally { infrastructure.close(); await p4Local('stop'); }
    }
  }
});
