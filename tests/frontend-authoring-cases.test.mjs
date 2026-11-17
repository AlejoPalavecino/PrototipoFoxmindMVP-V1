import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

const apiPath = 'apps/web/src/features/activity-authoring/api.ts';

test('authoring operations preserve revision, payload, routes and abort signal', async () => {
  const { createActivityAuthoringApi } = loadTsModule(apiPath);
  const calls = [];
  const response = { revision: 'r2' };
  const transport = { call: async (...args) => { calls.push(args); return response; } };
  const api = createActivityAuthoringApi(transport, 'room');
  const signal = new AbortController().signal;
  const payload = { title: 'Draft', unitIds: [], topicIds: ['topic'] };
  const deadline = { local: '2026-11-16T15:00', offsetMinutes: -180 };
  assert.equal(await api.createDraft('r1', 'ASSIGNMENT', signal), response);
  await api.saveDraft('r2', 'activity', payload, signal);
  await api.updateMetadata('r3', 'activity', { title: 'New title', unitIds: [], topicIds: ['topic'] }, signal);
  await api.publish('r4', 'activity', signal);
  await api.updateDeadline('r5', 'activity', deadline, true, signal);
  await api.resolveDeadline(deadline.local, signal);
  assert.deepEqual(calls, [
    ['/room/activities', 'POST', { revision: 'r1', operation: { action: 'create', type: 'ASSIGNMENT' } }, signal],
    ['/room/activities', 'POST', { revision: 'r2', operation: { action: 'save', id: 'activity', payload } }, signal],
    ['/room/activities', 'POST', { revision: 'r3', operation: { action: 'metadata', id: 'activity', title: 'New title', unitIds: [], topicIds: ['topic'] } }, signal],
    ['/room/activities', 'POST', { revision: 'r4', operation: { action: 'publish', id: 'activity' } }, signal],
    ['/room/activities', 'POST', { revision: 'r5', operation: { action: 'deadline', id: 'activity', deadline, allowLate: true } }, signal],
    ['/room/activities/deadline', 'POST', { local: deadline.local }, signal],
  ]);
});

test('generation operations preserve explicit generation, charge acknowledgement and apply identity', async () => {
  const { createActivityAuthoringApi } = loadTsModule(apiPath);
  const calls = [];
  const api = createActivityAuthoringApi({ call: async (...args) => calls.push(args) }, 'room').generation;
  const signal = new AbortController().signal;
  const input = { revision: 'r1', requestId: 'request', teacherBrief: 'Idea' };
  const proposal = { title: 'Proposal' };
  assert.equal(calls.length, 0);
  await api.sources(signal);
  await api.list(signal);
  await api.get('job', signal);
  await api.start(input, signal);
  await api.regenerate('job', input, true, signal);
  await api.apply('job', 'r2', 'apply-request', proposal, signal);
  assert.deepEqual(calls, [
    ['/room/activity-generations/sources', 'GET', undefined, signal],
    ['/room/activity-generations', 'GET', undefined, signal],
    ['/room/activity-generations/job', 'GET', undefined, signal],
    ['/room/activity-generations', 'POST', input, signal],
    ['/room/activity-generations/job/regenerate', 'POST', { ...input, acknowledgePossibleCharge: true }, signal],
    ['/room/activity-generations/job/apply', 'POST', { revision: 'r2', requestId: 'apply-request', proposal }, signal],
  ]);
});

test('authoring adapter propagates transport failures without disguising conflicts or aborts', async () => {
  const { createActivityAuthoringApi } = loadTsModule(apiPath);
  for (const failure of [Object.assign(new Error('Conflict'), { code: 'CONFLICT' }), new DOMException('Cancelled', 'AbortError')]) {
    const api = createActivityAuthoringApi({ call: async () => { throw failure; } }, 'room');
    await assert.rejects(api.publish('r1', 'activity'), error => error === failure);
  }
});

test('persistence creates lazily and chains only confirmed CAS revisions through save and publication', async () => {
  const { createAuthoringPersistence } = loadTsModule('apps/web/src/features/activity-authoring/publication/authoring-persistence.ts');
  const calls = [];
  let failSave = true;
  const operations = {
    createDraft: async (...args) => { calls.push(['create', ...args]); return { id: 'created', revision: 'r2' }; },
    saveDraft: async (...args) => { calls.push(['save', ...args]); if (failSave) throw new Error('CONFLICT'); return { revision: 'r3' }; },
    publish: async (...args) => { calls.push(['publish', ...args]); return { revision: 'r4' }; },
  };
  const persistence = createAuthoringPersistence(operations, { id: '', revision: 'r1' });
  assert.equal(calls.length, 0);
  await assert.rejects(persistence.save('ASSIGNMENT', { title: 'Draft' }), /CONFLICT/);
  assert.deepEqual(persistence.snapshot(), { id: 'created', revision: 'r2' });
  failSave = false;
  await persistence.save('ASSIGNMENT', { title: 'Draft' });
  await persistence.publish('ASSIGNMENT');
  assert.deepEqual(calls.map(([action, revision, id]) => [action, revision, id]), [
    ['create', 'r1', 'ASSIGNMENT'], ['save', 'r2', 'created'], ['save', 'r2', 'created'], ['publish', 'r3', 'created'],
  ]);
  assert.deepEqual(persistence.snapshot(), { id: 'created', revision: 'r4' });
});

