import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEvaluationRubric } from '../src/core/domain/evaluation-rubric.ts';
import { activityPayload } from '../apps/api/src/classrooms/activity-policy.ts';
import { parseActivityProposal } from '../src/core/domain/activity-proposal.ts';

test('AI proposal preserves editable public criteria and rejects invalid weights', () => {
  const criteria = [{ name: 'Evidencias', description: 'Usa las fuentes.', weight: 100 }];
  const proposal = { schemaVersion: 'activity-proposal-v1', type: 'ASSIGNMENT', title: 'Actividad', objective: 'Relacionar conceptos', instructions: '', assignmentPrompts: ['Explicá la relación.'],
    questions: [], evidence: [{ item: 'assignment', index: 0, references: [{ sourceId: 'teacher-context', page: null }] }], warnings: [], evaluationRubric: criteria };
  const constraints = { type: 'ASSIGNMENT', counts: { assignment: 1, development: 0, singleChoice: 0, multipleChoice: 0 }, sourceIds: [], context: 'Conceptos relacionados', pdfPageCounts: {} };
  assert.deepEqual(parseActivityProposal(proposal, constraints).evaluationRubric, criteria);
  assert.throws(() => parseActivityProposal({ ...proposal, evaluationRubric: [{ ...criteria[0], weight: 80 }] }, constraints), { code: 'INVALID_INPUT' });
});

test('Public rubric requires distinct bounded criteria and exactly 100 integer percentage points', () => {
  const criteria = [{ name: 'Contenido', description: 'Explica con evidencia.', weight: 60 }, { name: 'Claridad', description: '', weight: 40 }];
  assert.deepEqual(parseEvaluationRubric(criteria), criteria);
  assert.deepEqual(parseEvaluationRubric([]), []);
  for (const bad of [null, {}, [{ ...criteria[0], weight: 99 }], [{ ...criteria[0], weight: 100.1 }],
    [{ ...criteria[0], name: '' }], [criteria[0], { ...criteria[1], name: 'contenido' }], [{ ...criteria[0], weight: 0 }],
    [{ ...criteria[0], weight: 100, correctAnswer: 'secret' }]]) assert.throws(() => parseEvaluationRubric(bad));
});
test('Activity authoring validates public rubric separately from private AI instructions', () => {
  const payload = { title: 'Actividad', unitId: null, topicIds: [], instructions: 'Resolver', attachmentRequired: false,
    instructionFileIds: [], materialIds: [], questions: [], deadline: null, allowLate: false,
    aiGradingRubric: 'Criterio privado', evaluationRubric: [{ name: 'Contenido', description: 'Evidencias', weight: 100 }] };
  const parsed = activityPayload(payload, 'ASSIGNMENT', false);
  assert.deepEqual(parsed.evaluationRubric, payload.evaluationRubric);
  assert.equal(parsed.aiGradingRubric, 'Criterio privado');
  assert.throws(() => activityPayload({ ...payload, evaluationRubric: [{ ...payload.evaluationRubric[0], weight: 80 }] }, 'ASSIGNMENT', false), { code: 'INVALID_INPUT' });
});
