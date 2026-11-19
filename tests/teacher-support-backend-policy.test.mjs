import assert from 'node:assert/strict';
import test from 'node:test';
import { supportPriority } from '../apps/api/src/modules/grading/domain/teacher-support-policy.ts';
import { TeacherSupportService } from '../apps/api/src/modules/grading/progress/application/teacher-support.ts';

test('independent pending obligations or a delay of ten local calendar days precede coverage', () => {
  assert.equal(supportPriority({ pendingCount: 2, oldestDays: 0, recentDelivered: 5 }), 'high');
  assert.equal(supportPriority({ pendingCount: 1, oldestDays: 10, recentDelivered: 0 }), 'high');
  assert.equal(supportPriority({ pendingCount: 1, oldestDays: 9, recentDelivered: 10 }), 'medium');
  assert.equal(supportPriority({ pendingCount: 1, oldestDays: 0, recentDelivered: 0 }), 'medium');
});

test('coverage requires two expired assignments with a confirmed receipt and no pending obligation', () => {
  assert.equal(supportPriority({ pendingCount: 0, oldestDays: 0, recentDelivered: 2 }), 'low');
  assert.equal(supportPriority({ pendingCount: 0, oldestDays: 0, recentDelivered: 1 }), 'insufficient');
  assert.equal(supportPriority({ pendingCount: 0, oldestDays: 0, recentDelivered: 0 }), 'insufficient');
});

test('support preserves published prose without classifying it or suggesting an action without a criterion', async () => {
  const classroomId = 'a1111111-1111-4111-8111-111111111111';
  const studentId = 'b2222222-2222-4222-8222-222222222222';
  const service = new TeacherSupportService({
    run: async (_request, _write, read) => read({}, { id: 'teacher', account_role: 'teacher', now: new Date(0) }),
    classroom: async () => ({ archived_at: null }),
  }, {
    evaluationTime: async () => new Date(0),
    facts: async () => [{ classroomId, studentId, firstName: 'Ada', lastName: 'Ejemplo', classroomName: 'Arte',
      timeZone: 'UTC', pending: [], expected: 0, delivered: 0, oldestDays: 0 }],
    grades: async () => [{ activityId: 'activity', attemptId: 'attempt', title: 'Contraste', grade: '9.99',
      feedback: 'Explicaste cómo cambia la sombra.', rubric: [{ name: 'Argumentación', description: '', weight: 100 }],
      marks: [{ criterionIndex: 0, score: '9.99' }] }],
  }, async (_tx, audience) => {
    assert.deepEqual(audience, {teacherId:'teacher', classroomId, studentId});
    return [{id:'share',text:'Comparo dos ejemplos'}];
  });
  const record = await service.getTeacherSupport({}, classroomId, studentId);
  assert.deepEqual(record.sharedStrategies, [{id:'share',text:'Comparo dos ejemplos'}]);
  assert.equal(record.priority,'insufficient');
  const [observation] = record.observations;
  assert.deepEqual(observation.strengths, []);
  assert.deepEqual(observation.improvements, []);
  assert.equal(observation.nextStep, null);
  assert.equal(observation.feedback, 'Explicaste cómo cambia la sombra.');
});
