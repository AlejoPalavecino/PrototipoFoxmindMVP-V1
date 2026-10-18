import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withP5Database } from '../scripts/p5-database.mjs';
import { FileStore } from '../.build/api/apps/api/src/files/store.js';
import { ClassroomService } from '../.build/api/apps/api/src/classrooms/service.js';

test('P6 Plan maintenance preserves scoped data and manual progress', { timeout: 120000 }, async t => {
  await withP5Database(async ({ pool, database }) => {
    const teacher = randomUUID(), other = randomUUID(), student = randomUUID(), room = randomUUID();
    for (const id of [teacher, other, student]) await pool.query(`INSERT INTO users
      (id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at)
      VALUES($1,now(),$2,$2,'Plan','Fixture','fixture',now())`, [id, `${id}@example.test`]);
    await pool.query(`INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
      VALUES($1,now(),$2,'Plan fixture','Subject','A',2026,'UTC','explore',100000000)`, [room, teacher]);
    const enrollment = randomUUID();
    await pool.query('INSERT INTO enrollments(id,updated_at,classroom_id,student_id) VALUES($1,now(),$2,$3)', [enrollment, room, student]);
    await pool.query(`INSERT INTO membership_periods(id,updated_at,enrollment_id,classroom_id,entry_method) VALUES($1,now(),$2,$3,'CODE')`, [randomUUID(), enrollment, room]);
    const authenticate = async (_tx, req) => req.actor;
    const files = new FileStore(database, { authenticate, authorize: async () => {} }, 100000000n);
    const service = new ClassroomService({ database, files, authenticate, signingKey: Buffer.alloc(32, 1),
      deliveryKey: Buffer.alloc(32, 2), classroomQuotaBytes: 100000000n, webOrigin: 'http://127.0.0.1:3005' });
    const T = { actor: teacher }, S = { actor: student }, O = { actor: other };
    const snapshot = async () => JSON.stringify((await pool.query(`SELECT
      (SELECT jsonb_agg(to_jsonb(u) ORDER BY id) FROM units u) AS units,
      (SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM topics t) AS topics,
      (SELECT revision FROM classrooms WHERE id=$1) AS revision`, [room])).rows);
    const change = async operation => service.changePlan(T, room, { revision: (await service.detail(T, room)).revision, operation });
    const deny = async (actor, operation, code, revision) => {
      const before = await snapshot();
      await assert.rejects(service.changePlan(actor, room, { revision: revision ?? (await service.detail(T, room)).revision, operation }), e => e.code === code);
      assert.equal(await snapshot(), before);
    };
    let unit, second, topic, next;
    await t.test('teacher creates curriculum while original detail and settings behavior remain available', async () => {
      assert.deepEqual((await service.detail(T, room)).units, []);
      await change({ action: 'addUnit', name: 'Unit one' });
      unit = (await service.detail(T, room)).units[0].id;
      await change({ action: 'addUnit', name: 'Unit two' });
      second = (await service.detail(T, room)).units[1].id;
      await change({ action: 'addTopic', unitId: unit, name: 'First topic' });
      await change({ action: 'addTopic', unitId: unit, name: 'Second topic' });
      [topic, next] = (await service.detail(T, room)).units[0].topics.map(item => item.id);
      assert.equal((await service.detail(S, room)).units[0].topics[0].status, 'PENDING');
      const current = await service.detail(T, room);
      await service.updateSettings(T, room, { revision: current.revision, name: 'Renamed classroom', subject: 'Subject', division: 'A', academicYear: 2026 });
      assert.equal((await service.detail(T, room)).name, 'Renamed classroom');
    });
    await t.test('manual NEXT selection resets previous NEXT and TAUGHT selects no replacement', async () => {
      await change({ action: 'setTopicState', id: topic, status: 'NEXT' });
      await change({ action: 'setTopicState', id: next, status: 'NEXT' });
      assert.deepEqual((await service.detail(S, room)).units[0].topics.map(item => item.status), ['PENDING', 'NEXT']);
      await change({ action: 'setTopicState', id: next, status: 'TAUGHT' });
      assert.deepEqual((await service.detail(S, room)).units[0].topics.map(item => item.status), ['PENDING', 'TAUGHT']);
      await deny(T, { action: 'deleteTopic', id: next, confirm: true }, 'CONFLICT');
      await change({ action: 'setTopicState', id: next, status: 'PENDING' });
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM attempts')).rows[0].n, 0);
    });
    await t.test('rename and exact reorder preserve identities and reject stale or invalid commands', async () => {
      await change({ action: 'renameUnit', id: unit, name: 'Renamed unit' });
      await change({ action: 'renameTopic', id: topic, name: 'Renamed topic' });
      await change({ action: 'reorderUnits', ids: [second, unit] });
      await change({ action: 'reorderTopics', unitId: unit, ids: [next, topic] });
      const detail = await service.detail(S, room);
      assert.deepEqual(detail.units.map(item => item.id), [second, unit]);
      assert.deepEqual(detail.units[1].topics.map(item => item.id), [next, topic]);
      await deny(T, { action: 'reorderUnits', ids: [unit, unit] }, 'INVALID_INPUT');
      await deny(T, { action: 'renameUnit', id: unit, name: 'Stale' }, 'CONFLICT', '0');
      await deny(T, { action: 'renameTopic', id: topic, name: 'x'.repeat(121) }, 'INVALID_INPUT');
      await deny(T, { action: 'renameUnit', id: randomUUID(), name: 'Foreign' }, 'FORBIDDEN');
    });
    await t.test('students, other classroom users and archived rooms cannot mutate', async () => {
      await deny(S, { action: 'addUnit', name: 'Student denied' }, 'FORBIDDEN');
      await deny(O, { action: 'addUnit', name: 'Other denied' }, 'FORBIDDEN');
      const current = await service.detail(T, room);
      await service.setArchive(T, room, { revision: current.revision, archived: true });
      await deny(T, { action: 'addUnit', name: 'Archived denied' }, 'CONFLICT');
      assert.equal((await service.detail(S, room)).units.length, 2);
      await service.setArchive(T, room, { revision: (await service.detail(T, room)).revision, archived: false });
    });
    await t.test('concurrent mutations reject stale revisions and preserve at most one NEXT', async () => {
      const revision = (await service.detail(T, room)).revision;
      const results = await Promise.allSettled([topic, next].map(id => service.changePlan(T, room, { revision, operation: { action: 'setTopicState', id, status: 'NEXT' } })));
      assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM topics WHERE classroom_id=$1 AND status='NEXT'", [room])).rows[0].n, 1);
    });
    await t.test('delete requires confirmation, PENDING and empty unlinked unit; invalid file never appends a version', async () => {
      await deny(T, { action: 'deleteUnit', id: unit, confirm: true }, 'CONFLICT');
      await deny(T, { action: 'deleteTopic', id: topic, confirm: false }, 'INVALID_INPUT');
      for (const id of [topic, next]) {
        await change({ action: 'setTopicState', id, status: 'PENDING' });
        await change({ action: 'deleteTopic', id, confirm: true });
      }
      await change({ action: 'deleteUnit', id: unit, confirm: true });
      assert.deepEqual((await service.detail(S, room)).units.map(item => item.id), [second]);
      await assert.rejects(change({ action: 'appendVersion', fileId: randomUUID() }));
      assert.deepEqual((await service.detail(T, room)).plans, []);
    });
  });
});
