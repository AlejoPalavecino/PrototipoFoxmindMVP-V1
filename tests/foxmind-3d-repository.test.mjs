import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from './agenda-database-helpers.test.mjs';
import { homeFixture } from './foxmind-3d-repository-fixture.test.mjs';

const zone = { timeZone: 'UTC' };
const rows = (value, name) => {
  assert.equal(value.modules[name].status, 'ready', `${name} must be genuinely ready`);
  return value.modules[name].items;
};
const ids = values => values.map(value => value.target.activityId);
const readFactory = (api, database, f) => {
  const authentications = [];
  const authenticate = async (_tx, request, write) => { authentications.push(write); return request.userId; };
  const service = api.createHomeService(api.createHomeUnitOfWork(database, authenticate));
  return { service, authentications, read: (userId = f.actor) => service.read({ userId }, zone),
    page: (module, cursor = null, userId = f.actor, timeZone = 'UTC') => service.page({ userId }, { module, cursor, timeZone }) };
};

test('D9 real PostgreSQL Home projections preserve permission, exact counts, private state and rollback', { timeout: 120000 }, async t => {
  const api = await import('../apps/api/src/home/index.ts');
  assert.equal(typeof api.createHomeService, 'function'); assert.equal(typeof api.createHomeUnitOfWork, 'function');
  await withAgendaDatabase(async ({ pool, transaction }) => {
    assert.match((await pool.query('SELECT current_database() name')).rows[0].name, /_test$/);
    const check = (name, operation) => t.test(name, () => transaction(async local => {
      const f = await homeFixture(local.query); await operation(f, readFactory(api, local.database, f), local);
    }));
    await check('separate accounts have exact active membership/setup counts and archived history', async (f, home) => {
      const result = await home.read();
      assert.equal(result.subjectId, f.actor); assert.equal(result.participation, 'study');
      assert.deepEqual(result.memberships, { study: 1, teach: 0, archived: 0 });
      assert.deepEqual(result.setup, { drafts: 0, invitations: 1 });
      assert.deepEqual(new Set(rows(result, 'classrooms').map(x => x.classroom.id)), new Set([f.rooms.study.id]));
      const teacher = await home.read(f.teacherActor);
      assert.equal(teacher.participation, 'teach');
      assert.deepEqual(teacher.memberships, { study: 0, teach: 1, archived: 1 });
      assert.deepEqual(teacher.setup, { drafts: 1, invitations: 0 });
      assert.deepEqual(new Set(rows(teacher, 'classrooms').map(x => x.classroom.id)), new Set([f.rooms.teach.id, f.rooms.archived.id]));
      assert.ok(home.authentications.length >= 1); assert.ok(home.authentications.every(value => value === false));
    });
    await check('published expected obligations only; submitted, nonexpected, foreign, draft and archived stay out', async (f, home) => {
      const wanted = await f.activity();
      await f.activity('study', { expected: false }); await f.activity('study', { status: 'DRAFT' });
      await f.activity('foreign'); await f.activity('archived');
      await f.attempt(await f.activity());
      const before = await f.query('SELECT count(*)::int n FROM attempts');
      const result = await home.read();
      assert.deepEqual(ids(rows(result, 'pending')), [wanted.id]); assert.equal(result.modules.pending.totalItems, 1);
      assert.deepEqual(await f.query('SELECT count(*)::int n FROM attempts'), before, 'Reading never opens a draft attempt');
      assert.equal(rows(result, 'pending')[0].state, 'first-submission');
    });
    await check('effective extensions, closed overdue obligations and explicit resubmission use current server time', async (f, home) => {
      const overdue = await f.activity('study', { deadline: f.at(-1) });
      const extended = await f.activity('study', { deadline: f.at(-1), firstDeadline: f.at(2) });
      const reopened = await f.activity('study', { deadline: f.at(1) }); await f.attempt(reopened);
      const draft = await f.attempt(reopened, { number: 2, submitted: false, individualDeadline: f.at(3) });
      const noDate = await f.activity('study', { deadline: null });
      const result = await home.read(), pending = rows(result, 'pending');
      assert.deepEqual(ids(pending), [overdue.id, extended.id, reopened.id, noDate.id]);
      assert.equal(pending[0].late, true); assert.equal(pending[0].reception, 'closed');
      assert.equal(pending[1].deadlineAt, f.at(2)); assert.equal(pending[1].late, false);
      assert.equal(pending[2].state, 'resubmission'); assert.equal(pending[2].attemptId, draft); assert.equal(pending[2].deadlineAt, f.at(3));
      assert.equal(pending[3].deadlineAt, null);
    });
    await check('queue pages cap at five while count stays exact; cursor binds actor/module/timezone', async (f, home) => {
      const expected = [];
      for (let n = 0; n < 7; n++) expected.push((await f.activity('study', { deadline: f.at(n + 1) })).id);
      const first = await home.page('pending');
      assert.equal(first.page.status, 'ready'); assert.equal(first.page.items.length, 5); assert.equal(first.page.totalItems, 7);
      assert.equal(typeof first.page.nextCursor, 'string'); assert.ok(first.page.nextCursor.length <= 2048);
      const second = await home.page('pending', first.page.nextCursor);
      assert.equal(second.page.items.length, 2); assert.equal(second.page.nextCursor, null);
      assert.deepEqual(ids([...first.page.items, ...second.page.items]), expected);
      const denied = error => ['INVALID_INPUT', 'FORBIDDEN'].includes(error.code);
      await assert.rejects(home.page('pending', first.page.nextCursor, f.outsider), denied);
      await assert.rejects(home.page('review', first.page.nextCursor), denied);
      await assert.rejects(home.page('pending', first.page.nextCursor, f.actor, 'America/Argentina/Buenos_Aires'), denied);
      await assert.rejects(home.page('pending', `${first.page.nextCursor}x`), denied);
    });
    await check('teacher review lists individual unpublished attempts, including former students and complete private zero', async (f, home) => {
      const a = await f.activity('teach'), old = await f.attempt(a), current = await f.attempt(a, { number: 2 });
      await f.grade(a, current, { value: '0' });
      const published = await f.activity('teach'), done = await f.attempt(published); await f.grade(published, done, { published: true });
      await f.query("UPDATE membership_periods SET ended_at=now(),end_reason='LEFT',ended_by_id=$2 WHERE id=$1", f.rooms.teach.period, f.pupil);
      const result = await home.read(f.teacherActor), review = rows(result, 'review');
      assert.equal(review.length, 2); assert.ok(review.every(row => row.target.activityId === a.id && row.target.filter === 'unpublished'));
      assert.deepEqual(new Set(review.map(row => row.target.attemptId)), new Set([old,current]));
      assert.equal(review.reduce((sum,row)=>sum+row.needsReview,0), 1); assert.equal(review.reduce((sum,row)=>sum+row.readyToPublish,0), 1);
      assert.equal(result.modules.review.totalItems, 2);
      assert.deepEqual(result.modules.review.totals, { attempts: 2, needsReview: 1, readyToPublish: 1 });
      assert.ok(old);
    });
    await check('saved grade zero requires every question row and nonnull earned points before ready-to-publish', async (f, home) => {
      const a = await f.activity('teach'), attempt = await f.attempt(a), grade = await f.grade(a, attempt, { value: '0' });
      await f.query("UPDATE activities SET type='QUESTIONNAIRE' WHERE id=$1", a.id);
      const questions = [randomUUID(), randomUUID()];
      for (const [position, question] of questions.entries()) await f.query(`INSERT INTO questions
        (id,updated_at,activity_id,type,prompt,position,available_points)
        VALUES($1,now(),$2,'DEVELOPMENT','Pregunta sintética',$3,5)`, question, a.id, position);
      const counts = async () => { const value = (await home.page('review', null, f.teacherActor)).page; assert.equal(value.status, 'ready'); return value.totals; };
      assert.deepEqual(await counts(), { attempts: 1, needsReview: 1, readyToPublish: 0 });
      for (const [index, question] of questions.entries()) {
        await f.query(`INSERT INTO question_grades(id,updated_at,attempt_grade_id,activity_id,question_id,earned_numerator,earned_denominator)
          VALUES($1,now(),$2,$3,$4,0,1)`, randomUUID(), grade, a.id, question);
        assert.deepEqual(await counts(), { attempts: 1, needsReview: index === 0 ? 1 : 0, readyToPublish: index === 0 ? 0 : 1 });
      }
      await f.query('UPDATE question_grades SET earned_numerator=NULL,earned_denominator=NULL WHERE question_id=$1', questions[1]);
      assert.deepEqual(await counts(), { attempts: 1, needsReview: 1, readyToPublish: 0 });
    });
    await check('deadline equality is late/closed and general extension takes the maximum over individual deadline', async (f, home, local) => {
      const equality = await f.activity(), extended = await f.activity('study', { deadline: f.at(5), firstDeadline: f.at(2) });
      await f.attempt(extended); await f.attempt(extended, { number: 2, submitted: false, individualDeadline: f.at(3) });
      const uow = api.createHomeUnitOfWork(local.database, async () => f.actor);
      const page = await uow.run({}, false, async unit => {
        await unit.read.participation();
        await f.query('UPDATE activities SET deadline_at=$2 WHERE id=$1', equality.id, unit.actor.now);
        return unit.read.page('pending', { module: 'pending', timeZone: 'UTC', cursor: null });
      });
      assert.equal(page.status, 'ready');
      const exact = page.items.find(item => item.target.activityId === equality.id);
      assert.equal(exact.late, true); assert.equal(exact.reception, 'closed');
      const result = await home.page('pending');
      assert.equal(result.page.items.find(item => item.target.activityId === extended.id).deadlineAt, f.at(5));
    });
    await check('student sees only effective published feedback; reentry draft never hides it or leaks private grading', async (f, home) => {
      const a = await f.activity(), first = await f.attempt(a), effective = await f.grade(a, first, { published: true, effective: true });
      const second = await f.attempt(a, { number: 2 }), superseded = await f.grade(a, second, { published: true, value: '9' });
      await f.attempt(a, { number: 3, submitted: false, individualDeadline: f.at(4) });
      const privateActivity = await f.activity(), privateGrade = await f.grade(privateActivity, await f.attempt(privateActivity), { value: '10' });
      for (const [id, text] of [[effective, 'PUBLICADO_EFECTIVO'], [superseded, 'PUBLICADO_NO_EFECTIVO'], [privateGrade, 'PRIVADO_SIN_PUBLICAR']])
        await f.query('UPDATE attempt_grades SET overall_feedback=$2 WHERE id=$1', id, text);
      const result = await home.read(), feedback = rows(result, 'feedback');
      assert.equal(feedback.length, 1); assert.equal(feedback[0].target.gradeId, effective);
      assert.equal(feedback[0].attemptNumber, 1); assert.equal(Number(feedback[0].finalGrade), 0);
      assert.equal(feedback[0].availability, 'available');
      assert.equal(feedback[0].overallFeedback, 'PUBLICADO_EFECTIVO');
      assert.doesNotMatch(JSON.stringify(result), /PUBLICADO_NO_EFECTIVO|PRIVADO_SIN_PUBLICAR|correctAnswers|editorToken|studentId|password_hash/);
      assert.ok(ids(rows(result, 'pending')).includes(a.id));
    });
    await check('queries exclude notices/removed/foreign; materials require authorized clean intact files', async (f, home) => {
      const query = await f.post(), material = await f.material();
      await f.post('teach', { type: 'NOTICE' }); await f.post('teach', { removed: true }); await f.post('foreign');
      await f.material('foreign'); await f.material('study', { clean: false });
      const result = await home.read();
      assert.deepEqual(rows(await home.read(f.teacherActor), 'queries').map(x => x.target.postId), [query]);
      assert.deepEqual(rows(result, 'materials').map(x => x.target.materialId), [material]);
      assert.equal((await home.read(f.teacherActor)).modules.queries.totalItems, 1); assert.equal(result.modules.materials.totalItems, null);
      assert.doesNotMatch(JSON.stringify(result), /storageKey|synthetic-home\/|Descripción privada/);
    });
    await check('a real SQL error rolls back its widget savepoint and later modules remain readable', async (f, _home, local) => {
      await f.activity(); await f.post(); const material = await f.material(); let injected = false;
      const database = { $transaction: (operation, options) => local.database.$transaction(tx => operation({
        $queryRawUnsafe: async (sql, ...values) => {
          if (!injected && /\bwall_posts\b/i.test(sql)) {
            injected = true; return tx.$queryRawUnsafe('SELECT * FROM foxmind_synthetic_missing_table');
          }
          return tx.$queryRawUnsafe(sql, ...values);
        },
      }), options) };
      const result = await readFactory(api, database, f).read(f.teacherActor);
      assert.equal(injected, true, 'A real PostgreSQL error must be injected in the query widget');
      assert.deepEqual(result.modules.queries, { status: 'error', code: 'SERVICE_UNAVAILABLE', retryable: true });
      const studentResult = await readFactory(api, local.database, f).read();
      assert.equal(rows(studentResult, 'pending').length, 1);
      assert.deepEqual(rows(studentResult, 'materials').map(x => x.target.materialId), [material]);
      assert.ok(rows(result, 'classrooms').length > 0, 'Transaction remains usable after the failed widget');
    });
    await check('miniagenda merges three future private/academic starts, excluding past, foreign, today all-day and beyond90d', async (f, home) => {
      const personal = await f.event({ days: 1 }), academic = await f.activity('study', { deadline: f.at(2) });
      const third = await f.event({ days: 3 }); await f.event({ days: 4 });
      await f.event({ days: -1 }); await f.event({ days: 0, allDay: true });
      await f.event({ days: 0.5, owner: f.other }); await f.event({ days: 91 });
      const result = await home.read(), agenda = rows(result, 'agenda');
      assert.equal(agenda.length, 3); assert.deepEqual(agenda.map(x => x.source), ['PRIVATE_EVENT', 'ACADEMIC_DEADLINE', 'PRIVATE_EVENT']);
      assert.equal(agenda[0].target.eventId, personal); assert.equal(agenda[1].target.activityId, academic.id); assert.equal(agenda[2].target.eventId, third);
      assert.equal(result.modules.agenda.totalItems, null);
      assert.ok(agenda.every(x => Date.parse(x.startAt) > Date.parse(result.generatedAt)));
    });
    await check('ending membership immediately revokes studied rows and only archived memberships never imply participation', async (f, home) => {
      await f.activity(); await f.material();
      await f.query("UPDATE membership_periods SET ended_at=now(),end_reason='LEFT',ended_by_id=$2 WHERE id=$1", f.rooms.study.period, f.actor);
      await f.query('UPDATE classrooms SET archived_at=now() WHERE id=$1', f.rooms.teach.id);
      const result = await home.read();
      assert.equal(result.participation, 'none'); assert.equal(result.memberships.study, 0); assert.equal(result.memberships.teach, 0);
      assert.equal(result.modules.pending.status, 'not-applicable'); assert.equal(result.modules.review.status, 'not-applicable');
      assert.equal(result.modules.feedback.status, 'not-applicable');
      assert.equal(rows(result, 'materials').length, 0);
      assert.ok(rows(result, 'classrooms').every(x => x.classroom.archived));
    });
    assert.equal((await pool.query('SELECT count(*)::int n FROM users')).rows[0].n, 0, 'Every case rolled back all synthetic users');
  });
});
