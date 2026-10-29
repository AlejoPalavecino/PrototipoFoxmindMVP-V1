import test from 'node:test';
import assert from 'node:assert/strict';

const enqueue = async (tx, input) => (await import('../apps/api/src/classrooms/grading-ai/enqueue.ts')).enqueueSubmittedAttemptGradingAi(tx, input);
const ids = { classroomId: '11111111-1111-4111-8111-111111111111', activityId: '22222222-2222-4222-8222-222222222222',
  attemptId: '33333333-3333-4333-8333-333333333333' };
const teacher = '44444444-4444-4444-8444-444444444444';

// Fake transaction implements the insertion contract atomically; it rejects unknown SQL
// so an accidental outside-transaction or provider call cannot masquerade as success.
function fake({ enabled = true, rubric = 'Justificar los pasos', failure = false } = {}) {
  const jobs = new Map(), calls = [];
  const tx = { async query(sql, ...args) {
    calls.push({ sql, args });
    if (/^\s*select/i.test(sql)) return [{ id: ids.classroomId, classroom_id: ids.classroomId,
      activity_id: ids.activityId, teacher_id: teacher, owner_id: teacher, ai_grading_enabled: enabled,
      grading_ai_enabled: enabled, ai_grading_rubric: rubric, grading_ai_rubric: rubric, rubric }];
    if (/^\s*insert\s+into\s+grading_ai/i.test(sql)) {
      if (failure) throw new Error('storage unavailable');
      assert.ok(args.includes(ids.attemptId), 'el intento debe identificar la inserción');
      assert.ok(args.includes(ids.classroomId), 'el aula debe identificar la inserción');
      assert.ok(args.includes(ids.activityId), 'la actividad debe identificar la inserción');
      assert.ok(args.includes(teacher), 'el trabajo debe pertenecer al docente');
      assert.ok(args.includes(rubric), 'la rúbrica debe quedar congelada en la inserción');
      if (jobs.has(ids.attemptId)) return [];
      jobs.set(ids.attemptId, { ...ids, owner: teacher, rubric });
      return [{ id: '55555555-5555-4555-8555-555555555555' }];
    }
    throw new Error('Consulta no esperada');
  } };
  return { tx, jobs, calls };
}

test('entrega con opción activa encola un solo trabajo con rúbrica y docente', async () => {
  const f = fake();
  assert.equal(await enqueue(f.tx, ids), true);
  assert.deepEqual([...f.jobs.values()], [{ ...ids, owner: teacher, rubric: 'Justificar los pasos' }]);
});

test('entrega con opción desactivada no encola trabajo', async () => {
  const f = fake({ enabled: false });
  assert.equal(await enqueue(f.tx, ids), false);
  assert.equal(f.jobs.size, 0);
});

test('la misma entrega no duplica el trabajo en reintentos', async () => {
  const f = fake();
  assert.equal(await enqueue(f.tx, ids), true);
  assert.equal(await enqueue(f.tx, ids), false);
  assert.equal(f.jobs.size, 1);
});

test('una rúbrica vacía se conserva y no impide encolar', async () => {
  const f = fake({ rubric: '' });
  assert.equal(await enqueue(f.tx, ids), true);
  assert.equal(f.jobs.get(ids.attemptId).rubric, '');
});

test('el fallo de persistencia se propaga a la transacción de entrega', async () => {
  const f = fake({ failure: true });
  await assert.rejects(enqueue(f.tx, ids), /storage unavailable/);
  assert.equal(f.jobs.size, 0);
});
