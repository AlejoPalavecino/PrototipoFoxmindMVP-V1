import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../.build/api/.generated/prisma/client.js';
import { withAgendaDatabase } from './agenda-database-helpers.test.mjs';
import { loadTsModule } from './helpers/load-ts-module.mjs';

async function user(query) {
  const id = randomUUID();
  await query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
    VALUES($1,now(),$2,$2,'Agenda','Regression','not-login',now(),'teacher')`, id, `${id}@example.invalid`);
  return id;
}

test('persisted timed event remains visible across the full supported timezone difference', { timeout: 60000 }, async () => {
  const { createAgendaService, createAgendaUnitOfWork } = Object.freeze({createAgendaService: loadTsModule("apps/api/src/modules/agenda/application/agenda-service.ts").createAgendaService,createAgendaUnitOfWork: loadTsModule("apps/api/src/bootstrap/agenda-composition.ts").createAgendaUnitOfWork});
  await withAgendaDatabase(async ({ transaction }) => transaction(async ({ query, database }) => {
    const owner = await user(query), id = randomUUID();
    const service = createAgendaService(createAgendaUnitOfWork(database, async () => owner));
    const event = { title: 'Medianoche del Pacífico', description: '', category: 'CLASS',
      schedule: { kind: 'TIMED', timeZone: 'Pacific/Kiritimati',
        startLocal: '2026-11-03T00:15', endLocal: '2026-11-03T00:45' }, repeat: { kind: 'NONE' } };
    await service.put({}, id, event);
    const range = { startDate: '2026-11-01', endDateExclusive: '2026-11-02', timeZone: 'Etc/GMT+12' };
    const result = await service.list({}, range);
    assert.equal(result.items.length, 1, 'The stored event occurs on November 1 in the viewer timezone');
    assert.equal(result.items[0].event.id, id);
    assert.equal(result.items[0].startAt, '2026-11-02T10:15:00.000Z');
    assert.equal(result.items[0].endAt, '2026-11-02T10:45:00.000Z');
    assert.equal((await service.list({}, { ...range, startDate: '2026-11-02', endDateExclusive: '2026-11-03' })).items.length, 0);
  }));
});

test('eighty valid yearly weekly series return the requested month within the existing real transaction budget', { timeout: 60000 }, async t => {
  const { createAgendaService, createAgendaUnitOfWork } = Object.freeze({createAgendaService: loadTsModule("apps/api/src/modules/agenda/application/agenda-service.ts").createAgendaService,createAgendaUnitOfWork: loadTsModule("apps/api/src/bootstrap/agenda-composition.ts").createAgendaUnitOfWork});
  const { parseAgendaEvent, validateAgendaSeries } = loadTsModule('src/core/domain/index.ts');
  const input = parseAgendaEvent({ title: 'Serie anual', description: '', category: 'CLASS',
    schedule: { kind: 'TIMED', timeZone: 'America/New_York', startLocal: '2026-01-05T09:00', endLocal: '2026-01-05T10:00' },
    repeat: { kind: 'WEEKLY', untilDate: '2027-01-04' } });
  validateAgendaSeries(input);
  await withAgendaDatabase(async ({ pool, databaseUrl }) => {
    const query = async (sql, ...values) => (await pool.query(sql, values)).rows;
    const owner = await user(query);
    // Fresh owned DB fixture: each series is the same validated 53-occurrence schedule, with a different identity.
    await query(`INSERT INTO agenda_events(id,owner_id,title,description,category,schedule_kind,start_date,end_date_exclusive,
      start_local,end_local,time_zone,start_at,end_at,repeat_kind,repeat_until)
      SELECT gen_random_uuid(),$1::uuid,'Serie anual '||n,'','CLASS','TIMED','2026-01-05','2026-01-06',
      '2026-01-05T09:00','2026-01-05T10:00','America/New_York','2026-01-05T14:00Z','2026-01-05T15:00Z',
      'WEEKLY','2027-01-04' FROM generate_series(1,80) n`, owner);
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl, max: 3,
      connectionTimeoutMillis: 1000, statement_timeout: 5000 }) });
    try {
      // Revalidate the persisted actor after expansion, preserving the real asynchronous transaction boundary.
      const authenticate = async tx => (await tx.query('SELECT id FROM users WHERE id=$1::uuid', owner))[0].id;
      const service = createAgendaService(createAgendaUnitOfWork(prisma, authenticate));
      const range = { startDate: '2026-01-01', endDateExclusive: '2026-02-01', timeZone: 'America/New_York' };
      const started = performance.now();
      let first;
      try { first = await service.list({}, range); }
      finally { t.diagnostic(`First monthly query: ${Math.round(performance.now() - started)}ms; production transaction budget remains 6000ms`); }
      assert.equal(first.items.length, 200); assert.equal(typeof first.nextCursor, 'string');
      const second = await service.list({}, range, first.nextCursor);
      assert.equal(second.items.length, 120); assert.equal(second.nextCursor, null);
      const items = [...first.items, ...second.items];
      assert.equal(new Set(items.map(x => x.occurrenceId)).size, 320);
      assert.ok(items.every(x => x.startAt >= '2026-01-01T05:00:00.000Z' && x.startAt < '2026-02-01T05:00:00.000Z'));
    } finally { await prisma.$disconnect(); }
  });
});
