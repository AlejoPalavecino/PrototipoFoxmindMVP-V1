import test from 'node:test';
import assert from 'node:assert/strict';
import { classroom, openClassroom } from './p6-integration-helpers.mjs';
import { waitForAttemptClock } from './helpers/attempt-clock.mjs';
import { account } from './p4-integration-helpers.mjs';
import { withJourney, ok, request, rootOf, detail, createActivity, startPublic, session, editorHeaders,
  inviteExplicitly, rejectUnchanged, academicHash } from './p9-journey-helpers-current.mjs';

test('P9 joined membership: peer/foreign roles, stale editor/session, removal/reentry, historical grades and current metrics', { timeout: 330000 }, async () => {
  await withJourney('membership', async world => {
    const { runtime, T, S, P, room } = world, root = rootOf(room);
    await inviteExplicitly(world, P);
    const foreignTeacher = await (await world.browser.newContext()).newPage();
    foreignTeacher.on('pageerror', error => world.errors.push(error.message));
    await account(foreignTeacher, runtime.origin, runtime.inbox, `p9-foreign-teacher-${Date.now()}@example.test`, undefined, 'teacher');
    const foreign = await classroom(foreignTeacher, S.page, 'P9 foreign classroom'), foreignRoot = rootOf(foreign);
    assert.equal((await ok(S.page, 'GET', foreignRoot)).role, 'student');
    await rejectUnchanged(runtime.db, async () => request(T.page, 'POST', `${foreignRoot}/activities`,
      { revision: (await ok(foreignTeacher, 'GET', foreignRoot)).revision, operation: { action: 'create', type: 'ASSIGNMENT' } }), 403);
    await rejectUnchanged(runtime.db, async () => request(S.page, 'POST', `${foreignRoot}/activities`,
      { revision: (await ok(foreignTeacher, 'GET', foreignRoot)).revision, operation: { action: 'create', type: 'ASSIGNMENT' } }), 403);
    const activity = await createActivity(world, 'ASSIGNMENT');
    const attempts = [];
    for (const [actor, grade] of [[S, '8'], [P, '6']]) {
      const state = await startPublic(world, activity, actor.page), path = `${root}/attempts/${state.attempt.id}`;
      await waitForAttemptClock(state.attempt.openedAt);
      assert.ok(Date.now() >= Date.parse(state.attempt.openedAt), 'receipt clock has reached the confirmed opening');
      await ok(actor.page, 'POST', `${path}/submit-practical`, { revision: state.attempt.revision, confirm: true }, editorHeaders(state.editor));
      const saved = await ok(T.page, 'POST', `${path}/grading`, { revision: (await detail(T.page, room)).revision,
        overallGrade: grade, overallFeedback: `Preserved ${grade} feedback`, questions: [] });
      assert.deepEqual(await ok(actor.page, 'GET', `${path}/result`), { status: 'pending', attemptId: state.attempt.id });
      await ok(T.page, 'POST', `${path}/publish-grade`, { revision: saved.revision, confirm: true });
      attempts.push(state.attempt.id);
    }
    const progress = () => ok(T.page, 'GET', `${root}/progress`);
    const initial = await progress(); assert.equal(initial.studentCount, 2); assert.equal(initial.performance.average, '7.00');
    const peerEvent = (await ok(P.page, 'GET', '/classrooms/notifications')).find(row => row.classroomId === room.id && row.eventType === 'GRADE_PUBLISHED');
    assert.ok(peerEvent, 'Capture an actually authorized current-member grade event before removal');
    await rejectUnchanged(runtime.db, () => request(P.page, 'GET', `${root}/attempts/${attempts[0]}/result`), 403);
    await rejectUnchanged(runtime.db, () => request(S.page, 'GET', `${root}/members/${P.user.id}/progress`), 403);
    // A new real draft retains the old effective8; edit authority is explicitly transferred twice.
    await ok(T.page, 'POST', `${root}/activities/${activity.id}/reopen`, {
      revision: (await detail(T.page, room)).revision, studentId: S.user.id, deadline: null, confirm: true });
    const reopened = await session(world, activity), path = `${root}/attempts/${reopened.attempt.id}`;
    assert.equal(reopened.attempt.number, 2); assert.equal(reopened.attempt.status, 'DRAFT');
    const oldEditor = await ok(S.page, 'POST', `${path}/transfer`, { revision: reopened.attempt.revision });
    const device = await S.page.context().newPage(); device.setDefaultTimeout(12000); await device.goto(`${runtime.origin}/profile`);
    const second = await ok(device, 'POST', `${path}/transfer`, { revision: oldEditor.attempt.revision });
    assert.ok(BigInt(second.editor.epoch) > BigInt(oldEditor.editor.epoch));
    await rejectUnchanged(runtime.db, () => request(S.page, 'POST', `${path}/submit-practical`,
      { revision: second.attempt.revision, confirm: true }, editorHeaders(oldEditor.editor)), 403);
    assert.equal((await progress()).performance.average, '7.00');
    const gradeRows = await runtime.db.query('SELECT id,final_grade::text,is_published FROM attempt_grades ORDER BY id');
    await ok(T.page, 'POST', `${root}/members/${P.user.id}/remove`, {});
    const removed = await progress(); assert.equal(removed.studentCount, 1); assert.equal(removed.performance.average, '8.00');
    const history = await ok(T.page, 'GET', `${root}/members/${P.user.id}/progress`);
    assert.equal(history.currentMember, false); assert.equal(history.performance.average, '6.00');
    await rejectUnchanged(runtime.db, () => request(P.page, 'GET', `${root}/attempts/${attempts[1]}/result`), 403);
    await rejectUnchanged(runtime.db, () => request(P.page, 'POST', '/classrooms/codes/preview', { code: room.code }), 409);
    await rejectUnchanged(runtime.db, () => request(P.page, 'POST', `/classrooms/notifications/${peerEvent.id}/open`, {}), 403);
    await inviteExplicitly(world, P);
    assert.equal((await progress()).performance.average, '7.00');
    assert.equal((await progress()).studentCount, 2);
    assert.deepEqual(await runtime.db.query('SELECT id,final_grade::text,is_published FROM attempt_grades ORDER BY id').then(r => r.rows), gradeRows.rows);
    assert.equal((await runtime.db.query('SELECT count(*)::int n FROM enrollments WHERE classroom_id=$1', [room.id])).rows[0].n, 2);
    assert.equal((await runtime.db.query('SELECT count(*)::int n FROM membership_periods m JOIN enrollments e ON e.id=m.enrollment_id WHERE e.classroom_id=$1', [room.id])).rows[0].n, 3);
    const grade = await ok(P.page, 'GET', `${root}/attempts/${attempts[1]}/result`);
    assert.equal(grade.grade.finalGrade, '6.00'); assert.equal(grade.grade.isEffective, true);
    await ok(T.page, 'POST', `${root}/archive`, { revision: (await detail(T.page, room)).revision, archived: true });
    await rejectUnchanged(runtime.db, () => request(device, 'POST', `${path}/submit-practical`,
      { revision: second.attempt.revision, confirm: true }, editorHeaders(second.editor)), 409);
    await rejectUnchanged(runtime.db, async () => request(T.page, 'POST', `${root}/activities`, {
      revision: (await detail(T.page, room)).revision, operation: { action: 'create', type: 'ASSIGNMENT' } }), 409);
    assert.equal((await ok(P.page, 'GET', `${root}/attempts/${attempts[1]}/result`)).grade.finalGrade, '6.00');
    await ok(T.page, 'POST', `${root}/archive`, { revision: (await detail(T.page, room)).revision, archived: false });
    assert.equal((await session(world, activity)).activity.locked, true);
    const persisted = await academicHash(runtime.db); await runtime.restartData(); assert.equal(await academicHash(runtime.db), persisted);
    assert.equal((await progress()).performance.average, '7.00');
    await openClassroom(T.page, runtime.origin, 'P9 membership classroom');
    await T.page.getByRole('button', { name: 'Progreso', exact: true }).click();
    const aggregate = T.page.getByRole('region', { name: 'Rendimiento académico', exact: true });
    await aggregate.getByRole('heading', { name: 'Rendimiento académico', exact: true }).waitFor();
    assert.match(await aggregate.locator('strong').innerText(), /^7\s*\/\s*10$/, 'Current classroom average remains exactly seven of ten');
    const cookie = (await device.context().cookies()).map(c => `${c.name}=${c.value}`).join('; ');
    assert.equal((await request(device, 'POST', '/auth/logout', {})).status, 204);
    const beforeRevoked = await academicHash(runtime.db);
    const revoked = await fetch(`${runtime.origin}/api/v1${root}/progress`, { headers: { cookie } });
    assert.equal(revoked.status, 401); await revoked.arrayBuffer();
    assert.equal(await academicHash(runtime.db), beforeRevoked);
    console.log('P9 membership: exactrejectionhashes/staleeditor/session/current7-8-7/history6/reentry/archive/restart PASS');
  }, { peer: true });
});
