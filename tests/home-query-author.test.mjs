import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';

const classroomId = '10000000-0000-4000-8000-000000000001';
const postId = '20000000-0000-4000-8000-000000000002';
const actorId = '30000000-0000-4000-8000-000000000003';
const now = '2026-11-16T12:00:00.000Z';
const item = { id: postId, title: 'Consulta de prueba', updatedAt: now,
  target: { kind: 'wall', classroomId, postId },
  classroom: { id: classroomId, name: 'Aula sintética', division: 'A', subject: 'Ciencias',
    role: 'teacher', coverKey: 'mint', archived: false, timeZone: 'UTC' } };
const page = row => ({ status: 'ready', items: [row], totalItems: 1, nextCursor: null });

test('home queries accept the public author name and preserve old responses without it', () => {
  const { parseHomePage } = loadTsModule('src/core/domain/home/rows-validation.ts');
  assert.deepEqual(parseHomePage('queries', page(item)).items[0], item);
  const named = { ...item, authorName: 'María Pérez' };
  assert.deepEqual(parseHomePage('queries', page(named)).items[0], named);
});

test('home queries reject malformed optional author names and unrequested identity fields', () => {
  const { parseHomePage } = loadTsModule('src/core/domain/home/rows-validation.ts');
  for (const authorName of [null, undefined, 42, '', '   ', 'x'.repeat(501), 'Nombre\nApellido', 'Nombre\u0000'])
    assert.throws(() => parseHomePage('queries', page({ ...item, authorName })), { code: 'INVALID_INPUT' });
  assert.throws(() => parseHomePage('queries', page({ ...item, authorName: 'María Pérez', authorEmail: 'private@example.test' })), { code: 'INVALID_INPUT' });
});

test('query projection joins the post author and retains the actor-authorized room and unanswered filters', async () => {
  const { readSqlPage } = loadTsModule('apps/api/src/modules/home/infrastructure/sql-page.ts');
  const calls = [];
  const row = { ...item, authorName: 'María Pérez' };
  const tx = { query: async (sql, ...params) => { calls.push({ sql, params }); return [{ item: row, policy: null, sort_key: now + '|' + postId, total: 1, needs_review: 0, ready_to_publish: 0 }]; } };
  const result = await readSqlPage(tx, { userId: actorId, now }, { module: 'queries', timeZone: 'UTC', cursor: null });
  assert.equal(result.items[0].authorName, 'María Pérez');
  assert.equal(calls.length, 1);
  const { sql, params } = calls[0];
  assert.deepEqual(params, [actorId, now, '']);
  assert.match(sql, /JOIN users author ON author\.id=p\.author_id/);
  assert.match(sql, /'authorName',concat\(author\.first_name,' ',author\.last_name\)/);
  assert.match(sql, /FROM classrooms c WHERE c\.teacher_id=\$1::uuid OR EXISTS/);
  assert.match(sql, /mp\.ended_at IS NULL/);
  assert.match(sql, /p\.classroom_id=c\.id AND p\.type='QUERY' AND p\.removed_at IS NULL/);
  assert.match(sql, /WHERE c\.role='teacher' AND c\.archived_at IS NULL/);
  assert.match(sql, /NOT EXISTS \(SELECT 1 FROM wall_replies answer WHERE answer\.post_id=p\.id\s+AND answer\.author_id=c\.teacher_id AND answer\.removed_at IS NULL\)/);
  assert.doesNotMatch(sql, /author\.(?:email|password_hash|avatar_key)/);
});

test('query title projection prefers a nonblank post title and retains the historical body excerpt fallback', () => {
  const { queriesQuery } = loadTsModule('apps/api/src/modules/home/infrastructure/queries-content.ts');
  assert.ok(queriesQuery.includes("'title',coalesce(nullif(btrim(p.title),''),left(regexp_replace(p.body,'[[:cntrl:]]',' ','g'),160))"));
});
