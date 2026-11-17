import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withP5Database } from '../scripts/p5-database.mjs';
import { FileStore } from '../.build/api/apps/api/src/modules/files/custody/infrastructure/store.js';
import { ClassroomService } from './helpers/academic-fixture.ts';

test('large wall traverses bounded pages without losing ties or microseconds and rechecks membership', { timeout: 120000 }, async () => {
  await withP5Database(async ({ pool, database }) => {
    const teacher = randomUUID(), student = randomUUID(), room = randomUUID(), other = randomUUID(), enrollment = randomUUID();
    for (const id of [teacher, student]) await pool.query(`INSERT INTO users
      (id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
      VALUES($1,now(),$2,$2,'Synthetic','Fixture','fixture',now(),$3)`, [id, `${id}@example.test`, id === student ? 'student' : 'teacher']);
    for (const id of [room, other]) await pool.query(`INSERT INTO classrooms
      (id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
      VALUES($1,now(),$2,'Synthetic','Subject','A',2026,'UTC','explore',100000000)`, [id, teacher]);
    await pool.query('INSERT INTO enrollments(id,updated_at,classroom_id,student_id) VALUES($1,now(),$2,$3)', [enrollment, room, student]);
    await pool.query(`INSERT INTO membership_periods(id,updated_at,enrollment_id,classroom_id,entry_method) VALUES($1,now(),$2,$3,'CODE')`, [randomUUID(), enrollment, room]);
    // 430 permitted 5,000-byte bodies exceed 2 MiB even before JSON metadata.
    await pool.query(`INSERT INTO wall_posts(id,updated_at,classroom_id,author_id,type,body,created_at)
      SELECT gen_random_uuid(),now(),$1::uuid,$2::uuid,'NOTICE','x' || repeat('a',4999),
      '2026-01-01T00:00:00Z'::timestamptz + ((n / 3) * interval '1 microsecond')
      FROM generate_series(1,430) n`, [room, teacher]);
    const expected = (await pool.query('SELECT id FROM wall_posts WHERE classroom_id=$1 ORDER BY created_at DESC,id', [room])).rows.map(r => r.id);
    const targetPost = expected.at(-1);
    await pool.query(`INSERT INTO wall_replies(id,updated_at,post_id,classroom_id,author_id,body,created_at)
      SELECT gen_random_uuid(),now(),$1::uuid,$2::uuid,$3::uuid,'reply ' || n,
      '2026-01-01T00:00:00Z'::timestamptz + ((n / 3) * interval '1 microsecond')
      FROM generate_series(1,45) n`, [targetPost, room, teacher]);
    const expectedReplies = (await pool.query('SELECT id FROM wall_replies WHERE post_id=$1 ORDER BY created_at,id', [targetPost])).rows.map(r => r.id);
    const authenticate = async (_tx, req) => req.actor;
    const files = new FileStore(database, { authenticate, authorize: async () => {} }, 100000000n);
    const service = new ClassroomService({ database, files, authenticate, signingKey: Buffer.alloc(32, 1), deliveryKey: Buffer.alloc(32, 2), classroomQuotaBytes: 100000000n, webOrigin: 'http://127.0.0.1:3005' });
    const user = { actor: student }, found = []; let cursor = null, firstCursor;
    do {
      const page = await service.listWall(user, room, cursor ? { limit: 10, cursor } : { limit: 10 });
      assert.ok(page.posts.length <= 10);
      assert.ok(Buffer.byteLength(JSON.stringify(page)) < 2 * 1024 * 1024);
      found.push(...page.posts.map(p => p.id));
      cursor = page.nextCursor;
      if (!firstCursor) firstCursor = cursor;
      assert.ok(found.length <= expected.length, 'cursor traversal must terminate without duplicate pages');
    } while (cursor);
    assert.deepEqual(found, expected);
    assert.ok(firstCursor);
    const oldQuery=randomUUID();await pool.query(`INSERT INTO wall_posts(id,updated_at,classroom_id,author_id,type,body,created_at) VALUES($1,now(),$2,$3,'QUERY','Consulta antigua','2025-12-31T00:00:00Z')`,[oldQuery,room,student]);
    const queries=await service.listWall(user,room,{type:'QUERY'});assert.deepEqual(queries.posts.map(post=>post.id),[oldQuery]);assert.equal(queries.nextCursor,null);
    const notices=await service.listWall(user,room,{type:'NOTICE'});assert.equal(notices.posts.length,10);assert.ok(notices.nextCursor);
    await assert.rejects(service.listWall(user,room,{type:'QUERY',cursor:notices.nextCursor}),{code:'INVALID_INPUT'});
    const altered = `${firstCursor.slice(0, -1)}${firstCursor.endsWith('A') ? 'B' : 'A'}`;
    await assert.rejects(() => service.listWall(user, room, { cursor: altered }), e => e.code === 'INVALID_INPUT');
    await assert.rejects(() => service.listWall({ actor: teacher }, other, { cursor: firstCursor }), e => e.code === 'INVALID_INPUT');
    await assert.rejects(() => service.wallThread(user, room, targetPost, randomUUID()), e => e.code === 'FORBIDDEN');
    const target = await service.wallThread(user, room, targetPost, expectedReplies[34]);
    assert.equal(target.post.id, targetPost);
    assert.ok(target.post.replies.some(reply => reply.id === expectedReplies[34]));
    assert.ok(target.post.replies.length <= 20);
    const replyIds = []; let replyCursor = null, firstReplyCursor;
    do {
      const page = await service.listWallReplies(user, room, targetPost, replyCursor ? { limit: 20, cursor: replyCursor } : { limit: 20 });
      assert.ok(page.replies.length <= 20);
      replyIds.push(...page.replies.map(reply => reply.id));
      replyCursor = page.nextCursor;
      if (!firstReplyCursor) firstReplyCursor = replyCursor;
      assert.ok(replyIds.length <= expectedReplies.length);
    } while (replyCursor);
    assert.deepEqual(replyIds, expectedReplies);
    assert.ok(firstReplyCursor);
    await assert.rejects(() => service.listWall(user, room, { cursor: firstReplyCursor }), e => e.code === 'INVALID_INPUT');
    await assert.rejects(() => service.listWallReplies(user, room, targetPost, { cursor: firstCursor }), e => e.code === 'INVALID_INPUT');
    await pool.query(`UPDATE membership_periods SET ended_at=now(), end_reason='REMOVED', ended_by_id=$2, updated_at=now() WHERE enrollment_id=$1`, [enrollment, teacher]);
    await assert.rejects(() => service.listWall(user, room, { cursor: firstCursor }), e => e.code === 'FORBIDDEN');
  });
});
