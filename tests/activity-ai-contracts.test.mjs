import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const domain = () => import('../src/core/domain/index.ts');

test('regeneration preserves its raw replay input and shares the start command schema', async () => {
  const { parseStartActivityGeneration, parseRegenerateActivityGeneration } = await domain();
  const command = start({ objective: '  Comparar casos  ' });
  for (const acknowledgePossibleCharge of [false, true]) {
    const wire = { ...command, acknowledgePossibleCharge };
    const parsed = parseRegenerateActivityGeneration(wire);
    assert.equal(parsed.raw, wire);
    assert.deepEqual(parsed.body, parseStartActivityGeneration(command));
    assert.equal(parsed.acknowledgePossibleCharge, acknowledgePossibleCharge);
  }
  for (const input of [command, { ...command, acknowledgePossibleCharge: 'false' },
    { ...command, acknowledgePossibleCharge: false, ownerId: randomUUID() }]) {
    assert.throws(() => parseRegenerateActivityGeneration(input), { code: 'INVALID_INPUT' });
  }
});
export const sourceId = `plan:${randomUUID()}`;
export const start = (extra = {}) => ({ revision: '3', requestId: randomUUID(), type: 'ASSIGNMENT', unitId: randomUUID(),
  topicIds: [randomUUID(), randomUUID()], sourceIds: [sourceId], objective: 'Relacionar luz y exposición', groupLevel: 'Segundo año',
  difficulty: 'INTERMEDIATE', durationMinutes: 40, context: '', counts: { assignment: 2, development: 0, singleChoice: 0, multipleChoice: 0 },
  acknowledgedWarnings: [], ...extra });
export const proposal = (extra = {}) => ({ schemaVersion: 'activity-proposal-v1', type: 'ASSIGNMENT', title: 'Luz en contexto',
  objective: 'Relacionar luz y exposición', instructions: 'Resolver usando el material seleccionado.', assignmentPrompts: ['Comparar casos.', 'Explicar la relación.'],
  questions: [], evidence: [0, 1].map(index => ({ item: 'assignment', index, references: [{ sourceId, page: 1 }] })), warnings: [], ...extra });
export const constraints = (extra = {}) => ({ type: 'ASSIGNMENT', counts: start().counts, sourceIds: [sourceId], context: '', pdfPageCounts: { [sourceId]: 3 }, ...extra });
export const question = (type = 'SINGLE_CHOICE') => ({ type, prompt: 'Elegir la afirmación correcta', points: '2.50',
  scoringRule: type === 'DEVELOPMENT' ? null : 'EXACT', options: type === 'DEVELOPMENT' ? [] : [
    { text: 'A', correct: true }, { text: 'B', correct: type === 'MULTIPLE_CHOICE' }, { text: 'C', correct: false }] });

test('A1 strict generation request retains explicit inputs and never accepts authority or coercion', async () => {
  const { parseStartActivityGeneration: parse } = await domain();
  assert.equal(typeof parse, 'function');
  const valid = start(); assert.deepEqual(parse(valid), valid);
  for (const bad of [null, [], 'json', { ...valid, actorId: randomUUID() }, { ...valid, revision: 3 },
    { ...valid, revision: '1\n' }, { ...valid, requestId: 'request' }, { ...valid, unitId: null },
    { ...valid, topicIds: [] }, { ...valid, topicIds: [valid.topicIds[0], valid.topicIds[0]] },
    { ...valid, sourceIds: [sourceId, sourceId] }, { ...valid, sourceIds: [`file:${randomUUID()}`] },
    { ...valid, sourceIds: ['plan:invalid'] }, { ...valid, objective: ' ' }, { ...valid, objective: 'x'.repeat(1001) },
    { ...valid, groupLevel: 'x'.repeat(201) }, { ...valid, context: 'x'.repeat(5001) },
    { ...valid, difficulty: 'easy' }, { ...valid, durationMinutes: '40' }, { ...valid, durationMinutes: 4 },
    { ...valid, durationMinutes: 241 }, { ...valid, durationMinutes: 5.5 },
    { ...valid, counts: { ...valid.counts, assignment: 0 } }, { ...valid, counts: { ...valid.counts, assignment: 21 } },
    { ...valid, counts: { ...valid.counts, singleChoice: 1 } }, { ...valid, counts: { ...valid.counts, assignment: '2' } },
    { ...valid, counts: { ...valid.counts, extra: 0 } }, { ...valid, acknowledgedWarnings: ['UNKNOWN'] },
    { ...valid, acknowledgePossibleCharge: true }]) assert.throws(() => parse(bad), { code: 'INVALID_INPUT', message: 'INVALID_INPUT' });
  for (const key of Object.keys(valid)) { const bad = { ...valid }; delete bad[key]; assert.throws(() => parse(bad), { code: 'INVALID_INPUT' }, key); }
});

