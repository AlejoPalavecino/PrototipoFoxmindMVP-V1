import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { prepareFoxyActivity } from '../activity-handoff.ts';
import { encodeFoxyQuiz } from '../../../../../../../../src/core/domain/foxy/foxy-quiz.ts';

const quiz = {
  objective: 'Distinguir dos fases.',
  instructions: 'Elegí una opción.',
  questions: [{ prompt: '¿Qué se separa en anafase?', options: [
    { text: 'Cromátidas hermanas', feedback: 'Se separan hacia polos opuestos.', correct: true },
    { text: 'Membranas plasmáticas', feedback: 'No se separan en esta fase.', correct: false },
  ] }],
};

function fixture(markdown = encodeFoxyQuiz(quiz)) {
  const classroomId = randomUUID();
  const activityId = randomUUID();
  const resourceId = randomUUID();
  const actor = { id: randomUUID(), now: new Date('2026-11-19T00:00:00Z') };
  const payload = {
    activityKind: 'QUESTIONNAIRE', title: 'Mitosis', objective: quiz.objective, instructions: quiz.instructions, teacherComment: '',
    unitId: randomUUID(), topicIds: [randomUUID()], evaluationRubric: [],
  };
  const input = { requestId: randomUUID(), resourceRevision: '2', classroomRevision: '4', classroomId, payload };
  const resources = { get: async () => ({ id: resourceId, title: payload.title, revision: '2', markdown }) };
  let receipt;
  const tx = { query: async (sql, ...args) => {
    if (sql.startsWith('SELECT revision')) return [{ revision: 4n, archived_at: null }];
    if (sql.startsWith('SELECT input_hash')) return receipt ? [receipt] : [];
    if (sql.startsWith('UPDATE classrooms')) return [{ revision: 5n }];
    if (sql.startsWith('INSERT INTO foxy_resource_requests')) {
      receipt = { input_hash: args[3], result: JSON.parse(args[4]) };
      return [];
    }
    throw new Error(sql);
  } };
  const requests = [];
  const create = async (_tx, args) => { requests.push(args); return activityId; };
  return { input, requests, run: () => prepareFoxyActivity(tx, actor, resourceId, input, resources, create), activityId };
}

test('handoff uses the quiz in the saved resource to create only one private questionnaire draft', async () => {
  const f = fixture();
  const receipt = await f.run();
  assert.equal(receipt.activityId, f.activityId);
  assert.equal(f.requests[0].type, 'QUESTIONNAIRE');
  assert.deepEqual(f.requests[0].payload.questions, [{
    type: 'SINGLE_CHOICE', prompt: '¿Qué se separa en anafase?', points: '1', scoringRule: 'EXACT',
    options: [{ text: 'Cromátidas hermanas', correct: true }, { text: 'Membranas plasmáticas', correct: false }],
  }]);
  assert.equal(f.requests[0].payload.instructions, quiz.instructions);
  assert.deepEqual(await f.run(), receipt);
  assert.equal(f.requests.length, 1);
});

test('questionnaire handoff rejects a non-quiz resource before creating a draft', async () => {
  const f = fixture('Texto de otra actividad');
  await assert.rejects(f.run(), { code: 'INVALID_INPUT' });
  assert.deepEqual(f.requests, []);
});
