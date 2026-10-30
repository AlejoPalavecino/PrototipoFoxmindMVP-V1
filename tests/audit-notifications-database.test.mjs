import test from 'node:test';
import assert from 'node:assert/strict';
import { withGradingFixture } from './p8-grading-helpers.mjs';
import { saveComplete, publish } from './p8-publication-helpers.mjs';
import { parseGradingView, parsePublishedGradeResult, parseGradeCorrectionsView } from '../src/core/domain/classroom-grading.ts';

test('notification pages retain all three families, total unread and actor/filter access across revocation', { timeout: 120000 }, async () => {
  await withGradingFixture(async f => {
    const activity = await f.create('ASSIGNMENT');
    const draft = await f.service.getAttemptGrading(f.T, f.room, activity.attempt);
    assert.doesNotThrow(() => parseGradingView(JSON.parse(JSON.stringify(draft))));
    const saved = await saveComplete(f, activity.attempt);
    await publish(f, activity.attempt, saved);
    const result = await f.service.getAttemptResult(f.S, f.room, activity.attempt);
    assert.doesNotThrow(() => parsePublishedGradeResult(JSON.parse(JSON.stringify(result))));
    const corrections = await f.service.getGradeCorrections(f.T, f.room, activity.attempt);
    assert.doesNotThrow(() => parseGradeCorrectionsView(JSON.parse(JSON.stringify(corrections))));
    for (const [parser, payload] of [[parseGradingView, draft], [parsePublishedGradeResult, result], [parseGradeCorrectionsView, corrections]]) {
      const corrupt = JSON.parse(JSON.stringify(payload));
      if (parser === parseGradingView) corrupt.activity.questions = 'malformed';
      else if (parser === parsePublishedGradeResult) corrupt.questions = [null];
      else corrupt.corrections = [null];
      assert.throws(() => parser(corrupt), /INVALID_INPUT/);
    }
    await f.pool.query(`WITH posts AS (
      INSERT INTO wall_posts(id,updated_at,classroom_id,author_id,type,body,created_at)
      SELECT gen_random_uuid(),now(),$1::uuid,$2::uuid,'NOTICE','Synthetic notification',
        '2026-01-01T00:00:00Z'::timestamptz + ((n / 3) * interval '1 microsecond')
      FROM generate_series(1,65) n RETURNING id,created_at
    ) INSERT INTO notifications(id,updated_at,recipient_id,classroom_id,event_type,post_id,created_at)
      SELECT gen_random_uuid(),now(),$3::uuid,$1::uuid,'WALL_NOTICE',id,created_at FROM posts`, [f.room, f.teacher, f.student]);
    await f.pool.query(`UPDATE notifications SET read_at=now() WHERE id IN
      (SELECT id FROM notifications WHERE recipient_id=$1 AND event_type='WALL_NOTICE' ORDER BY id LIMIT 10)`, [f.student]);
    const expected = (await f.pool.query('SELECT id FROM notifications WHERE recipient_id=$1 ORDER BY created_at DESC,id ASC', [f.student])).rows.map(r => r.id);
    const unread = Number((await f.pool.query('SELECT count(*) AS n FROM notifications WHERE recipient_id=$1 AND read_at IS NULL', [f.student])).rows[0].n);
    const found = [], families = new Set(); let cursor, firstCursor;
    do {
      const page = await f.service.listNotificationPage(f.S, cursor ? { limit: 50, cursor } : { limit: 50 });
      assert.ok(page.items.length <= 50); assert.equal(page.unreadCount, unread);
      found.push(...page.items.map(item => item.id)); page.items.forEach(item => families.add(item.eventType));
      cursor = page.nextCursor; firstCursor ??= cursor;
      assert.ok(found.length <= expected.length);
    } while (cursor);
    assert.deepEqual(found, expected);
    for (const family of ['WALL_NOTICE', 'ACTIVITY_PUBLISHED', 'GRADE_PUBLISHED']) assert.ok(families.has(family), family);
    assert.ok(firstCursor);
    assert.equal((await f.service.listNotifications(f.S)).length, 50);
    await assert.rejects(() => f.service.listNotificationPage({ actor: f.peer, headers: {} }, { cursor: firstCursor }), { code: 'INVALID_INPUT' });
    await assert.rejects(() => f.service.listNotificationPage(f.S, { cursor: firstCursor, unread: true }), { code: 'INVALID_INPUT' });
    const filtered = await f.service.listNotificationPage(f.S, { unread: true, limit: 50 });
    assert.equal(filtered.unreadCount, unread); assert.ok(filtered.items.every(item => item.readAt === null));
    await f.pool.query(`UPDATE membership_periods SET ended_at=now(),end_reason='REMOVED',ended_by_id=$2,updated_at=now()
      WHERE enrollment_id IN (SELECT id FROM enrollments WHERE classroom_id=$1 AND student_id=$3)`, [f.room, f.teacher, f.student]);
    assert.deepEqual((await f.service.listNotificationPage(f.S, { cursor: firstCursor })).items, []);
    await assert.rejects(() => f.service.openNotification(f.S, found[0]), { code: 'FORBIDDEN' });
  });
});
