import test from 'node:test';
import assert from 'node:assert/strict';
import { withAgendaDatabase } from './agenda-database-helpers.test.mjs';
import { homeFixture } from './foxmind-3d-repository-fixture.test.mjs';
import { createHomeService } from '../apps/api/src/modules/home/dashboard/application/service.ts';
import { createHomeUnitOfWork } from '../apps/api/src/modules/home/dashboard/infrastructure/unit-of-work.ts';

test('Home paginates authorized review and queries in both directions on PostgreSQL', { timeout: 120000 }, async () => {
  await withAgendaDatabase(async ({ transaction }) => transaction(async ({ database, query: sql }) => {
    const fixture = await homeFixture(sql);
    const service = createHomeService(createHomeUnitOfWork(database, async (_tx, request) => request.userId));
    const actor = { userId: fixture.teacherActor };

    for (const [module, defaultOrder] of [['review', 'asc'], ['queries', 'desc']]) {
      const createItem = async room => module === 'review' ? fixture.attempt(await fixture.activity(room)) : fixture.post(room);
      const seeded = [];
      for (const offset of [0, 1, 2, 2, 2, 2, 3]) {
        const id = await createItem('teach');
        const timestamp = new Date(Date.parse(fixture.at(-1)) + offset * 60000).toISOString();
        if (module === 'review') await sql('UPDATE attempts SET submitted_at=$2 WHERE id=$1', id, timestamp);
        else await sql('UPDATE wall_posts SET created_at=$2 WHERE id=$1', id, timestamp);
        seeded.push({ id, key: `${timestamp}|${id}` });
      }
      await createItem('foreign');
      await createItem('archived');

      const expectedAsc = seeded.toSorted((a, b) => a.key < b.key ? -1 : 1).map(row => row.id);
      const input = (order, cursor = null) => ({ module, timeZone: 'UTC', cursor, order });
      const overview = await service.read(actor, { timeZone: 'UTC' });
      const defaultPage = (await service.page(actor, input(defaultOrder))).page;
      assert.deepEqual(overview.modules[module], defaultPage);

      for (const order of ['asc', 'desc']) {
        const first = (await service.page(actor, input(order))).page;
        assert.equal(first.totalItems, 7);
        assert.equal(first.items.length, 5);
        assert.ok(first.nextCursor);
        const tail = (await service.page(actor, input(order, first.nextCursor))).page;
        assert.equal(tail.totalItems, 7);
        assert.equal(tail.nextCursor, null);
        assert.deepEqual([...first.items, ...tail.items].map(item => item.id),
          order === 'asc' ? expectedAsc : expectedAsc.toReversed());
        const opposite = order === 'asc' ? 'desc' : 'asc';
        await assert.rejects(service.page(actor, input(opposite, first.nextCursor)), { code: 'INVALID_INPUT' });
        const student = await service.page({ userId: fixture.pupil }, input(order));
        assert.deepEqual(student.page, { status: 'not-applicable' });
      }
    }
  }));
});
