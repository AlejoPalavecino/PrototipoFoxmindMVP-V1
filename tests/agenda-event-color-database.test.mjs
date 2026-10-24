import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { withAgendaDatabase } from './agenda-database-helpers.test.mjs';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { privateEvent } from './agenda-event-form-helpers.test.mjs';

const tokens = ['BLUE', 'GREEN', 'YELLOW', 'ORANGE', 'PINK', 'PURPLE'];
function payload(color) {
  const { id, revision, ...event } = privateEvent();
  return { ...event, ...(color === undefined ? {} : { color }) };
}
async function seed(query) {
  const ids = [randomUUID(), randomUUID()];
  for (const id of ids) await query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at)
    VALUES($1,now(),$2,$2,'Color','Fixture','not-login',now())`, id, `${id}@example.invalid`);
  return ids;
}
test('PostgreSQL colors preserve retry identity, CAS, clear semantics and owner privacy with rollback', { timeout: 60000 }, async t => {
  const { createAgendaService, createAgendaUnitOfWork } = loadTsModule('apps/api/src/agenda/index.ts');
  await withAgendaDatabase(async ({ pool, transaction }) => {
    assert.match((await pool.query('SELECT current_database() name')).rows[0].name, /_test$/);
    await t.test('nullable incremental column has no default and does not rewrite legacy row', async () => transaction(async ({ query }) => {
      const [owner] = await seed(query), id = randomUUID();
      const migration = await readFile('prisma/migrations/202610240001_agenda_event_color/migration.sql', 'utf8');
      await query('ALTER TABLE agenda_events DROP COLUMN color');
      // Restore the pre-color schema, create through the legacy SQL shape, then apply only the incremental migration.
      const columns = await query("SELECT column_name FROM information_schema.columns WHERE table_name='agenda_events'");
      assert.ok(!columns.some(x => x.column_name === 'color'));
      await query(`INSERT INTO agenda_events(id,owner_id,title,description,category,schedule_kind,start_date,end_date_exclusive,repeat_kind)
        VALUES($1,$2,'Evento legacy','','CLASS','ALL_DAY','2026-10-27','2026-10-28','NONE')`, id, owner);
      const before = (await query('SELECT row_to_json(e) value FROM agenda_events e WHERE id=$1', id))[0].value;
      await query(migration);
      const after = (await query('SELECT row_to_json(e) value FROM agenda_events e WHERE id=$1', id))[0].value;
      assert.equal(after.color, null); delete after.color; assert.deepEqual(after, before);
      const [column] = await query("SELECT is_nullable,column_default FROM information_schema.columns WHERE table_name='agenda_events' AND column_name='color'");
      assert.deepEqual(column, { is_nullable: 'YES', column_default: null });
    }));
    await t.test('each color reloads, differs from omission and clears to SQL NULL', async () => transaction(async ({ database, query }) => {
      const [owner, other] = await seed(query);
      const make = () => createAgendaService(createAgendaUnitOfWork(database, async (_tx, request) => request.userId));
      for (const color of tokens) {
        const id = randomUUID(), first = await make().put({ userId: owner }, id, payload(color));
        assert.equal(first.event.color, color);
        assert.deepEqual(await make().get({ userId: owner }, id), first.event);
        assert.deepEqual(await make().put({ userId: owner }, id, payload(color)), { created: false, event: first.event });
        for (const change of [undefined, color === 'BLUE' ? 'GREEN' : 'BLUE'])
          await assert.rejects(make().put({ userId: owner }, id, payload(change)), { code: 'CONFLICT' });
        await assert.rejects(make().get({ userId: other }, id), { code: 'FORBIDDEN' });
        const cleared = await make().replace({ userId: owner }, id, { revision: '0', event: payload() });
        assert.equal(cleared.revision, '1'); assert.equal(Object.hasOwn(cleared, 'color'), false);
        assert.equal((await query('SELECT color FROM agenda_events WHERE id=$1', id))[0].color, null);
        assert.equal(Object.hasOwn(await make().get({ userId: owner }, id), 'color'), false);
      }
    }));
    await t.test('CHECK rejects invalid SQL colors and stale color CAS has one winner', async () => transaction(async ({ database, query }) => {
      const [owner, other] = await seed(query), id = randomUUID();
      const make = () => createAgendaService(createAgendaUnitOfWork(database, async (_tx, request) => request.userId));
      await make().put({ userId: owner }, id, payload('BLUE'));
      for (const color of ['AUTO', 'blue', '#DBEAFE', '']) {
        await query('SAVEPOINT bad_color');
        await assert.rejects(query('UPDATE agenda_events SET color=$2 WHERE id=$1', id, color), e => e.code === '23514');
        await query('ROLLBACK TO SAVEPOINT bad_color');
      }
      const replace = (actor, color) => make().replace({ userId: actor }, id, { revision: '0', event: payload(color) });
      await assert.rejects(replace(other, 'PINK'), { code: 'FORBIDDEN' });
      const results = await Promise.allSettled([replace(owner, 'GREEN'), replace(owner, 'PURPLE')]);
      assert.equal(results.filter(x => x.status === 'fulfilled').length, 1);
      assert.equal(results.find(x => x.status === 'rejected').reason.code, 'CONFLICT');
      const winner = await make().get({ userId: owner }, id); assert.equal(winner.revision, '1');
      assert.ok(['GREEN', 'PURPLE'].includes(winner.color));
    }));
    assert.equal((await pool.query('SELECT count(*)::int count FROM agenda_events')).rows[0].count, 0);
    assert.equal((await pool.query('SELECT count(*)::int count FROM users')).rows[0].count, 0);
  });
});