test('deadline selection rejects nonexistent and unresolved repeated times and preserves explicit offset', () => {
  const { selectAuthoringDeadline } = loadTsModule('apps/web/src/features/activity-authoring/publication/authoring-deadline.ts');
  const resolution = { local: '2026-11-01T01:30', reason: 'AMBIGUOUS', choices: [{ offsetMinutes: -240 }, { offsetMinutes: -300 }] };
  assert.throws(() => selectAuthoringDeadline({ ...resolution, reason: 'NONEXISTENT' }, null), /no existe/);
  assert.throws(() => selectAuthoringDeadline(resolution, null), /dos veces/);
  assert.throws(() => selectAuthoringDeadline(resolution, 180), /dos veces/);
  assert.deepEqual(selectAuthoringDeadline(resolution, -300), { local: resolution.local, offsetMinutes: -300 });
  assert.deepEqual(selectAuthoringDeadline({ ...resolution, reason: null }, null), { local: resolution.local });
});

test('draft payload keeps files and rubric while stripping question identity and private defaults consistently', () => {
  const { buildActivityDraftPayload, activityReviewProblem } = loadTsModule('apps/web/src/features/activity-authoring/drafting/draft-rules.ts');
  const draft = {
    title: 'Title', objective: 'Objective', teacherComment: '', scope: { unitIds: [], topicIds: ['topic'] },
    instructions: 'Instructions', type: 'QUESTIONNAIRE', attachmentRequired: true, aiGradingRubric: 'Private',
    evaluationRubric: [{ name: 'Evidence', description: 'Clear', weight: 100 }],
    files: [{ id: 'file' }], materialIds: ['material'], allowLate: true,
    questions: [{ id: 'question', type: 'SINGLE_CHOICE', prompt: 'Question', points: '2', options: [{ id: 'option', text: 'Option' }] }],
  };
  const payload = buildActivityDraftPayload(draft, null);
  assert.equal(payload.teacherComment, null);
  assert.equal(payload.attachmentRequired, false);
  assert.deepEqual(payload.instructionFileIds, ['file']);
  assert.deepEqual(payload.evaluationRubric, draft.evaluationRubric);
  assert.deepEqual(payload.questions, [{ type: 'SINGLE_CHOICE', prompt: 'Question', points: '2', scoringRule: null, options: [{ text: 'Option', correct: false }] }]);
  assert.deepEqual(buildActivityDraftPayload({ ...draft, type: 'ASSIGNMENT' }, null).questions, []);
  assert.equal(activityReviewProblem(draft).tab, 'questions');
  assert.equal(activityReviewProblem({ ...draft, evaluationRubric: [] }).tab, 'rubric');
  assert.equal(activityReviewProblem({ ...draft, objective: '' }).tab, 'instructions');
});

test('generation request identities survive retry but change with revision, intent or proposal', () => {
  const { createGenerationRequests } = loadTsModule('apps/web/src/features/activity-authoring/generation/generation-requests.ts');
  let sequence = 0;
  const requests = createGenerationRequests(() => `request-${++sequence}`);
  const value = { type: 'QUESTIONNAIRE', counts: { development: 1, singleChoice: 1, multipleChoice: 0 } };
  const first = requests.generation(value, 'r1');
  assert.deepEqual(requests.generation(value, 'r1'), first);
  assert.notEqual(requests.generation(value, 'r2').requestId, first.requestId);
  assert.notEqual(requests.generation(value, 'r1', 'predecessor').requestId, first.requestId);
  const proposal = { title: 'One' };
  const apply = requests.application('job', 'r1', proposal);
  assert.equal(requests.application('job', 'r1', proposal), apply);
  assert.notEqual(requests.application('job', 'r1', { title: 'Two' }), apply);
  assert.throws(() => requests.generation({ ...value, counts: { development: 20, singleChoice: 20, multipleChoice: 0 } }, 'r1'), /entre 1 y 30/);
  requests.clear();
  assert.notEqual(requests.generation(value, 'r1').requestId, first.requestId);
});

