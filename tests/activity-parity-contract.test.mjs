import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { activityOperation, activityPayload } from '../apps/api/src/modules/activities/domain/activity-policy.ts';
import { parseStartActivityGeneration } from '../src/core/domain/activities/activity-generation-request.ts';

const unitId = randomUUID();
const topic = randomUUID();
const content = { title: 'Integración', instructions: 'Relacioná los ejemplos.', attachmentRequired: false,
  instructionFileIds: [], materialIds: [], questions: [], deadline: null, allowLate: false };
const start = { revision: '0', requestId: randomUUID(), type: 'ASSIGNMENT', unitIds: [unitId], topicIds: [],
  sourceIds: [], groupLevel: '', difficulty: 'BASIC', durationMinutes: 20, context: 'Material curricular',
  counts: { assignment: 1, development: 0, singleChoice: 0, multipleChoice: 0 }, acknowledgedWarnings: [] };

test('manual authoring accepts unit expansion and a distinct private brief', () => {
  const selection = { unitIds: [unitId], topicIds: [topic] };
  const result = activityPayload({ ...content, ...selection, teacherBrief: 'Comparar dos casos.' }, 'ASSIGNMENT', true);
  assert.deepEqual(result.unitIds, [unitId]);
  assert.equal(result.teacherBrief, 'Comparar dos casos.');
  assert.equal(result.objective, undefined);
  assert.doesNotThrow(() => activityOperation({ action: 'metadata', id: randomUUID(), title: 'Integración', ...selection }));
  assert.throws(() => activityPayload({ ...content, unitIds: [], topicIds: [] }, 'ASSIGNMENT', true), { code: 'INVALID_INPUT' });
  assert.throws(() => activityPayload({ ...content, unitIds: [unitId, unitId], topicIds: [] }, 'ASSIGNMENT', true), { code: 'INVALID_INPUT' });
});

test('generation parses the new scope and validates the private idea independently from the public objective', () => {
  const result = parseStartActivityGeneration({ ...start, teacherBrief: 'Distinguir los casos.' });
  assert.deepEqual(result.unitIds, [unitId]);
  assert.equal(result.objective, '');
  assert.equal(result.teacherBrief, 'Distinguir los casos.');
  for (const idea of [undefined, '  ', 'x'.repeat(1201)]) {
    assert.throws(() => parseStartActivityGeneration({ ...start, teacherBrief: idea }), { code: 'INVALID_INPUT' });
  }
});

test('the controlled preview can generate a questionnaire from the approved private idea shape', async () => {
  const { activityProvider } = await import('../scripts/activity-ai-live-provider.mjs');
  const { parseActivityProposal } = await import('../src/core/domain/activities/activity-proposal.ts');
  const type = 'QUESTIONNAIRE', counts = { assignment: 0, development: 1, singleChoice: 1, multipleChoice: 1 };
  const teacherBrief = 'Comparar cómo cambia la luz acumulada al variar el tiempo de exposición.';
  const { json } = await activityProvider.generateActivity({
    type, counts, objective: '', teacherBrief, context: '', sources: [],
  });
  assert.equal(json.status, 'READY');
  const reviewed = parseActivityProposal(json.proposal, { type, counts, sourceIds: [], pdfPageCounts: {}, context: teacherBrief });
  assert.ok(reviewed.objective.trim());
  assert.equal(reviewed.questions.length, 3);
  assert.equal(Object.hasOwn(reviewed, 'teacherBrief'), false);
});
