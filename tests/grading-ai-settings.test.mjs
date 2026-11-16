import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { activityPayload } from '../apps/api/src/modules/activities/domain/activity-policy.ts';
import { DraftService } from '../apps/api/src/bootstrap/academic-management-composition.ts';
import { createAuthoringRepository } from '../apps/api/src/modules/activities/infrastructure/authoring-repository.ts';
import { readActivityTopicScope } from '../apps/api/src/modules/activities/infrastructure/activity-topics.ts';

const activity = extra => ({ title: 'Trabajo', unitId: randomUUID(), topicIds: [randomUUID()], instructions: 'Resolver',
  attachmentRequired: false, instructionFileIds: [], materialIds: [], questions: [], deadline: null, allowLate: false, ...extra });
const settings = extra => ({ revision: '1', name: 'Aula', subject: 'Materia', division: 'A', academicYear: 2026, ...extra });
function classroomFixture() {
  const seen = { calls: [], queries: [] };
  const tx = { query: async (sql, ...args) => { seen.queries.push({ sql, args }); return [{ id: 'room' }]; } };
  const service = new DraftService({ ports: { gradingAiAvailable: true }, run: async (_request, write, callback) => { seen.write = write; return callback(tx, { id: 'teacher' }); },
    classroom: async (...args) => { seen.calls.push(args); return { revision: 1n, ai_grading_enabled: false, ai_grading_epoch: 0n }; } });
  return { seen, update: body => DraftService.prototype.updateSettings.call(service, {}, 'room', body) };
}

test('rúbrica opcional conserva compatibilidad y acepta texto multilínea acotado', () => {
  assert.equal(activityPayload(activity({}), 'ASSIGNMENT', false).aiGradingRubric, '');
  const rubric = 'Claridad\nJustificación';
  assert.equal(activityPayload(activity({ aiGradingRubric: rubric }), 'ASSIGNMENT', false).aiGradingRubric, rubric);
  assert.equal(activityPayload(activity({ aiGradingRubric: 'á'.repeat(5000) }), 'ASSIGNMENT', false).aiGradingRubric.length, 5000);
});

test('rúbrica rechaza valores inválidos, controles y más de 5000 caracteres Unicode', () => {
  for (const rubric of [null, 1, {}, 'x'.repeat(5001), 'criterio\u0000inseguro']) {
    assert.throws(() => activityPayload(activity({ aiGradingRubric: rubric }), 'ASSIGNMENT', false), { code: 'INVALID_INPUT' });
  }
});

test('configuración admite un interruptor booleano y exige vía docente de escritura', async () => {
  for (const enabled of [true, false]) {
    const f = classroomFixture(); await f.update(settings({ aiGradingEnabled: enabled }));
    assert.equal(f.seen.write, true); assert.equal(f.seen.calls.length, 1);
    assert.deepEqual(f.seen.calls[0].slice(2), ['room', true, true]);
    assert.ok(f.seen.queries.some(q => q.args.includes(enabled)));
  }
});

test('configuración anterior sin interruptor se mantiene compatible', async () => {
  const f = classroomFixture(); await assert.doesNotReject(f.update(settings({})));
});
test('la portada se cambia con revisión docente y rechaza identidades desconocidas',async()=>{
  const f=classroomFixture();await f.update(settings({coverKey:'biology'}));
  assert.ok(f.seen.queries.some(q=>q.sql.includes('cover_key=COALESCE')&&q.args.at(-1)==='biology'));
  const bad=classroomFixture();await assert.rejects(bad.update(settings({coverKey:'unknown'})),{code:'INVALID_INPUT'});assert.equal(bad.seen.queries.length,0);
});

test('configuración rechaza interruptor que no sea booleano antes de escribir', async () => {
  for (const value of [null, 1, 'true', {}, []]) {
    const f = classroomFixture(); await assert.rejects(f.update(settings({ aiGradingEnabled: value })), { code: 'INVALID_INPUT' });
    assert.equal(f.seen.queries.length, 0);
  }
});

test('rúbrica solo se proyecta en vista docente, nunca en vista del alumno', async () => {
  const { ActivityAuthoringService } = await import("../apps/api/src/bootstrap/academic-authoring-composition.ts");
  const tx = { query: async () => [] }, service = { activitySummary: () => ({ id: 'activity' }),
    repository: createAuthoringRepository(), operations: { readActivityTopicScope } };
  const row = { id: 'activity', topic_id: null, instructions_text: 'Consigna', attachments_required: false, ai_grading_rubric: 'Criterio privado' };
  const teacher = await ActivityAuthoringService.prototype.activityView.call(service, tx, row, 'UTC', true);
  const student = await ActivityAuthoringService.prototype.activityView.call(service, tx, row, 'UTC', false);
  assert.equal(teacher.aiGradingRubric, 'Criterio privado');
  assert.equal(Object.hasOwn(student, 'aiGradingRubric'), false);
  assert.equal(JSON.stringify(student).includes('Criterio privado'), false);
});