const text = node => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : text(node?.props?.children ?? '');
const room = { id: 'room', name: 'Ciencias', role: 'teacher', archived: false, timezone: 'UTC', units: [{ id: 'unit', name: 'Unidad', topics: [{ id: 'topic', name: 'Tema' }] }] };
const activity = {
  id: 'draft', type: 'ASSIGNMENT', title: 'Actividad', objective: 'Objetivo', instructions: 'Resolver',
  status: 'DRAFT', topicIds: ['topic'], attachmentRequired: false, locked: false, deadlineAt: null,
  allowLate: false, questions: [], instructionFiles: [], materials: [],
  evaluationRubric: [{ name: 'Evidencia', description: 'Relaciona conceptos', weight: 100 }],
};

test('typed authoring UI saves without publishing and publishes only after explicit confirmation', async () => {
  const { ActivityAuthoring } = loadTsModule('apps/web/src/features/activity-authoring/drafting/ActivityAuthoring.tsx');
  const calls = [];
  const { createActivityAuthoringApi } = loadTsModule(apiPath);
  const api = createActivityAuthoringApi({ call: async (...args) => { calls.push(args); return { revision: `r${calls.length + 1}` }; } }, 'room');
  const saved = [];
  const view = hookView(ActivityAuthoring, { api, room, data: { activity, revision: 'r1' }, materials: [], initialReview: true, onSaved: async (...args) => saved.push(args), onClose() {} });
  const button = label => descendants(view.tree, node => node.type === 'button' && text(node).trim() === label)[0];
  try {
    await view.flush();
    descendants(view.tree, node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} });
    await view.flush();
    assert.deepEqual(calls.map(args => args[2].operation.action), ['save']);
    assert.deepEqual(saved, [[false, 'draft']]);
    button('Publicar actividad').props.onClick();
    await view.flush();
    assert.equal(calls.length, 1);
    button('Asignar al aula').props.onClick();
    await view.flush();
    assert.deepEqual(calls.map(args => args[2].operation.action), ['save', 'save', 'publish']);
    assert.deepEqual(calls.map(args => args[2].revision), ['r1', 'r2', 'r3']);
    assert.deepEqual(saved.at(-1), [true, 'draft']);
  } finally { view.close(); }
});

test('typed generation hook does not generate while loading sources and retry keeps request identity', async () => {
  const { useActivityGeneration } = loadTsModule('apps/web/src/features/activity-authoring/generation/use-activity-generation.ts');
  const React = await import('react');
  const inputs = [];
  const api = {
    sources: async () => ({ sources: [] }), list: async () => ({ jobs: [] }),
    start: async input => { inputs.push(input); if (inputs.length === 1) throw new Error('Unavailable'); return { id: 'job', state: 'READY' }; },
  };
  const Host = () => React.createElement('output', { state: useActivityGeneration(api, { ...room, revision: 'r1' }, async () => {}) });
  const view = hookView(Host, {});
  const state = () => view.tree.props.state;
  const value = { type: 'QUESTIONNAIRE', counts: { development: 1, singleChoice: 0, multipleChoice: 0 } };
  try {
    await view.flush();
    assert.equal(inputs.length, 0);
    assert.equal(await state().generate(value), false);
    await view.flush();
    assert.equal(await state().generate(value), true);
    await view.flush();
    assert.equal(inputs[0].requestId, inputs[1].requestId);
    assert.equal(state().view.id, 'job');
  } finally { view.close(); }
});

test('locked authoring sends metadata and deadline separately without rebuilding content', async () => {
  const { ActivityAuthoring } = loadTsModule('apps/web/src/features/activity-authoring/drafting/ActivityAuthoring.tsx');
  const { createActivityAuthoringApi } = loadTsModule(apiPath);
  const calls = [];
  const api = createActivityAuthoringApi({ call: async (...args) => { calls.push(args); return { revision: `r${calls.length + 1}` }; } }, 'room');
  const view = hookView(ActivityAuthoring, { api, room, data: { activity: { ...activity, locked: true }, revision: 'r1' }, materials: [], onSaved: async () => {}, onClose() {} });
  try {
    await view.flush();
    descendants(view.tree, node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} });
    await view.flush();
    descendants(view.tree, node => node.type === 'button' && text(node) === 'Guardar plazo y recepción')[0].props.onClick();
    await view.flush();
    assert.deepEqual(calls.map(args => args[2]), [
      { revision: 'r1', operation: { action: 'metadata', id: 'draft', title: activity.title, unitIds: [], topicIds: ['topic'] } },
      { revision: 'r2', operation: { action: 'deadline', id: 'draft', deadline: null, allowLate: false } },
    ]);
  } finally { view.close(); }
});