test('A1 exact limits, quiz combinations, Unicode and context-only grounding', async () => {
  const { parseStartActivityGeneration: parse } = await domain();
  for (const durationMinutes of [5, 240]) assert.equal(parse(start({ durationMinutes })).durationMinutes, durationMinutes);
  const topicIds = Array.from({ length: 100 }, () => randomUUID()), sourceIds = Array.from({ length: 6 }, () => `material:${randomUUID()}`);
  assert.equal(parse(start({ topicIds, sourceIds, objective: '🦊'.repeat(1000), groupLevel: '', context: 'x'.repeat(5000) })).topicIds.length, 100);
  assert.throws(() => parse(start({ topicIds: [...topicIds, randomUUID()] })), { code: 'INVALID_INPUT' });
  assert.throws(() => parse(start({ sourceIds: [...sourceIds, `material:${randomUUID()}`] })), { code: 'INVALID_INPUT' });
  assert.throws(() => parse(start({ sourceIds: [], context: ' ' })), { code: 'INVALID_INPUT' });
  assert.throws(() => parse(start({ objective: 'A\u0000B' })), { code: 'INVALID_INPUT' });
  assert.equal(parse(start({ sourceIds: [], context: 'El concepto enseñado es exposición: la luz acumulada durante un intervalo.' })).sourceIds.length, 0);
  for (const type of ['QUESTIONNAIRE', 'EVALUATION']) {
    const counts = { assignment: 0, development: 10, singleChoice: 10, multipleChoice: 10 };
    assert.deepEqual(parse(start({ type, counts })).counts, counts);
    for (const bad of [{ ...counts, development: 11 }, { assignment: 0, development: 0, singleChoice: 0, multipleChoice: 0 }, { ...counts, assignment: 1 }])
      assert.throws(() => parse(start({ type, counts: bad })), { code: 'INVALID_INPUT' });
  }
});

test('A1 proposals require exact requested counts, type, schema and complete bounded evidence', async () => {
  const { parseActivityProposal: parse, activityGenerationSchemaVersion } = await domain();
  assert.equal(activityGenerationSchemaVersion, 'activity-proposal-v1');
  assert.deepEqual(parse(proposal(), constraints()), proposal());
  const valid = proposal();
  const bad = [null, [], { ...valid, ownerId: randomUUID() }, { ...valid, schemaVersion: 'v2' },
    { ...valid, type: 'EVALUATION' }, { ...valid, assignmentPrompts: ['Only one'] },
    { ...valid, questions: [question()] }, { ...valid, evidence: [] }, { ...valid, evidence: [valid.evidence[0]] },
    { ...valid, evidence: [valid.evidence[0], valid.evidence[0]] },
    { ...valid, evidence: [{ ...valid.evidence[0], index: 2 }, valid.evidence[1]] },
    { ...valid, evidence: [{ ...valid.evidence[0], references: [] }, valid.evidence[1]] },
    { ...valid, warnings: ['UNKNOWN'] }, { ...valid, title: 'x'.repeat(201) }, { ...valid, objective: '' },
    { ...valid, instructions: 'x'.repeat(5001) }, { ...valid, assignmentPrompts: ['x'.repeat(5000), 'x'.repeat(5000)] }];
  for (const source of [`material:${randomUUID()}`, 'teacher-context']) bad.push({ ...valid, evidence: valid.evidence.map(x => ({ ...x, references: [{ sourceId: source, page: null }] })) });
  for (const page of [0, 4, 1.5, null, '1']) bad.push({ ...valid, evidence: valid.evidence.map(x => ({ ...x, references: [{ sourceId, page }] })) });
  for (const value of bad) assert.throws(() => parse(value, constraints()), { code: 'INVALID_INPUT' });
  const contextProposal = proposal({ evidence: valid.evidence.map(x => ({ ...x, references: [{ sourceId: 'teacher-context', page: null }] })) });
  assert.deepEqual(parse(contextProposal, constraints({ sourceIds: [], context: 'Contenido docente sustantivo.', pdfPageCounts: {} })), contextProposal);
});

