import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { withGradingFixture } from './p8-grading-helpers.mjs';

test('Brújula additive migration preserves existing private and published grades with a base backfill', { timeout: 150000 }, async () => {
  await withGradingFixture(async f => {
    const attempts = [];
    for (const publish of [false, true]) {
      const item = await f.create('ASSIGNMENT'); attempts.push(item.attempt);
      const view = await f.service.getAttemptGrading(f.T, f.room, item.attempt);
      const saved = await f.service.saveAttemptGrading(f.T, f.room, item.attempt, { ...f.input(view), overallGrade: publish ? '8.00' : '7.00' });
      if (publish) await f.service.publishAttemptGrade(f.T, f.room, item.attempt, { revision: saved.revision, confirm: true });
    }
    const grades = () => f.pool.query('SELECT id,attempt_id,final_grade::text,is_published,published_at FROM attempt_grades ORDER BY id');
    const before = (await grades()).rows;
    // This disposable owned fixture is restored to the schema immediately preceding
    // the additive migration, with real legacy grades already in the old columns.
    await f.pool.query(`DROP TRIGGER preserve_published_rubric ON attempt_grades;
      DROP FUNCTION preserve_published_rubric();
      ALTER TABLE activities DROP COLUMN objective, DROP COLUMN teacher_comment;
      ALTER TABLE wall_posts DROP COLUMN title;
      ALTER TABLE attempt_grades DROP COLUMN rubric_snapshot, DROP COLUMN rubric_marks,
        DROP COLUMN suggested_grade, DROP COLUMN final_grade_override, DROP COLUMN calculated_grade;`);
    await f.pool.query(await readFile('prisma/migrations/202611050002_brujula_activity_grading_wall/migration.sql', 'utf8'));
    assert.deepEqual((await grades()).rows, before);
    for (const attempt of attempts) {
      const [row] = (await f.pool.query('SELECT calculated_grade::text,final_grade::text,final_grade_override FROM attempt_grades WHERE attempt_id=$1', [attempt])).rows;
      assert.equal(row.calculated_grade, row.final_grade); assert.equal(row.final_grade_override, null);
      const view = await f.service.getAttemptGrading(f.T, f.room, attempt);
      assert.equal(view.grade.pending, false); assert.equal(view.grade.finalGrade, view.grade.calculatedGrade);
    }
    const privateAttempt = attempts[0], view = await f.service.getAttemptGrading(f.T, f.room, privateAttempt);
    const saved = await f.service.saveAttemptGrading(f.T, f.room, privateAttempt, { ...f.input(view), overallGrade: view.grade.calculatedGrade });
    assert.equal(saved.grade.finalGrade, '7.00');
    const publicResult = await f.service.getAttemptResult(f.S, f.room, attempts[1]); assert.equal(publicResult.grade.finalGrade, '8.00');
  });
});
