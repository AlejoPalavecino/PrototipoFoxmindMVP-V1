import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withP5Database } from '../scripts/p5-database.mjs';
import { FileStore } from '../.build/api/apps/api/src/modules/files/custody/infrastructure/store.js';
import { ClassroomService } from './helpers/academic-fixture.ts';

test('P6 Muro preserves scoped authorship, grouped history and revision guards', { timeout: 120000 }, async t => {
  await withP5Database(async ({ pool, database }) => {
    const teacher = randomUUID(), student = randomUUID(), secondTeacher = randomUUID(), secondStudent = randomUUID(), peer = randomUUID(), foreign = randomUUID(), unverified = randomUUID(), room = randomUUID(), otherRoom = randomUUID();
    for (const id of [teacher, student, secondTeacher, secondStudent, peer, foreign, unverified]) await pool.query(`INSERT INTO users
      (id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
      VALUES($1,now(),$2,$2,'Muro','Fixture','fixture',$3,$4)`, [id, `${id}@example.test`, id === unverified ? null : new Date(), [teacher, secondTeacher].includes(id) ? 'teacher' : 'student']);
    for (const [id, owner] of [[room, teacher], [otherRoom, secondTeacher]]) await pool.query(`INSERT INTO classrooms
      (id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
      VALUES($1,now(),$2,'Wall fixture','Subject','A',2026,'UTC','explore',100000000)`, [id, owner]);
    for (const id of [student, peer, unverified]) {
      const enrollment = randomUUID();
      await pool.query('INSERT INTO enrollments(id,updated_at,classroom_id,student_id) VALUES($1,now(),$2,$3)', [enrollment, room, id]);
      await pool.query(`INSERT INTO membership_periods(id,updated_at,enrollment_id,classroom_id,entry_method) VALUES($1,now(),$2,$3,'CODE')`, [randomUUID(), enrollment, room]);
    }
    const authenticate = async (_tx, req) => req.actor;
    const files = new FileStore(database, { authenticate, authorize: async () => {} }, 100000000n);
    const service = new ClassroomService({ database, files, authenticate, signingKey: Buffer.alloc(32, 1), deliveryKey: Buffer.alloc(32, 2), classroomQuotaBytes: 100000000n, webOrigin: 'http://127.0.0.1:3005' });
    const T = { actor: teacher }, S = { actor: student }, ST = { actor: secondTeacher }, SS = { actor: secondStudent }, P = { actor: peer }, F = { actor: foreign }, U = { actor: unverified };
    const snapshot = async () => JSON.stringify((await pool.query(`SELECT
      (SELECT jsonb_agg(to_jsonb(p) ORDER BY id) FROM wall_posts p) AS posts,
      (SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM wall_replies r) AS replies,
      (SELECT jsonb_agg(to_jsonb(n) ORDER BY id) FROM notifications n) AS notifications,
      (SELECT jsonb_agg(to_jsonb(c) ORDER BY id) FROM classrooms c) AS classrooms,
      (SELECT jsonb_agg(to_jsonb(a) ORDER BY id) FROM account_action_controls a) AS controls`)).rows);
    const change = async (actor, operation, classroomId = room) => service.changeWall(actor, classroomId, { revision: (await service.detail(T, room)).revision, operation });
    const deny = async (actor, operation, code, revision, classroomId = room) => {
      const before = await snapshot();
      await assert.rejects(async () => service.changeWall(actor, classroomId, { revision: revision ?? (await service.detail(T, room)).revision, operation }), e => e.code === code);
      assert.equal(await snapshot(), before, 'rejection preserves all stored wall/notification/revision/control data');
    };
    let post, query, reply;
    await t.test('roles are classroom scoped; lists disclose names/initials and no account identifiers', async () => {
      assert.deepEqual((await service.listWall(T, room)).posts, []);
      await change(T, { action: 'publish', body: 'Notice\nSecond line\twith tab' });
      post = (await service.listWall(S, room)).posts[0].id;
      await change(S, { action: 'publish', body: '<script>literal text</script>' });
      const posts = (await service.listWall(P, room)).posts;
      query = posts[0].id;
      assert.deepEqual(posts.map(p => p.type), ['QUERY', 'NOTICE']);
      assert.equal(posts[1].body, 'Notice\nSecond line\twith tab');
      assert.equal(posts[0].body, '<script>literal text</script>');
      assert.equal(posts[0].authorName, 'Muro Fixture');
      assert.equal(posts[0].initials, 'MF');
      assert.equal(posts[0].canEdit, false);
      assert.equal((await service.listWall(S, room)).posts[0].canEdit, true);
      assert.doesNotMatch(JSON.stringify(posts), /email|authorId|author_id|password|avatar/i);
      await service.changeWall(ST, otherRoom, { revision: '0', operation: { action: 'publish', body: 'Teacher in another room' } });
      assert.equal((await service.listWall(ST, otherRoom)).posts[0].type, 'NOTICE');
    });
    await t.test('each reply belongs to a scoped parent and remains oldest first; post ordering has stable ties', async () => {
      await change(P, { action: 'reply', postId: post, body: 'First reply' });
      reply = (await service.listWall(T, room)).posts.find(p => p.id === post).replies[0].id;
      await change(T, { action: 'reply', postId: post, body: 'Second reply' });
      const thread = (await service.listWall(S, room)).posts.find(p => p.id === post);
      assert.deepEqual(thread.replies.map(r => r.body), ['First reply', 'Second reply']);
      assert.equal((await service.listWall(T, room)).posts.find(p => p.id === query).replies.length, 0);
      await pool.query("UPDATE wall_posts SET created_at='2026-01-01' WHERE classroom_id=$1", [room]);
      await pool.query("UPDATE wall_replies SET created_at='2026-01-01' WHERE classroom_id=$1", [room]);
      const tied = await service.listWall(T, room);
      assert.deepEqual(tied.posts.map(p => p.id), [post, query].sort());
      assert.deepEqual(tied.posts.find(p => p.id === post).replies.map(r => r.id), thread.replies.map(r => r.id).sort());
      await deny(S, { action: 'reply', postId: randomUUID(), body: 'Foreign target' }, 'FORBIDDEN');
    });
    await t.test('publication and reply text accept 5000 Unicode characters, reject controls, empty and overflow without truncation', async () => {
      const boundary = '😀'.repeat(5000);
      await change(S, { action: 'editPost', id: query, body: boundary });
      assert.equal((await service.listWall(T, room)).posts.find(p => p.id === query).body, boundary);
      await change(P, { action: 'editReply', id: reply, body: boundary });
      for (const body of ['', ' \n\t ', '\u0000', 'x\u0008', 'x\u007f', '\ud800', 'x'.repeat(5001), '😀'.repeat(5001)]) {
        await deny(S, { action: 'publish', body }, 'INVALID_INPUT');
        await deny(P, { action: 'editReply', id: reply, body }, 'INVALID_INPUT');
      }
      await deny(S, { action: 'publish', body: 'Hello', type: 'NOTICE' }, 'INVALID_INPUT');
      await deny(S, { action: 'publish', body: 'Hello', authorId: teacher }, 'INVALID_INPUT');
    });
    await t.test('only current authors edit; teacher may remove but never rewrite other authors', async () => {
      await deny(T, { action: 'editPost', id: query, body: 'Teacher rewrite' }, 'FORBIDDEN');
      await deny(S, { action: 'editReply', id: reply, body: 'Student rewrite' }, 'FORBIDDEN');
      await deny(P, { action: 'removePost', id: query, confirm: true }, 'FORBIDDEN');
      await change(S, { action: 'editPost', id: query, body: 'Edited query\nkept' });
      assert.ok((await service.listWall(T, room)).posts.find(p => p.id === query).editedAt);
      await deny(T, { action: 'removePost', id: query, confirm: false }, 'INVALID_INPUT');
      await change(T, { action: 'removeReply', id: reply, confirm: true });
      const removed = (await service.listWall(S, room)).posts.find(p => p.id === post).replies.find(r => r.id === reply);
      assert.equal(removed.body, null); assert.ok(removed.removedAt); assert.equal(removed.canEdit, false);
      await deny(P, { action: 'editReply', id: reply, body: 'Restored' }, 'CONFLICT');
    });
    await t.test('confirmed parent tombstones preserve others replies; no new replies or restoration of removed parents', async () => {
      await change(P, { action: 'reply', postId: query, body: 'Visible historical response' });
      const preserved = (await service.listWall(T, room)).posts.find(p => p.id === query).replies[0];
      await change(S, { action: 'removePost', id: query, confirm: true });
      const removed = (await service.listWall(T, room)).posts.find(p => p.id === query);
      assert.equal(removed.body, null); assert.ok(removed.removedAt);
      assert.equal(removed.replies[0].body, 'Visible historical response');
      await deny(S, { action: 'editPost', id: query, body: 'Restore' }, 'CONFLICT');
      await deny(T, { action: 'reply', postId: query, body: 'New reply' }, 'CONFLICT');
      await change(P, { action: 'editReply', id: preserved.id, body: 'Correct historical response' });
      await change(T, { action: 'removeReply', id: preserved.id, confirm: true });
      assert.equal((await pool.query('SELECT removed_by_id,body FROM wall_replies WHERE id=$1', [preserved.id])).rows[0].removed_by_id, teacher);
    });
    await t.test('concurrent edits serialize and only one expected classroom revision wins', async () => {
      const revision = (await service.detail(T, room)).revision;
      const results = await Promise.allSettled(['Edit A', 'Edit B'].map(body => service.changeWall(T, room, { revision, operation: { action: 'editPost', id: post, body } })));
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
      assert.equal(results.find(r => r.status === 'rejected').reason.code, 'CONFLICT');
      await deny(T, { action: 'editPost', id: post, body: 'Stale edit' }, 'CONFLICT', revision);
    });
    await t.test('foreign, former, unverified and archived content mutations are denied and archive remains readable', async () => {
      for (const actor of [F, U]) {
        await deny(actor, { action: 'publish', body: 'Denied' }, 'FORBIDDEN');
        await assert.rejects(service.listWall(actor, room), { code: 'FORBIDDEN' });
      }
      await deny(T, { action: 'editPost', id: post, body: 'Other classroom' }, 'FORBIDDEN', '1', otherRoom);
      await pool.query(`UPDATE membership_periods SET ended_at=now(),end_reason='REMOVED',ended_by_id=$2
        WHERE enrollment_id IN(SELECT id FROM enrollments WHERE student_id=$1) AND ended_at IS NULL`, [peer, teacher]);
      await deny(P, { action: 'publish', body: 'Former' }, 'FORBIDDEN');
      await assert.rejects(service.listWall(P, room), { code: 'FORBIDDEN' });
      await service.setArchive(T, room, { archived: true, revision: (await service.detail(T, room)).revision });
      await deny(T, { action: 'publish', body: 'Archived' }, 'CONFLICT');
      await deny(S, { action: 'reply', postId: post, body: 'Archived reply' }, 'CONFLICT');
      assert.equal((await service.listWall(S, room)).posts.length, 2);
      assert.equal((await service.listWall(T, room)).posts.every(p => !p.canEdit && !p.canRemove && p.replies.every(r => !r.canEdit && !r.canRemove)), true);
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM attempts')).rows[0].n, 0);
    });
  });
});
