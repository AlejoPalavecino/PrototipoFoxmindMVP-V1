import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { chromium } from '@playwright/test';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';
import { account, api, digest } from './p4-integration-helpers.mjs';

async function membershipSnapshot(db, room) {
  const rows = [];
  for (const table of ['invitations', 'enrollments']) {
    rows.push((await db.query(`SELECT row_to_json(t)::text AS data FROM ${table} t WHERE classroom_id=$1 ORDER BY id`, [room])).rows);
  }
  rows.push((await db.query(`SELECT row_to_json(m)::text AS data FROM membership_periods m
    JOIN enrollments e ON e.id=m.enrollment_id WHERE e.classroom_id=$1 ORDER BY m.id`, [room])).rows);
  return digest(JSON.stringify(rows));
}

test('P5 invitations share actual P3 international and ASCII mailbox identity', { timeout: 180000 }, async t => {
  await withP4IntegrationRuntime(async runtime => {
    const browser = await chromium.launch({ headless: true });
    try {
      const teacherPage = await (await browser.newContext()).newPage();
      const teacher = await account(teacherPage, runtime.origin, runtime.inbox, `mailbox-teacher-${Date.now()}@example.test`, undefined, "teacher");
      const room = randomUUID();
      // Only classroom setup is SQL: every actor/session and invitation operation is public HTTP.
      await runtime.db.query(`INSERT INTO classrooms
        (id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
        VALUES($1,now(),$2,'Mailbox matching fixture','Subject','A',2026,'UTC','explore',100000000)`, [room, teacher.id]);

      for (const [name, email, equivalent] of [
        ['Greek final sigma', '\u03a3\u039f\u03a3@example.test', '\u03c3\u03bf\u03c3@example.test'],
        ['Dotted capital I', '\u0130rem@example.test', 'irem@example.test'],
        ['Existing ASCII matching', 'Ascii.Recipient@example.test', 'ascii.recipient@example.test'],
      ]) {
        await t.test(name, async () => {
          const page = await (await browser.newContext()).newPage();
          const recipient = await account(page, runtime.origin, runtime.inbox, email, undefined, "student");
          const user = (await runtime.db.query('SELECT email,email_normalized FROM users WHERE id=$1', [recipient.id])).rows[0];
          assert.equal(user.email, email);
          assert.equal(user.email_normalized, equivalent);
          const issued = await api(teacherPage, 'POST', `/classrooms/${room}/invitations`, { email });
          assert.equal(issued.status, 200);
          const pending = await api(page, 'GET', '/classrooms/invitations');
          assert.equal(pending.status, 200);
          assert.equal(pending.body.filter(item => item.id === issued.body.id).length, 1,
            'Actual verified P3 recipient must see the matching invitation');
          const stored = (await runtime.db.query('SELECT recipient_email_normalized FROM invitations WHERE id=$1', [issued.body.id])).rows[0];
          assert.equal(stored.recipient_email_normalized, user.email_normalized);
          const listed = await api(teacherPage, 'GET', `/classrooms/${room}/invitations`);
          assert.equal(listed.status, 200);
          assert.equal(listed.body.find(item => item.id === issued.body.id).recipient, email,
            'Original validated delivery spelling is retained');
          const before = await membershipSnapshot(runtime.db, room);
          const duplicate = await api(teacherPage, 'POST', `/classrooms/${room}/invitations`, { email: equivalent });
          assert.equal(duplicate.status, 409);
          assert.equal(duplicate.body.error.code, 'CONFLICT');
          assert.equal(await membershipSnapshot(runtime.db, room), before);
          assert.equal((await runtime.db.query('SELECT count(*)::int AS n FROM enrollments WHERE classroom_id=$1 AND student_id=$2', [room, recipient.id])).rows[0].n, 0,
            'Pending invitation never automatically enrolls');
          assert.equal((await api(page, 'POST', `/classrooms/invitations/${issued.body.id}/accept`, {})).status, 200);
          const activeBefore = await membershipSnapshot(runtime.db, room);
          assert.equal((await api(teacherPage, 'POST', `/classrooms/${room}/invitations`, { email: equivalent })).status, 409);
          assert.equal(await membershipSnapshot(runtime.db, room), activeBefore);
          assert.equal((await api(page, 'POST', `/classrooms/${room}/leave`, {})).status, 200);
          const reissued = await api(teacherPage, 'POST', `/classrooms/${room}/invitations`, { email: equivalent });
          assert.equal(reissued.status, 200);
          assert.notEqual(reissued.body.id, issued.body.id);
          assert.equal((await api(page, 'GET', '/classrooms/invitations')).body.some(item => item.id === reissued.body.id), true);
          assert.equal((await api(page, 'POST', `/classrooms/invitations/${reissued.body.id}/accept`, {})).status, 200);
          const history = (await runtime.db.query(`SELECT e.id,count(*)::int AS periods,
            count(*) FILTER (WHERE m.ended_at IS NULL)::int AS active
            FROM enrollments e JOIN membership_periods m ON m.enrollment_id=e.id
            WHERE e.classroom_id=$1 AND e.student_id=$2 GROUP BY e.id`, [room, recipient.id])).rows;
          assert.equal(history.length, 1);
          assert.equal(history[0].periods, 2);
          assert.equal(history[0].active, 1);
          await page.context().close();
        });
      }
    } finally { await browser.close(); }
  }, { classrooms: true });
});
