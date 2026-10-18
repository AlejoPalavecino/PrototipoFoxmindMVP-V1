import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withP5Database } from '../scripts/p5-database.mjs';
import { FileStore } from '../.build/api/apps/api/src/files/store.js';
import { ClassroomService } from '../.build/api/apps/api/src/classrooms/service.js';

test('P6 personal notifications are transactionally delivered and never restore access', { timeout: 120000 }, async t => {
  await withP5Database(async ({ pool, database }) => {
    const teacher = randomUUID(), student = randomUUID(), peer = randomUUID(), former = randomUUID(), outsider = randomUUID(), room = randomUUID(), second = randomUUID();
    for (const id of [teacher, student, peer, former, outsider]) await pool.query(`INSERT INTO users
      (id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at)
      VALUES($1,now(),$2,$2,'Notification','Fixture','fixture',now())`, [id, `${id}@example.test`]);
    for (const [id, owner] of [[room, teacher], [second, student]]) await pool.query(`INSERT INTO classrooms
      (id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
      VALUES($1,now(),$2,'Notification room','Subject','A',2026,'UTC','explore',100000000)`, [id, owner]);
    const enroll = async (classroom, user, ended = false) => {
      const id = randomUUID();
      await pool.query('INSERT INTO enrollments(id,updated_at,classroom_id,student_id) VALUES($1,now(),$2,$3)', [id, classroom, user]);
      await pool.query(`INSERT INTO membership_periods(id,updated_at,enrollment_id,classroom_id,entry_method,ended_at,end_reason,ended_by_id)
        VALUES($1,now(),$2,$3,'CODE',CASE WHEN $4 THEN clock_timestamp() ELSE NULL END,$5,$6)`, [randomUUID(), id, classroom, ended, ended ? 'REMOVED' : null, ended ? teacher : null]);
    };
    for (const user of [student, peer, former]) await enroll(room, user, user === former);
    await enroll(second, teacher);
    const authenticate = async (_tx, req) => req.actor;
    const files = new FileStore(database, { authenticate, authorize: async () => {} }, 100000000n);
    const service = new ClassroomService({ database, files, authenticate, signingKey: Buffer.alloc(32, 1), deliveryKey: Buffer.alloc(32, 2), classroomQuotaBytes: 100000000n, webOrigin: 'http://127.0.0.1:3005' });
    const T = { actor: teacher }, S = { actor: student }, P = { actor: peer }, O = { actor: outsider };
    const change = async (actor, classroom, operation) => service.changeWall(actor, classroom, { revision: (await service.detail(actor, classroom)).revision, operation });
    const snapshot = async () => JSON.stringify((await pool.query(`SELECT
      (SELECT jsonb_agg(to_jsonb(n) ORDER BY id) FROM notifications n) AS notifications,
      (SELECT jsonb_agg(to_jsonb(p) ORDER BY id) FROM wall_posts p) AS posts,
      (SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM wall_replies r) AS replies,
      (SELECT jsonb_agg(to_jsonb(c) ORDER BY id) FROM classrooms c) AS classrooms,
      (SELECT jsonb_agg(to_jsonb(a) ORDER BY id) FROM account_action_controls a) AS controls`)).rows);
    const rejected = async (work, code = 'FORBIDDEN') => {
      const before = await snapshot(); await assert.rejects(work(), { code }); assert.equal(await snapshot(), before);
    };
    let notice, query, replyId, notification;
    await t.test('notice targets only current students, query only teacher, never self; roles vary per classroom', async () => {
      assert.deepEqual(await service.listNotifications(T), []);
      await change(T, room, { action: 'publish', body: 'Teacher notice' });
      notice = (await service.listWall(T, room)).posts[0].id;
      const rows = (await pool.query('SELECT recipient_id,event_type FROM notifications WHERE post_id=$1', [notice])).rows;
      assert.deepEqual(rows.map(r => r.recipient_id).sort(), [student, peer].sort());
      assert.equal(rows.every(r => r.event_type === 'WALL_NOTICE'), true);
      await change(S, room, { action: 'publish', body: 'Student query' });
      query = (await service.listWall(T, room)).posts[0].id;
      assert.deepEqual((await pool.query('SELECT recipient_id,event_type FROM notifications WHERE post_id=$1', [query])).rows, [{ recipient_id: teacher, event_type: 'WALL_QUERY' }]);
      await change(S, second, { action: 'publish', body: 'Teacher here' });
      assert.equal((await service.listNotifications(T)).some(n => n.classroomId === second && n.eventType === 'WALL_NOTICE'), true);
      assert.equal((await service.listNotifications(S)).some(n => n.classroomId === room && n.eventType === 'WALL_NOTICE'), true);
      assert.deepEqual(await service.listNotifications(O), []);
    });
    await t.test('reply targets parent publication author, not all participants; self replies have no event', async () => {
      await change(T, room, { action: 'reply', postId: query, body: 'Answer' });
      replyId = (await service.listWall(T, room)).posts.find(p => p.id === query).replies[0].id;
      assert.deepEqual((await pool.query('SELECT recipient_id,event_type FROM notifications WHERE reply_id=$1', [replyId])).rows, [{ recipient_id: student, event_type: 'WALL_REPLY' }]);
      const count = (await pool.query('SELECT count(*)::int AS n FROM notifications')).rows[0].n;
      await change(S, room, { action: 'reply', postId: query, body: 'Own clarification' });
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM notifications')).rows[0].n, count);
      await change(P, room, { action: 'reply', postId: notice, body: 'Teacher receives this' });
      assert.equal((await service.listNotifications(P)).some(n => n.eventType === 'WALL_REPLY'), false);
    });
    await t.test('creation and notification delivery are atomic; stale replay cannot duplicate events', async () => {
      const revision = (await service.detail(T, room)).revision;
      await change(T, room, { action: 'editPost', id: notice, body: 'Edited notice, no new event' });
      await rejected(() => service.changeWall(T, room, { revision, operation: { action: 'reply', postId: notice, body: 'Stale reply' } }), 'CONFLICT');
      assert.equal((await pool.query(`SELECT count(*)::int AS n FROM
        (SELECT recipient_id,event_type,post_id,reply_id FROM notifications GROUP BY 1,2,3,4 HAVING count(*)>1) d`)).rows[0].n, 0);
      // Deliberate owned-database failure proves the public service rolls back the content and revision too.
      await pool.query(`CREATE FUNCTION reject_wall_notification() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'owned fixture'; END $$;
        CREATE TRIGGER reject_wall_notification BEFORE INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION reject_wall_notification()`);
      try { await rejected(() => change(T, room, { action: 'publish', body: 'Must roll back' }), 'SERVICE_UNAVAILABLE'); }
      finally { await pool.query('DROP TRIGGER reject_wall_notification ON notifications; DROP FUNCTION reject_wall_notification()'); }
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM background_jobs')).rows[0].n, 0);
    });
    await t.test('personal newest first center supports idempotent read and actual scoped thread open', async () => {
      const list = await service.listNotifications(S);
      assert.equal(list.length, 2);
      assert.equal(list[0].eventType, 'WALL_REPLY');
      notification = list[0].id;
      assert.equal(list[0].readAt, null);
      assert.doesNotMatch(JSON.stringify(list), /email|recipientId|recipient_id|body|password/i);
      const beforeRevision = (await service.detail(T, room)).revision;
      const opened = await service.openNotification(S, notification);
      assert.deepEqual(opened, { classroomId: room, postId: query, replyId });
      assert.ok((await service.listNotifications(S))[0].readAt);
      const firstRead = (await pool.query('SELECT read_at FROM notifications WHERE id=$1', [notification])).rows[0].read_at.toISOString();
      await service.readNotification(S, notification);
      assert.equal((await pool.query('SELECT read_at FROM notifications WHERE id=$1', [notification])).rows[0].read_at.toISOString(), firstRead);
      assert.equal((await service.detail(T, room)).revision, beforeRevision);
      await rejected(() => service.readNotification(P, notification));
      await rejected(() => service.openNotification(O, notification));
      await rejected(() => service.openNotification(S, randomUUID()));
    });
    await t.test('removed targets open only visible history; archived content stays readonly while personal read is allowed', async () => {
      await change(T, room, { action: 'removeReply', id: replyId, confirm: true });
      await change(S, room, { action: 'removePost', id: query, confirm: true });
      assert.equal((await service.openNotification(S, notification)).postId, query);
      await service.setArchive(T, room, { revision: (await service.detail(T, room)).revision, archived: true });
      const revision = (await service.detail(T, room)).revision;
      const unread = (await service.listNotifications(S)).find(n => !n.readAt);
      await service.readNotification(S, unread.id);
      assert.equal((await service.openNotification(S, unread.id)).classroomId, room);
      assert.equal((await service.detail(T, room)).revision, revision);
    });
    await t.test('former membership and unverified identity revoke list/read/open with no data mutation', async () => {
      await pool.query(`UPDATE membership_periods SET ended_at=now(),end_reason='REMOVED',ended_by_id=$3
        WHERE enrollment_id IN(SELECT id FROM enrollments WHERE student_id=$1 AND classroom_id=$2)`, [student, room, teacher]);
      assert.deepEqual(await service.listNotifications(S), []);
      await rejected(() => service.readNotification(S, notification));
      await rejected(() => service.openNotification(S, notification));
      await pool.query('UPDATE users SET email_verified_at=NULL WHERE id=$1', [peer]);
      await rejected(() => service.listNotifications(P));
      const peerNotification = (await pool.query('SELECT id FROM notifications WHERE recipient_id=$1 LIMIT 1', [peer])).rows[0].id;
      await rejected(() => service.readNotification(P, peerNotification));
      await rejected(() => service.openNotification(P, peerNotification));
    });
  });
});
