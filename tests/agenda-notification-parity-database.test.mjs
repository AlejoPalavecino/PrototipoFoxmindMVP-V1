import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from './agenda-database-helpers.test.mjs';
import { loadTsModule } from './helpers/load-ts-module.mjs';
const { privateHomeEvents } = loadTsModule('apps/api/src/modules/home/infrastructure/private-events.ts');
const { duePrivateAgendaNotices } = loadTsModule('apps/api/src/modules/agenda/infrastructure/due-notices.ts');
const { createPrivateEventRepository } = loadTsModule('apps/api/src/modules/agenda/infrastructure/event-repository.ts');
const { notificationPage, readAllVisibleNotifications } = loadTsModule('apps/api/src/modules/home/infrastructure/notification-page.ts');
const { setProjectedNotificationRead } = loadTsModule('apps/api/src/modules/home/infrastructure/notification-projections.ts');
import { notificationSelection } from '../apps/api/src/modules/communication/infrastructure/notification-selection.ts';

test('unified inbox applies type before pagination and guards reads, revocation, and ownership', { timeout: 90_000 }, async () => {
  await withAgendaDatabase(async ({ transaction }) => transaction(async ({ query }) => {
    const teacher = randomUUID(), student = randomUUID(), outsider = randomUUID();
    for (const [id, role] of [[teacher, 'teacher'], [student, 'student'], [outsider, 'student']])
      await query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
        VALUES($1,now(),$2,$2,'Prueba','FoxMind','fixture',now(),$3)`, id, `${id}@example.test`, role);
    const classroom = randomUUID(), invitation = randomUUID();
    await query(`INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
      VALUES($1,now(),$2,'Ciencias','Física','A',2026,'UTC','explore',100000000)`, classroom, teacher);
    await query(`INSERT INTO invitations(id,updated_at,classroom_id,recipient_email_normalized,invited_by_id,expires_at)
      VALUES($1,now(),$2,$3,$4,now()+interval '1 day')`, invitation, classroom, `${student}@example.test`, teacher);
    const events = createPrivateEventRepository({ query }, student);
    const one = randomUUID(), two = randomUUID();
    for (const [id, hour] of [[one, 2], [two, 3]]) {
      const begins = Date.now() + hour * 3_600_000;
      const iso = time => new Date(time).toISOString().slice(0,16);
      await events.create(id, { title: 'Evento privado', description: '', category: 'CLASS', repeat: { kind: 'NONE' },
        schedule: { kind: 'TIMED', timeZone: 'UTC', startLocal: iso(begins), endLocal: iso(begins + 3_600_000) },
        color: 'PURPLE', reminder: { minutes: 1440 } });
    }
    assert.equal((await events.get(one)).reminder.minutes, 1440);
    const home = await privateHomeEvents({ query }, { userId: student, now: new Date().toISOString() }, 'UTC');
    assert.equal(home.length, 2);
    assert.ok(home.every(({ item }) => item.color === 'PURPLE' && item.category === 'CLASS' &&
      Date.parse(item.endAt) - Date.parse(item.startAt) === 3_600_000));
    const tx = { query }, key = Buffer.alloc(32,1);
    const page = (actor, query) => notificationPage(tx, key, actor, notificationSelection, query, duePrivateAgendaNotices);
    const before = await page(student, { kind: 'agenda', limit: 1 });
    assert.equal(before.totalCount, 3);
    assert.equal(before.unreadCount, 3);
    assert.ok(before.nextCursor);
    assert.equal(before.items[0].eventType, 'AGENDA_REMINDER');
    assert.notEqual((await page(student, { kind: 'agenda', limit: 1, cursor: before.nextCursor })).items[0].id, before.items[0].id);
    await assert.rejects(() => page(student, { kind: 'classroom', cursor: before.nextCursor }), { code: 'INVALID_INPUT' });
    await assert.rejects(() => page(outsider, { kind: 'agenda', cursor: before.nextCursor }), { code: 'INVALID_INPUT' });
    assert.deepEqual((await page(outsider)).items, []);
    const invite = (await page(student, { kind: 'classroom' })).items[0];
    const mark = (actor, id, read) => setProjectedNotificationRead(tx, actor, id, read, duePrivateAgendaNotices);
    await assert.rejects(() => mark(outsider, before.items[0].id, true), { code: 'FORBIDDEN' });
    await assert.rejects(() => mark(outsider, invite.id, true), { code: 'FORBIDDEN' });
    assert.deepEqual(await mark(student, invite.id, true), { kind: 'invitation', invitationId: invitation });
    const firstRead = (await page(student, { kind: 'classroom' })).items[0].readAt;
    assert.ok(firstRead);
    await mark(student, invite.id, true);
    assert.equal((await page(student, { kind: 'classroom' })).items[0].readAt, firstRead);
    await mark(student, invite.id, false);
    await mark(student, invite.id, false);
    assert.equal((await page(student, { kind: 'classroom' })).items[0].readAt, null);
    const [{ accepted_at }] = await query('SELECT accepted_at FROM invitations WHERE id=$1', invitation);
    assert.equal(accepted_at, null);
    assert.equal((await readAllVisibleNotifications(tx, student, notificationSelection, duePrivateAgendaNotices)).updatedCount, 3);
    assert.equal((await readAllVisibleNotifications(tx, student, notificationSelection, duePrivateAgendaNotices)).updatedCount, 0);
    assert.equal((await page(student, { kind: 'agenda' })).unreadCount, 0);
    await query('UPDATE invitations SET revoked_at=now() WHERE id=$1', invitation);
    await assert.rejects(() => mark(student, invite.id, true), { code: 'FORBIDDEN' });
    assert.deepEqual((await page(student, { kind: 'classroom' })).items, []);
    const event = await events.get(one);
    await events.remove(one, event.revision);
    const eventNoticeId = `event-${one}-${event.schedule.startLocal.slice(0,10)}`;
    await assert.rejects(() => mark(student, eventNoticeId, true), { code: 'FORBIDDEN' });
    assert.equal((await page(student)).totalCount, 1);

    const enrollment = randomUUID(), period = randomUUID(), folder = randomUUID(), exam = randomUUID(), review = randomUUID();
    await query('INSERT INTO enrollments(id,updated_at,classroom_id,student_id) VALUES($1,now(),$2,$3)', enrollment, classroom, student);
    await query(`INSERT INTO membership_periods(id,updated_at,enrollment_id,classroom_id,entry_method)
      VALUES($1,now(),$2,$3,'CODE')`, period, enrollment, classroom);
    const joined = (await page(teacher, { kind: 'classroom' })).items[0];
    assert.equal(joined.eventType, 'CLASSROOM_JOINED');
    assert.deepEqual(await mark(teacher, joined.id, true), { kind: 'members', classroomId: classroom });
    await assert.rejects(() => mark(student, joined.id, true), { code: 'FORBIDDEN' });
    await query(`UPDATE membership_periods SET ended_at=now(),end_reason='REMOVED',ended_by_id=$2 WHERE id=$1`, period, teacher);
    await assert.rejects(() => mark(teacher, joined.id, true), { code: 'FORBIDDEN' });

    await query(`INSERT INTO study_folders(id,owner_id,status,state) VALUES($1,$2,'ACTIVE','{"version":1}')`, folder, student);
    await query(`INSERT INTO study_review_sessions(id,owner_id,folder_id,exam_id,agenda_event_id,event_revision,event_snapshot,starts_at,ends_at,notified_at)
      VALUES($1,$2,$3,$4,$5,0,'{}',now(),now()+interval '1 hour',now())`, review, student, folder, exam, two);
    assert.deepEqual((await events.get(two)).reviewSession, { folderId: folder, examId: exam });
    const reviewNotice = (await page(student, { kind: 'agenda' })).items.find(item => item.eventType === 'STUDY_REVIEW_REMINDER');
    assert.ok(reviewNotice);
    assert.deepEqual(await mark(student, reviewNotice.id, true), { kind: 'study', folderId: folder, examId: exam });
    assert.equal((await page(student)).unreadCount, 0);
    await mark(student, reviewNotice.id, false);
    assert.equal((await page(student)).unreadCount, 1);
    await readAllVisibleNotifications(tx, student, notificationSelection, duePrivateAgendaNotices);
    assert.equal((await page(student)).unreadCount, 0);
    await query("UPDATE study_folders SET status='ARCHIVED' WHERE id=$1", folder);
    assert.equal((await events.get(two)).reviewSession, undefined);
    await assert.rejects(() => mark(student, reviewNotice.id, true), { code: 'FORBIDDEN' });

  }));
});
