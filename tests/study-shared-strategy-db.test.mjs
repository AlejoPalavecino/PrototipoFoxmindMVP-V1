import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { withTeacherSupportDatabase } from '../scripts/teacher-support-test-runtime.mjs';

const text = '  Me ayuda comparar ejemplos.\nDespués intento resolverlo sin mirar.  ';

async function account(db, role) {
  const id = randomUUID(), email = id + '@example.test';
  await db.query(`INSERT INTO users (id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
    VALUES($1,now(),$2,$2,'Cuenta','Sintética','synthetic',now(),$3)`, [id, email, role]);
  return id;
}

async function classroom(db, teacher) {
  const id = randomUUID();
  await db.query(`INSERT INTO classrooms (id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
    VALUES($1,now(),$2,'Aula sintética','Matemática','A',2026,'UTC','explore',1000000)`, [id, teacher]);
  return id;
}

async function startPeriod(db, enrollment, room) {
  const period = randomUUID();
  await db.query(`INSERT INTO membership_periods (id,updated_at,enrollment_id,classroom_id,entry_method)
    VALUES($1,now(),$2,$3,'CODE')`, [period, enrollment, room]);
  return period;
}

async function enroll(db, student, room) {
  const enrollment = randomUUID();
  await db.query('INSERT INTO enrollments (id,updated_at,classroom_id,student_id) VALUES($1,now(),$2,$3)', [enrollment, room, student]);
  return { enrollment, period: await startPeriod(db, enrollment, room) };
}

test('student consent is exact, scoped, fenced by publication id, and revoked for every audience change', { timeout: 120000 }, async () => {
  const [{ createStudyService, readSharedStudyStrategies }, { PrismaService }] = await Promise.all([
    import('../.build/api/apps/api/src/bootstrap/study-composition.js'),
    import('../.build/api/apps/api/src/platform/database/prisma.service.js'),
  ]);
  assert.equal(typeof readSharedStudyStrategies, 'function');
  await withTeacherSupportDatabase(async ({ database: db, databaseUrl }) => {
    const owner = await account(db, 'student'), peer = await account(db, 'student');
    const teacher = await account(db, 'teacher'), outsider = await account(db, 'teacher');
    const room = await classroom(db, teacher), other = await classroom(db, outsider);
    const { enrollment, period } = await enroll(db, owner, room);
    const otherMembership = await enroll(db, owner, other);
    const folder = randomUUID();
    await db.query(`INSERT INTO study_folders (id,owner_id,status,state) VALUES($1,$2,'ACTIVE',$3)`, [folder, owner,
      JSON.stringify({ version: 1, fields: { linkedClassroomId: room, name: 'Privado' }, conversations: ['chat privado'], practices: ['práctica privada'] })]);
    const prisma = new PrismaService(databaseUrl);
    try {
      const { sharedStrategy: api } = createStudyService({ database: prisma, authenticate: async (_tx, actor) => actor });
      const scope = { teacherId: teacher, classroomId: room, studentId: owner };
      const read = (input = scope) => readSharedStudyStrategies({ query: async (sql, ...values) => (await db.query(sql, values)).rows }, input);
      const absent = { strategy: null };
      const link = id => db.query(`UPDATE study_folders SET state=jsonb_set(state,'{fields,linkedClassroomId}',to_jsonb($2::text)) WHERE id=$1`, [folder, id]);
      const publish = (value = text) => api.publish(owner, folder, { classroomId: room, text: value });
      assert.deepEqual(await api.get(owner, folder), absent);
      for (const actor of [peer, teacher]) {
        await assert.rejects(() => api.get(actor, folder), { code: 'FORBIDDEN' });
        await assert.rejects(() => api.publish(actor, folder, { classroomId: room, text }), { code: 'FORBIDDEN' });
      }
      await assert.rejects(() => api.publish(owner, folder, { classroomId: other, text }), { code: 'FORBIDDEN' });
      assert.deepEqual(await read(), []);
      const first = (await publish()).strategy;
      assert.deepEqual(first, { id: first.id, classroomId: room, text });
      assert.deepEqual(await publish(), { strategy: first });
      assert.deepEqual(await read(), [{ id: first.id, text }]);
      for (const input of [{ ...scope, teacherId: outsider }, { ...scope, studentId: peer }, { ...scope, classroomId: other }]) {
        assert.deepEqual(await read(input), []);
      }
      const second = (await publish('También me sirve explicar los pasos.')).strategy;
      assert.notEqual(second.id, first.id);
      await assert.rejects(() => api.withdraw(owner, folder, first.id), { code: 'CONFLICT' });
      await assert.rejects(() => api.withdraw(peer, folder, second.id), { code: 'FORBIDDEN' });
      assert.deepEqual(await api.get(owner, folder), { strategy: second });
      assert.deepEqual(await api.withdraw(owner, folder, second.id), absent);
      assert.deepEqual(await api.withdraw(owner, folder, second.id), absent);
      assert.deepEqual(await read(), []);
      const previous = (await publish()).strategy;
      const [replacement, withdrawal] = await Promise.allSettled([
        publish('Pruebo otra manera de estudiar.'),
        api.withdraw(owner, folder, previous.id),
      ]);
      assert.equal(replacement.status, 'fulfilled');
      if (withdrawal.status === 'rejected') assert.equal(withdrawal.reason.code, 'CONFLICT');
      assert.deepEqual(await api.get(owner, folder), replacement.value);
      await assert.rejects(() => db.query('UPDATE study_shared_strategies SET membership_period_id=$2 WHERE folder_id=$1',
        [folder, otherMembership.period]), { code: '23514' });
      await link(other);
      assert.deepEqual(await api.get(owner, folder), absent);
      assert.deepEqual(await read(), []);
      await link(room);
      assert.deepEqual(await read(), []);
      await publish();
      await db.query(`UPDATE membership_periods SET ended_at=clock_timestamp(),end_reason='REMOVED',ended_by_id=$2 WHERE id=$1`, [period, teacher]);
      assert.deepEqual(await read(), []);
      await assert.rejects(() => publish(), { code: 'FORBIDDEN' });
      await startPeriod(db, enrollment, room);
      assert.deepEqual(await api.get(owner, folder), absent);
      await publish();
      await db.query('UPDATE classrooms SET archived_at=clock_timestamp() WHERE id=$1', [room]);
      assert.deepEqual(await read(), []);
      await assert.rejects(() => publish(), { code: 'FORBIDDEN' });
      await db.query('UPDATE classrooms SET archived_at=NULL WHERE id=$1', [room]);
      assert.deepEqual(await api.get(owner, folder), absent);
      await publish();
      await db.query("UPDATE study_folders SET status='ARCHIVED' WHERE id=$1", [folder]);
      assert.deepEqual(await read(), []);
      assert.deepEqual(await api.get(owner, folder), absent);
      await assert.rejects(() => publish(), { code: 'FORBIDDEN' });
      const result = await db.query('SELECT revision,(SELECT count(*)::int FROM study_shared_strategies) AS strategies FROM study_folders WHERE id=$1',[folder]);
      assert.deepEqual(result.rows, [{ revision:'1', strategies:0 }]);
    } finally {
      await prisma.$disconnect();
    }
  });
});
