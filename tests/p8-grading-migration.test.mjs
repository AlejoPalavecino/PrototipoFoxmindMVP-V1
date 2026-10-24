import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import pg from 'pg';
import { withP5Database } from '../scripts/p5-database.mjs';

test('populated eight-migration baseline upgrades pending rational pairs without changing existing academic rows', { timeout: 150000 }, async () => {
  await withP5Database(async ({ pool }) => {
    // A separate database in this exact owned disposable container, never a retained DB.
    await pool.query('CREATE DATABASE p8_upgrade');
    const db = new pg.Client({ ...pool.options, password: pool.options.password, database: 'p8_upgrade' }); await db.connect();
    try {
      const names = (await readdir('prisma/migrations')).filter(name => /^\d+_/.test(name)).sort();
      assert.equal(names.length, 12);
      assert.equal(names[8], '202610180002_p8_pending_question_scores');
      assert.deepEqual(names.slice(9), ['202610230001_agenda_events', '202610230001_classroom_ai', '202610240001_agenda_event_color']);
      const baseline = names.slice(0, 8); assert.equal(baseline.length, 8);
      for (const name of baseline) await db.query(await readFile(`prisma/migrations/${name}/migration.sql`, 'utf8'));
      const insert = async (table, data) => {
        const value = { id: randomUUID(), updated_at: new Date(), ...data }, keys = Object.keys(value);
        return (await db.query(`INSERT INTO ${table}(${keys.join(',')}) VALUES(${keys.map((_, i) => `$${i + 1}`).join(',')}) RETURNING *`, Object.values(value))).rows[0];
      };
      const teacher = await insert('users', { email: 'upgrade-teacher@example.test', email_normalized: 'upgrade-teacher@example.test', first_name: 'Upgrade', last_name: 'Teacher', password_hash: 'fixture' });
      const student = await insert('users', { email: 'upgrade-student@example.test', email_normalized: 'upgrade-student@example.test', first_name: 'Upgrade', last_name: 'Student', password_hash: 'fixture' });
      const room = await insert('classrooms', { teacher_id: teacher.id, name: 'Upgrade', subject: 'Science', division: 'A', academic_year: 2026, timezone: 'UTC', cover_key: 'explore', storage_quota_bytes: '1000000' });
      const enrollment = await insert('enrollments', { classroom_id: room.id, student_id: student.id });
      const activity = await insert('activities', { classroom_id: room.id, type: 'QUESTIONNAIRE', title: 'Old grade' });
      const obligation = await insert('student_activities', { classroom_id: room.id, enrollment_id: enrollment.id, activity_id: activity.id, is_expected: true, eligibility_reason: 'INITIAL_ENROLLMENT' });
      const attempt = await insert('attempts', { student_activity_id: obligation.id, activity_id: activity.id, attempt_number: 1 });
      const question = await insert('questions', { activity_id: activity.id, type: 'DEVELOPMENT', prompt: 'Retained question', position: 0, available_points: '6' });
      const grade = await insert('attempt_grades', { attempt_id: attempt.id, student_activity_id: obligation.id, activity_id: activity.id, graded_by_id: teacher.id, final_grade: '8.50', overall_feedback: 'Retained overall 😀' });
      const score = await insert('question_grades', { attempt_grade_id: grade.id, activity_id: activity.id, question_id: question.id, earned_numerator: '4', earned_denominator: '3', feedback: 'Retained exact feedback 😀' });
      const snapshot = async () => {
        const tables = (await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
        return createHash('sha256').update(JSON.stringify(await Promise.all(tables.map(async ({ tablename }) => (await db.query(`SELECT to_jsonb(t) value FROM ${tablename} t ORDER BY to_jsonb(t)::text`)).rows)))).digest('hex');
      };
      const before = await snapshot();
      await assert.rejects(() => db.query('UPDATE question_grades SET earned_numerator=NULL,earned_denominator=NULL WHERE id=$1', [score.id]), { code: '23502' });
      assert.equal(await snapshot(), before); // Meaningful SQL RED: the populated baseline cannot preserve a pending correction.
      await db.query(await readFile(`prisma/migrations/${names[8]}/migration.sql`, 'utf8'));
      assert.equal(await snapshot(), before);
      const nullable = (await db.query("SELECT is_nullable FROM information_schema.columns WHERE table_name='question_grades' AND column_name IN ('earned_numerator','earned_denominator') ORDER BY column_name")).rows;
      assert.deepEqual(nullable.map(row => row.is_nullable), ['YES', 'YES']);
      for (const [numerator, denominator] of [[null, '1'], ['0', null], ['NaN', '1'], ['Infinity', '1'], ['-Infinity', '1'], ['0', 'NaN'], ['0', 'Infinity'], ['-1', '1'], ['0', '0'], ['1.5', '1'], ['0', '1.5']]) {
        await assert.rejects(() => db.query('UPDATE question_grades SET earned_numerator=$2,earned_denominator=$3 WHERE id=$1', [score.id, numerator, denominator]), { code: '23514' });
        assert.equal(await snapshot(), before);
      }
      await db.query('UPDATE question_grades SET earned_numerator=NULL,earned_denominator=NULL,feedback=$2 WHERE id=$1', [score.id, 'Private pending feedback']);
      assert.deepEqual((await db.query('SELECT earned_numerator,earned_denominator,feedback FROM question_grades WHERE id=$1', [score.id])).rows[0], { earned_numerator: null, earned_denominator: null, feedback: 'Private pending feedback' });
      await db.query('UPDATE question_grades SET earned_numerator=0,earned_denominator=1 WHERE id=$1', [score.id]);
      assert.deepEqual((await db.query('SELECT earned_numerator,earned_denominator FROM question_grades WHERE id=$1', [score.id])).rows[0], { earned_numerator: '0', earned_denominator: '1' });
      console.log('P8 populated migration baseline8 -> candidate9: unchanged existing rows; pending/zero/invalid-pair checks passed');
    } finally { await db.end(); }
  });
});
