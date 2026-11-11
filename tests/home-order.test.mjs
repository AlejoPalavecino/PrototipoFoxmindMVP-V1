import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { parseHomePageQuery } from '../src/core/domain/home/validation.ts';
import { nextCursor, readCursor } from '../apps/api/src/modules/home/infrastructure/cursor.ts';
import { readSqlPage } from '../apps/api/src/modules/home/infrastructure/sql-page.ts';
import { createHomeHandler } from '../apps/api/src/modules/home/presentation/http.ts';
import { createHomeService } from '../apps/api/src/modules/home/application/service.ts';
import { createWebHomeClient } from '../apps/web/src/application/academic-home-client.ts';
import { proxyHomeRequest } from '../apps/web/src/application/server/home-proxy.ts';

const id = n => `11111111-1111-4111-8111-${String(n).padStart(12, '0')}`;
const actor = { userId: id(90), now: '2026-10-25T12:00:00.000Z' };
const query = (module, order, cursor = null) => ({ module, timeZone: 'UTC', cursor, ...(order ? { order } : {}) });
const invalid = { code: 'INVALID_INPUT' };

test('Home page accepts optional asc/desc only on review and queries', () => {
  for (const module of ['review', 'queries']) {
    for (const order of [undefined, 'asc', 'desc']) {
      const input = query(module, order);
      assert.deepEqual(parseHomePageQuery(input), input);
    }
    for (const order of ['', 'ascending', 'ASC', null]) {
      assert.throws(() => parseHomePageQuery({ ...query(module), order }), invalid);
    }
  }
  for (const module of ['pending', 'feedback', 'agenda', 'materials', 'classrooms', 'drafts', 'submitted']) {
    assert.throws(() => parseHomePageQuery(query(module, 'asc')), invalid);
    assert.deepEqual(parseHomePageQuery(query(module)), query(module));
  }
});

test('Home cursors bind the normalized sort direction and retain actor/module/time zone scope', () => {
  for (const [module, defaultOrder, opposite] of [['review', 'asc', 'desc'], ['queries', 'desc', 'asc']]) {
    const key = 'sort-key';
    const defaultCursor = nextCursor(actor, query(module), key);
    assert.equal(readCursor(actor, query(module, defaultOrder, defaultCursor)), key);
    assert.throws(() => readCursor(actor, query(module, opposite, defaultCursor)), invalid);
    const reverseCursor = nextCursor(actor, query(module, opposite), key);
    const continuation = query(module, opposite, reverseCursor);
    assert.equal(readCursor(actor, continuation), key);
    assert.throws(() => readCursor(actor, query(module, undefined, reverseCursor)), invalid);
    assert.throws(() => readCursor({ ...actor, userId: id(91) }, continuation), invalid);
    assert.throws(() => readCursor(actor, { ...continuation, module: 'feedback' }), invalid);
    assert.throws(() => readCursor(actor, { ...continuation, timeZone: 'America/Argentina/Buenos_Aires' }), invalid);
  }
});

function pageFixture(module) {
  const classroom = { id: id(80), name: 'Aula', division: 'A', subject: 'Ciencias',
    role: 'teacher', coverKey: 'explore', archived: false, timeZone: 'UTC' };
  const rows = [0, 1, 2, 2, 2, 2, 3].map((day, n) => {
    const timestamp = `2026-10-2${day + 1}T12:00:00.000Z`;
    const target = module === 'review'
      ? { kind: 'submissions', classroomId: classroom.id, activityId: id(81), attemptId: id(n), filter: 'unpublished' }
      : { kind: 'wall', classroomId: classroom.id, postId: id(n) };
    const details = module === 'review'
      ? { activityType: 'ASSIGNMENT', oldestSubmittedAt: timestamp, needsReview: 1, readyToPublish: 0 }
      : { updatedAt: timestamp };
    return { item: { id: id(n), title: 'Registro sintético', classroom, target, ...details },
      sort_key: `${timestamp}|${id(n)}`, total: 7, needs_review: 7, ready_to_publish: 0 };
  });
  return {
    ids: rows.map(row => row.item.id),
    async query(sql, userId, now, after) {
      assert.equal(userId, actor.userId);
      assert.equal(now, actor.now);
      const order = /ORDER BY sort_key (ASC|DESC) LIMIT 6/.exec(sql)?.[1];
      assert.ok(order);
      assert.ok(sql.includes(`ORDER BY sort_key ${order} NULLS LAST`));
      const descending = order === 'DESC';
      const comparison = descending ? '<' : '>';
      assert.ok(sql.includes(`sort_key ${comparison} $3::text`));
      const sorted = descending ? rows.toReversed() : rows;
      return sorted.filter(row => !after || (descending ? row.sort_key < after : row.sort_key > after)).slice(0, 6);
    },
  };
}

test('Review and queries select and continue in either direction across tied timestamps', async () => {
  for (const module of ['review', 'queries']) {
    const tx = pageFixture(module);
    for (const order of ['asc', 'desc']) {
      const first = await readSqlPage(tx, actor, query(module, order));
      assert.ok(first.nextCursor);
      assert.equal(first.totalItems, 7);
      assert.equal(first.items.length, 5);
      const second = await readSqlPage(tx, actor, query(module, order, first.nextCursor));
      assert.equal(second.totalItems, 7);
      assert.equal(second.nextCursor, null);
      const ids = [...first.items, ...second.items].map(item => item.id);
      assert.deepEqual(ids, order === 'asc' ? tx.ids : tx.ids.toReversed(), `${module} ${order}`);
    }
  }
});

async function withServer(handler, run) {
  const host = createServer(handler);
  await new Promise(resolve => host.listen(0, '127.0.0.1', resolve));
  try {
    return await run(`http://127.0.0.1:${host.address().port}`);
  } finally {
    host.closeAllConnections();
    await new Promise(resolve => host.close(resolve));
  }
}

test('Home client and proxy send the direction, and both HTTP boundaries reject invalid values', async () => {
  const received = [];
  const service = createHomeService({
    async run(_request, write, operation) {
      assert.equal(write, false);
      return operation({ actor, read: {
        async participation() {},
        async page(_module, input) {
          received.push(input);
          return { status: 'ready', items: [], totalItems: 0, nextCursor: null };
        },
      } });
    },
  });
  const handler = createHomeHandler(service, { async admit(_request, write) { assert.equal(write, false); } });
  await withServer((req, res) => {
    req.url = req.url.replace(/^\/api\/v1/, '');
    handler(req, res, () => res.end());
  }, async api => {
    await withServer((req, res) => void proxyHomeRequest(req, res, api), async web => {
      const client = createWebHomeClient((path, options) => fetch(web + path, options));
      for (const input of [query('review', 'desc'), query('queries', 'asc', 'opaque'), query('review')]) {
        await client.page(input);
        assert.deepEqual(received.at(-1), input);
      }
      for (const origin of [api, web]) {
        for (const path of ['/modules/review?timeZone=UTC&order=ASC', '/modules/agenda?timeZone=UTC&order=desc',
          '/modules/queries?timeZone=UTC&order=asc&order=desc', '/modules/review?timeZone=UTC&module=queries', '?timeZone=UTC&order=asc']) {
          const response = await fetch(`${origin}/api/v1/home${path}`);
          assert.equal(response.status, 400);
          assert.deepEqual(await response.json(), { error: invalid });
        }
      }
      assert.equal(received.length, 3);
    });
  });
});
