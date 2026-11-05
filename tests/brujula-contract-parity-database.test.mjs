import test from 'node:test';
import assert from 'node:assert/strict';
import { withGradingFixture } from './p8-grading-helpers.mjs';

const rubric = [{ name: 'Evidencias', description: 'Usa fuentes.', weight: 60 }, { name: 'Claridad', description: '', weight: 40 }];
const marks = [{ criterionIndex: 0, score: '8.25' }, { criterionIndex: 1, score: '6.50' }];

test('Brújula persisted contracts: snapshots, permissions, publication, overrides and legacy', { timeout: 150000 }, async () => {
  await withGradingFixture(async f => {
    const { service, T, S, F, room, pool } = f;
    const revision = async () => (await service.detail(T, room)).revision;
    const change = async operation => service.changeActivities(T, room, { revision: await revision(), operation });
    const detail = await service.detail(T, room);
    const { id } = await change({ action: 'create', type: 'ASSIGNMENT' });
    const payload = { title: 'Campos separados', unitId: detail.units[0].id, topicIds: [detail.units[0].topics[0].id],
      instructions: 'Resolver.', objective: 'Relacionar.', teacherComment: 'Consultá tus apuntes.', attachmentRequired: false,
      instructionFileIds: [], materialIds: [], questions: [], deadline: null, allowLate: false };
    await change({ action: 'save', id, payload });
    const legacy = { ...payload }; delete legacy.objective; delete legacy.teacherComment;
    await change({ action: 'save', id, payload: legacy });
    let activity = (await service.activityDetail(T, room, id, true)).activity;
    assert.equal(activity.objective, payload.objective); assert.equal(activity.teacherComment, payload.teacherComment);
    await assert.rejects(service.activityDetail(S, room, id), { code: 'FORBIDDEN' });
    await change({ action: 'publish', id });
    activity = (await service.activityDetail(S, room, id)).activity;
    assert.equal(activity.objective, payload.objective); assert.equal(activity.teacherComment, payload.teacherComment);

    const wall = async operation => service.changeWall(T, room, { revision: await revision(), operation });
    await wall({ action: 'publish', title: 'Salida de campo', body: 'Traigan apuntes.' });
    let post = (await service.listWall(S, room)).posts[0];
    assert.equal(post.title, 'Salida de campo'); assert.equal(post.body, 'Traigan apuntes.');
    await wall({ action: 'editPost', id: post.id, body: 'Traigan agua.' });
    post = (await service.listWall(S, room)).posts[0]; assert.equal(post.title, 'Salida de campo');
    await assert.rejects(service.changeWall(S, room, { revision: await revision(), operation: { action: 'editPost', id: post.id, title: 'Forjado', body: 'Otro' } }), { code: 'FORBIDDEN' });
    await wall({ action: 'removePost', id: post.id, confirm: true });
    post = (await service.listWall(S, room)).posts[0]; assert.equal(post.title, null); assert.equal(post.body, null);

    for (const type of ['ASSIGNMENT', 'QUESTIONNAIRE', 'EVALUATION']) {
      const item = await f.create(type);
      // Fixture-owned SQL models a prior public rubric, then a later altered definition.
      await pool.query('UPDATE activities SET evaluation_rubric=$2::jsonb WHERE id=$1', [item.id, JSON.stringify(rubric)]);
      const read = () => service.getAttemptGrading(T, room, item.attempt);
      let view = await read(), input = f.input(view);
      view = await service.saveAttemptGrading(T, room, item.attempt, { ...input, finalGradeOverride: '9.00' });
      assert.equal(view.grade.calculatedGrade, null); assert.equal(view.grade.finalGrade, '9.00');
      if (type === 'ASSIGNMENT') {
        assert.equal(view.grade.pending, false);
        view = await service.saveAttemptGrading(T, room, item.attempt, { ...f.input(view), finalGradeOverride: null });
        assert.equal(view.grade.finalGrade, null); assert.equal(view.grade.pending, true);
      } else {
        assert.equal(view.grade.pending, true);
        await f.rejected(() => service.publishAttemptGrade(T, room, item.attempt, { revision: view.revision, confirm: true }), 'CONFLICT');
      }
      input = f.input(view);
      if (type === 'ASSIGNMENT') input.overallGrade = '7.00'; else input.questions[0].points = '1.00';
      view = await service.saveAttemptGrading(T, room, item.attempt, { ...input, rubricMarks: marks, finalGradeOverride: '9.25' });
      const calculated = type === 'ASSIGNMENT' ? '7.00' : '6.25';
      assert.equal(view.grade.calculatedGrade, calculated); assert.equal(view.grade.finalGrade, '9.25');
      assert.equal(view.grade.suggestedGrade, '7.55'); assert.deepEqual(view.grade.rubricSnapshot, rubric);
      await assert.rejects(service.getAttemptGrading(S, room, item.attempt), { code: 'FORBIDDEN' });
      await assert.rejects(service.getAttemptGrading(F, room, item.attempt), { code: 'FORBIDDEN' });
      assert.deepEqual(await service.getAttemptResult(S, room, item.attempt), { status: 'pending', attemptId: item.attempt });
      const invalid = { ...input, revision: view.revision, rubricMarks: [{ criterionIndex: 2, score: '5' }] };
      await f.rejected(() => service.saveAttemptGrading(T, room, item.attempt, invalid), 'INVALID_INPUT');
      // Legacy save cannot clear the explicit teacher override or marks.
      view = await service.saveAttemptGrading(T, room, item.attempt, { ...input, revision: view.revision });
      assert.equal(view.grade.finalGrade, '9.25'); assert.deepEqual(view.grade.rubricMarks, marks);
      view = await service.saveAttemptGrading(T, room, item.attempt, { ...input, revision: view.revision, finalGradeOverride: null });
      assert.equal(view.grade.finalGrade, calculated);
      await pool.query('UPDATE activities SET evaluation_rubric=$2::jsonb WHERE id=$1', [item.id, JSON.stringify([{ name: 'Otro', description: '', weight: 100 }])]);
      view = await service.saveAttemptGrading(T, room, item.attempt, { ...input, revision: view.revision, rubricMarks: marks, finalGradeOverride: '8.50' });
      assert.deepEqual(view.grade.rubricSnapshot, rubric);
      view = await service.publishAttemptGrade(T, room, item.attempt, { revision: view.revision, confirm: true });
      assert.equal(view.grade.finalGrade, '8.50'); assert.equal(view.grade.isPublished, true);
      let result = await service.getAttemptResult(S, room, item.attempt);
      assert.deepEqual(result.grade.rubricSnapshot, rubric); assert.deepEqual(result.grade.rubricMarks, marks); assert.equal(result.grade.suggestedGrade, '7.55');
      await service.correctPublishedGrade(T, room, item.attempt, { revision: await revision(), newGrade: '8.75', reason: 'Revisión docente', confirm: true });
      result = await service.getAttemptResult(S, room, item.attempt);
      assert.equal(result.grade.finalGrade, '8.75'); assert.equal(result.grade.finalGradeOverride, '8.50'); assert.deepEqual(result.grade.rubricMarks, marks);
      await assert.rejects(pool.query("UPDATE attempt_grades SET rubric_marks='[]'::jsonb WHERE attempt_id=$1", [item.attempt]), /immutable/);
    }
  });
});