test('A1 private structured selection keys and decimal points obey existing authoring semantics', async () => {
  const { parseActivityProposal: parse } = await domain();
  const questions = [question('DEVELOPMENT'), question(), question('MULTIPLE_CHOICE')];
  const quiz = proposal({ type: 'QUESTIONNAIRE', assignmentPrompts: [], questions,
    evidence: questions.map((_, index) => ({ item: 'question', index, references: [{ sourceId, page: 2 }] })) });
  const limits = constraints({ type: 'QUESTIONNAIRE', counts: { assignment: 0, development: 1, singleChoice: 1, multipleChoice: 1 } });
  assert.deepEqual(parse(quiz, limits).questions, questions);
  for (const q of [{ ...questions[0], points: '0' }, { ...questions[0], points: '1.001' },
    { ...questions[0], scoringRule: 'EXACT' }, { ...questions[1], options: questions[1].options.map(o => ({ ...o, correct: false })) },
    { ...questions[1], options: questions[1].options.map(o => ({ ...o, correct: true })) }, { ...questions[2], options: questions[1].options }]) {
    const changed = [...questions]; changed[q.type === 'DEVELOPMENT' ? 0 : q.type === 'SINGLE_CHOICE' ? 1 : 2] = q;
    assert.throws(() => parse({ ...quiz, questions: changed }, limits), { code: 'INVALID_INPUT' });
  }
});

test('A1 reviewed apply accepts only revision/idempotency/proposal and no publication authority', async () => {
  const { parseApplyActivityGeneration: parse } = await domain();
  const valid = { revision: '4', requestId: randomUUID(), proposal: proposal() };
  assert.deepEqual(parse(valid), valid);
  for (const value of [{ ...valid, publish: true }, { ...valid, activityId: randomUUID() }, { ...valid, revision: 4 },
    { ...valid, requestId: '' }, { ...valid, proposal: null }]) assert.throws(() => parse(value), { code: 'INVALID_INPUT' });
});

test('A1 generation bounds question size, options, points and reference uniqueness without weakening manual authoring', async () => {
  const { parseActivityProposal: parse } = await domain();
  const q = question(), limits = constraints({ type: 'EVALUATION', counts: { assignment: 0, development: 0, singleChoice: 1, multipleChoice: 0 } });
  const base = proposal({ type: 'EVALUATION', assignmentPrompts: [], questions: [q], evidence: [{ item: 'question', index: 0, references: [{ sourceId, page: 1 }] }] });
  assert.equal(parse({ ...base, questions: [{ ...q, points: '100', prompt: 'x'.repeat(2000), options: q.options.map(o => ({ ...o, text: 'x'.repeat(500) })) }] }, limits).questions[0].points, '100');
  for (const changed of [{ ...q, points: '100.01' }, { ...q, prompt: 'x'.repeat(2001) },
    { ...q, options: [...q.options, ...Array.from({ length: 4 }, () => ({ text: 'extra', correct: false }))] },
    { ...q, options: [{ ...q.options[0], text: 'x'.repeat(501) }, ...q.options.slice(1)] }])
    assert.throws(() => parse({ ...base, questions: [changed] }, limits), { code: 'INVALID_INPUT' });
  assert.throws(() => parse({ ...base, evidence: [{ ...base.evidence[0], references: [{ sourceId, page: 1 }, { sourceId, page: 1 }] }] }, limits), { code: 'INVALID_INPUT' });
  const docx = `material:${randomUUID()}`, docxProposal = proposal({ evidence: proposal().evidence.map(x => ({ ...x, references: [{ sourceId: docx, page: null }] })), warnings: ['DOCX_IMAGES_OMITTED'] });
  assert.deepEqual(parse(docxProposal, constraints({ sourceIds: [docx], pdfPageCounts: {} })), docxProposal);
  assert.throws(() => parse({ ...docxProposal, evidence: docxProposal.evidence.map(x => ({ ...x, references: [{ sourceId: docx, page: 1 }] })) }, constraints({ sourceIds: [docx], pdfPageCounts: {} })), { code: 'INVALID_INPUT' });
});
