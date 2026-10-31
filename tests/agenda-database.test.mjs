import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from './agenda-database-helpers.test.mjs';
import { loadTsModule } from './helpers/load-ts-module.mjs';

const payload = () => ({ title: 'Persistido', description: '', category: 'CLASS',
  schedule: { kind: 'TIMED', timeZone: 'UTC', startLocal: '2026-11-01T10:00', endLocal: '2026-11-01T11:00' }, repeat: { kind: 'NONE' } });
const range = { startDate: '2026-11-01', endDateExclusive: '2026-12-01', timeZone: 'UTC' };
async function seed(query) {
  const ids = [randomUUID(), randomUUID()];
  for (const id of ids) await query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
    VALUES($1,now(),$2,$2,'Agenda','Fixture','not-a-login',now(),'teacher')`, id, `${id}@example.invalid`);
  return ids;
}
test('agenda real PostgreSQL persistence, constraints and isolation with per-case rollback', { timeout: 60000 }, async t => {
  const { createAgendaService, createAgendaUnitOfWork } = loadTsModule('apps/api/src/agenda/index.ts');
  assert.equal(typeof createAgendaUnitOfWork, 'function');
  await withAgendaDatabase(async ({ pool, transaction }) => {
    assert.match((await pool.query('SELECT current_database() name')).rows[0].name, /_test$/);
    await t.test('new service reads persisted events; foreign CRUD denied; revision changes survive new instance', async () => transaction(async ({ database, query }) => {
      const [A, B] = await seed(query), id = randomUUID();
      // This auth stub exercises the real owner-bound UoW/SQL; persisted session+CSRF belongs to HTTP integration.
      const make = () => createAgendaService(createAgendaUnitOfWork(database, async (_tx, request) => request.userId));
      const first = await make().put({ userId: A }, id, payload()); assert.equal(first.created, true);
      assert.deepEqual(await make().get({ userId: A }, id), first.event);
      for (const foreign of [id, randomUUID()]) {
        await assert.rejects(make().get({ userId: B }, foreign), { code: 'FORBIDDEN' });
        await assert.rejects(make().replace({ userId: B }, foreign, { revision: '0', event: payload() }), { code: 'FORBIDDEN' });
        await assert.rejects(make().remove({ userId: B }, foreign, { revision: '0' }), { code: 'FORBIDDEN' });
      }
      assert.deepEqual((await make().list({ userId: B }, range)).items, []);
      const updated = await make().replace({ userId: A }, id, { revision: '0', event: { ...payload(), title: 'Cambio' } });
      assert.equal(updated.revision, '1'); assert.equal((await make().get({ userId: A }, id)).title, 'Cambio');
      await assert.rejects(make().replace({ userId: A }, id, { revision: '0', event: payload() }), { code: 'CONFLICT' });
      await make().remove({ userId: A }, id, { revision: '1' });
      assert.equal((await query('SELECT count(*)::int count FROM agenda_events WHERE id=$1::uuid', id))[0].count, 0);
    }));
    await t.test('database rejects invalid title/category/revision independently of application validation', async () => transaction(async ({ database, query }) => {
      const [A] = await seed(query), id = randomUUID();
      const service = createAgendaService(createAgendaUnitOfWork(database, async () => A));
      await service.put({}, id, payload());
      for (const sql of ["UPDATE agenda_events SET title='' WHERE id=$1", "UPDATE agenda_events SET revision=-1 WHERE id=$1"] ) {
        await query('SAVEPOINT invalid_write');
        await assert.rejects(query(sql, id), error => error.code === '23514');
        await query('ROLLBACK TO SAVEPOINT invalid_write');
      }
      await query('SAVEPOINT invalid_owner');
      await assert.rejects(query('UPDATE agenda_events SET owner_id=$2 WHERE id=$1', id, randomUUID()), error => error.code === '23503');
      await query('ROLLBACK TO SAVEPOINT invalid_owner');
    }));
    assert.equal((await pool.query('SELECT count(*)::int count FROM agenda_events')).rows[0].count, 0);
    assert.equal((await pool.query('SELECT count(*)::int count FROM users')).rows[0].count, 0);
  });
});
