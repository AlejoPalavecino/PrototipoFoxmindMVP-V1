import test from 'node:test';
import assert from 'node:assert/strict';
import { selectedActivityTopics } from './activity-scope.ts';

const units = [
  { id: 'a', name: 'Unidad A', topics: [{ id: 'a1', name: 'A1' }, { id: 'a2', name: 'A2' }] },
  { id: 'b', name: 'Unidad B', topics: [{ id: 'b1', name: 'B1' }] },
];

test('combina una unidad completa con un tema de otra unidad y deduplica por ID', () => {
  assert.deepEqual(selectedActivityTopics(units, { unitIds: ['a'], topicIds: ['b1', 'a1'] })
    .map(group => [group.id, group.topics.map(topic => topic.id)]), [['a', ['a1', 'a2']], ['b', ['b1']]]);
});

test('conserva selecciones de temas de varias unidades en el orden del programa', () => {
  assert.deepEqual(selectedActivityTopics(units, { unitIds: [], topicIds: ['b1', 'a2'] })
    .map(group => group.topics.map(topic => topic.name)), [['A2'], ['B1']]);
});

test('omite referencias inexistentes de un estado anterior del plan', () => {
  assert.deepEqual(selectedActivityTopics(units, { unitIds: ['gone'], topicIds: ['obsolete'] }), []);
});
