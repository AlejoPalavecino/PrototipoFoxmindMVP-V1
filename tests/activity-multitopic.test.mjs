// Work record: /root/activity_red_tests, 2026-10-25, baseline af48e698.
// Scope: independent RED for accepted multi-topic activity authoring. Production is worker-owned.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { activityPayload, activityOperation } from '../apps/api/src/classrooms/activity-policy.ts';

const unitId = randomUUID(), a = randomUUID(), b = randomUUID();
const payload = (selection = {}) => ({ title: 'Actividad integradora', unitId, topicIds: [a, b],
  instructions: 'Relacionar ambos temas.', attachmentRequired: false, instructionFileIds: [], materialIds: [],
  questions: [], deadline: null, allowLate: false, ...selection });
const invalid = value => assert.throws(() => activityPayload(value, 'ASSIGNMENT', false), { code: 'INVALID_INPUT' });

test('D1 ordered multiple topics survive validation with first-topic legacy projection', () => {
  const result = activityPayload(payload(), 'ASSIGNMENT', true);
  assert.deepEqual(result.topicIds, [a, b]);
  assert.equal(result.topicId, a);
  assert.equal(result.unitId, unitId);
});

test('D1 legacy topicId becomes a one-element list and matching dual representation is accepted', () => {
  const legacy = payload({ topicId: a }); delete legacy.topicIds;
  assert.deepEqual(activityPayload(legacy, 'ASSIGNMENT', true).topicIds, [a]);
  assert.deepEqual(activityPayload(payload({ topicId: a }), 'ASSIGNMENT', true).topicIds, [a, b]);
  invalid(payload({ topicId: b }));
  invalid(payload({ topicId: null }));
});

test('D1 draft can have no topic; publication requires at least one and bounds are exact', () => {
  const empty = activityPayload(payload({ unitId: null, topicIds: [] }), 'ASSIGNMENT', false);
  assert.deepEqual(empty.topicIds, []); assert.equal(empty.topicId, null);
  assert.throws(() => activityPayload(payload({ topicIds: [] }), 'ASSIGNMENT', true), { code: 'INVALID_INPUT' });
  const hundred = Array.from({ length: 100 }, () => randomUUID());
  assert.deepEqual(activityPayload(payload({ topicIds: hundred }), 'ASSIGNMENT', true).topicIds, hundred);
  invalid(payload({ topicIds: [...hundred, randomUUID()] }));
});

test('D1 rejects malformed, duplicate or unitless topic lists without coercion', () => {
  for (const topicIds of [a, null, {}, [a, a], ['topic'], [null], [a, undefined]]) invalid(payload({ topicIds }));
  invalid(payload({ unitId: null }));
  invalid({ ...payload(), extra: true });
});

test('D1 organizational metadata accepts topicIds without requiring the obsolete singular field', () => {
  const command = { action: 'metadata', id: randomUUID(), title: 'Reorganizada', unitId, topicIds: [b, a] };
  assert.deepEqual(activityOperation(command), command);
  assert.throws(() => activityOperation({ ...command, publish: true }), { code: 'INVALID_INPUT' });
});
